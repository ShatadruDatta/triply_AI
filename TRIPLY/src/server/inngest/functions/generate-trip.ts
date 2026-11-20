import { experiment, group } from 'inngest';

import { generateTripPlan } from '@/server/ai/generate';
import { inngest } from '@/server/inngest/client';
import { log, reportError, runInTrace, type TraceCarrier } from '@/server/sentry';
import {
  failTrip,
  inputFromTrip,
  lookUpPhotos,
  lookUpPlaces,
  markGenerating,
  persistTrip,
} from '@/server/trips/generate';

type GenerateRequested = { tripId: string; _sentry?: TraceCarrier };

// Experiment: which AI provider writes the trip plan. "openai" is the current behaviour
// (OpenAI, falling back to Gemini) and stays the default. Set TRIP_GEMINI_SHARE (0-100) to send
// that share of trips to Gemini first. Without it, or without a GEMINI_API_KEY, every run
// uses "openai", so nothing changes until the experiment is switched on.
function selectProvider() {
  const share = Math.min(100, Math.max(0, Number(process.env.TRIP_GEMINI_SHARE) || 0));
  if (!process.env.GEMINI_API_KEY || share === 0) return experiment.fixed('openai');
  return experiment.weighted({ openai: 100 - share, gemini: share });
}

export const generateTrip = inngest.createFunction(
  {
    id: 'generate-trip',
    triggers: [{ event: 'trip/generate.requested' }],
    retries: 2,
    // Runs once every retry is used up: mark the trip failed and refund the quota.
    onFailure: async ({ event, error }) => {
      const { tripId } = event.data.event.data as GenerateRequested;
      const code = error.message.includes('_API_KEY') ? 'ai_not_configured' : 'generation_failed';
      await reportError(error, 'Trip generation failed', { trip_id: tripId, error_code: code });
      await failTrip(tripId, code);
    },
  },
  async ({ event, step }) => {
    const { tripId, _sentry } = event.data as GenerateRequested;
    // Each step is its own span, joined to the trace of the request that queued the job.
    const traced = <T,>(step: string, fn: () => Promise<T>) =>
      runInTrace(_sentry, `generate-trip.${step}`, { trip_id: tripId }, fn);

    const startedAt = Date.now();
    const trip = await step.run('start', () => traced('start', () => markGenerating(tripId)));
    const input = inputFromTrip(trip);

    // The variant is chosen once per run and memoized, so retries use the same provider.
    // Each variant runs its own step; the control keeps the original "generate" step id.
    const {
      result: plan,
      variant: aiProvider,
      experimentRef,
    } = await group.experiment('trip-ai-provider', {
      variants: {
        openai: () =>
          step.run('generate', () =>
            traced('generate', () => generateTripPlan(input, trip.lat, 'openai')),
          ),
        gemini: () =>
          step.run('generate-gemini', () =>
            traced('generate-gemini', () => generateTripPlan(input, trip.lat, 'gemini')),
          ),
      },
      select: selectProvider(),
    });
    const places = await step.run('look-up-places', () => traced('look-up-places', () => lookUpPlaces(trip, plan)));
    const photos = await step.run('look-up-photos', () => traced('look-up-photos', () => lookUpPhotos(trip, plan)));
    await step.run('save', () => traced('save', () => persistTrip(trip, plan, places, photos)));

    // Scores this run against its variant so the two can be compared in Inngest. Outside any
    // step (as the docs require); a scoring problem must never fail a finished trip.
    try {
      await inngest.score.experiment({
        experiment: experimentRef,
        name: 'generation_seconds',
        value: (Date.now() - startedAt) / 1000,
      });
      await inngest.score.experiment({
        experiment: experimentRef,
        name: 'places_matched',
        value: Object.values(places.activities).filter(Boolean).length,
      });
    } catch (error) {
      log.warn('Experiment scoring failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // One wide event per generation, with everything needed to filter by in Sentry.
    log.info('Trip generation completed', {
      trip_id: tripId,
      user_id: trip.userId,
      ai_provider_variant: aiProvider,
      day_count: plan.days.length,
      travelers: trip.travelers,
      budget_tier: trip.budgetTier,
      places_matched: Object.values(places.activities).filter(Boolean).length,
      places_enabled: places.enabled,
      has_hero_photo: !!photos.hero,
      duration_ms: Date.now() - startedAt,
    });
    return { tripId };
  },
);
