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

    const plan = await step.run('generate', () => traced('generate', () => generateTripPlan(input, trip.lat)));
    const places = await step.run('look-up-places', () => traced('look-up-places', () => lookUpPlaces(trip, plan)));
    const photos = await step.run('look-up-photos', () => traced('look-up-photos', () => lookUpPhotos(trip, plan)));
    await step.run('save', () => traced('save', () => persistTrip(trip, plan, places, photos)));

    // One wide event per generation, with everything needed to filter by in Sentry.
    log.info('Trip generation completed', {
      trip_id: tripId,
      user_id: trip.userId,
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
