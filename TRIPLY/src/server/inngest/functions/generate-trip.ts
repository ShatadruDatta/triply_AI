import { generateTripPlan } from '@/server/ai/generate';
import { inngest } from '@/server/inngest/client';
import {
  failTrip,
  inputFromTrip,
  lookUpPhotos,
  lookUpPlaces,
  markGenerating,
  persistTrip,
} from '@/server/trips/generate';

type GenerateRequested = { tripId: string };

export const generateTrip = inngest.createFunction(
  {
    id: 'generate-trip',
    triggers: [{ event: 'trip/generate.requested' }],
    retries: 2,
    // Runs once every retry is used up: mark the trip failed and refund the quota.
    onFailure: async ({ event, error }) => {
      const { tripId } = event.data.event.data as GenerateRequested;
      const code = error.message.includes('_API_KEY') ? 'ai_not_configured' : 'generation_failed';
      console.error(`Trip ${tripId} failed: ${error.message}`);
      await failTrip(tripId, code);
    },
  },
  async ({ event, step }) => {
    const { tripId } = event.data as GenerateRequested;

    const trip = await step.run('start', () => markGenerating(tripId));
    const input = inputFromTrip(trip);

    const plan = await step.run('generate', () => generateTripPlan(input, trip.lat));
    const places = await step.run('look-up-places', () => lookUpPlaces(trip, plan));
    const photos = await step.run('look-up-photos', () => lookUpPhotos(trip, plan));
    await step.run('save', () => persistTrip(trip, plan, places, photos));

    return { tripId };
  },
);
