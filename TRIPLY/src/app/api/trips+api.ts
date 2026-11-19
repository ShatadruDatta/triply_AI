import { randomUUID } from 'node:crypto';

import { and, desc, eq, isNull } from 'drizzle-orm';

import { tripInputSchema } from '@/features/trips/schema';
import { requireUser } from '@/server/auth';
import { db } from '@/server/db/client';
import { trips, usageLedger } from '@/server/db/schema';
import { HttpError, json, route } from '@/server/http';
import { inngest } from '@/server/inngest/client';
import {
  GENERATE_COST_UNITS,
  QUOTA_LIMIT_UNITS,
  hasGenerationInFlight,
  unitsUsedThisMonth,
} from '@/server/quota';
import { failStaleGenerations, failTrip } from '@/server/trips/generate';

export const GET = route(async (request: Request) => {
  const user = await requireUser(request);
  await failStaleGenerations(user.id);
  const rows = await db
    .select({
      id: trips.id,
      status: trips.status,
      destinationName: trips.destinationName,
      startDate: trips.startDate,
      endDate: trips.endDate,
      travelers: trips.travelers,
      heroImageUrl: trips.heroImageUrl,
      heroImageCredit: trips.heroImageCredit,
      createdAt: trips.createdAt,
    })
    .from(trips)
    .where(and(eq(trips.userId, user.id), isNull(trips.deletedAt)))
    .orderBy(desc(trips.createdAt));
  return json({ trips: rows });
});

export const POST = route(async (request: Request) => {
  const user = await requireUser(request);

  const parsed = tripInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new HttpError(400, 'invalid_input', parsed.error.issues[0]?.message, {
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  const input = parsed.data;

  // One day of slack so a traveller ahead of UTC can still start "today".
  const earliest = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (input.startDate < earliest) {
    throw new HttpError(400, 'start_in_past', 'Your trip cannot start in the past.');
  }

  await failStaleGenerations(user.id);
  if (await hasGenerationInFlight(user.id)) {
    throw new HttpError(409, 'generation_in_progress', 'Another trip is still being generated.');
  }
  const used = await unitsUsedThisMonth(user.id);
  if (used + GENERATE_COST_UNITS > QUOTA_LIMIT_UNITS) {
    throw new HttpError(402, 'quota_exceeded', 'Monthly trip quota used up.', {
      used,
      limit: QUOTA_LIMIT_UNITS,
    });
  }

  const tripId = randomUUID();
  // The trip and its quota charge are written together or not at all.
  await db.batch([
    db.insert(trips).values({
      id: tripId,
      userId: user.id,
      status: 'pending',
      destinationName: input.destination,
      destinationPlaceId: input.destinationPlaceId ?? null,
      startDate: input.startDate,
      endDate: input.endDate,
      travelers: input.travelers,
      budgetTier: input.budgetTier,
      budgetAmount: input.budgetAmount ?? null,
      currency: input.currency,
      interests: input.interests,
      pace: input.pace,
      notes: input.notes || null,
    }),
    db.insert(usageLedger).values({
      userId: user.id,
      tripId,
      kind: 'generate',
      units: GENERATE_COST_UNITS,
      idempotencyKey: `generate:${tripId}`,
    }),
  ]);

  try {
    await inngest.send({ id: `trip-generate-${tripId}`, name: 'trip/generate.requested', data: { tripId } });
  } catch (error) {
    console.error('Could not queue trip generation', error);
    await failTrip(tripId, 'dispatch_failed');
    throw new HttpError(
      502,
      'queue_unavailable',
      'Could not start generation. Is the Inngest Dev Server running?',
    );
  }

  return json({ id: tripId }, 201);
});
