import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { requireUser } from '@/server/auth';
import { db } from '@/server/db/client';
import { activities, hotels, tripDays, trips } from '@/server/db/schema';
import { HttpError, json, route } from '@/server/http';
import { deleteImageKitFile } from '@/server/imagekit';
import { failStaleGenerations } from '@/server/trips/generate';

export const GET = route(async (request: Request, params: Record<string, string>) => {
  const user = await requireUser(request);
  await failStaleGenerations(user.id);
  const id = z.uuid().safeParse(params.id);
  if (!id.success) throw new HttpError(404, 'not_found');

  const [trip] = await db
    .select()
    .from(trips)
    .where(and(eq(trips.id, id.data), eq(trips.userId, user.id), isNull(trips.deletedAt)))
    .limit(1);
  if (!trip) throw new HttpError(404, 'not_found');

  const days = await db
    .select()
    .from(tripDays)
    .where(eq(tripDays.tripId, trip.id))
    .orderBy(asc(tripDays.dayNumber));
  const dayActivities = days.length
    ? await db
        .select()
        .from(activities)
        .where(
          inArray(
            activities.tripDayId,
            days.map((d) => d.id),
          ),
        )
        .orderBy(asc(activities.position))
    : [];
  const tripHotels = await db.select().from(hotels).where(eq(hotels.tripId, trip.id));

  return json({
    trip: {
      id: trip.id,
      status: trip.status,
      destinationName: trip.destinationName,
      lat: trip.lat,
      lng: trip.lng,
      startDate: trip.startDate,
      endDate: trip.endDate,
      travelers: trip.travelers,
      budgetTier: trip.budgetTier,
      currency: trip.currency,
      interests: trip.interests,
      pace: trip.pace,
      summary: trip.summary,
      heroImageUrl: trip.heroImageUrl,
      heroImageCredit: trip.heroImageCredit,
      budgetBreakdown: trip.budgetBreakdown,
      errorCode: trip.errorCode,
      createdAt: trip.createdAt,
      days: days.map((day) => ({
        id: day.id,
        dayNumber: day.dayNumber,
        date: day.date,
        title: day.title,
        summary: day.summary,
        status: day.status,
        activities: dayActivities
          .filter((a) => a.tripDayId === day.id)
          .map(({ tripDayId: _tripDayId, ...activity }) => activity),
      })),
      hotels: tripHotels.map(({ tripId: _tripId, ...hotel }) => hotel),
    },
  });
});

// Permanently removes the trip; days, activities and hotels cascade. Usage ledger rows stay (their
// trip_id is set to null) so deleting a trip never gives back quota.
export const DELETE = route(async (request: Request, params: Record<string, string>) => {
  const user = await requireUser(request);
  await failStaleGenerations(user.id);
  const id = z.uuid().safeParse(params.id);
  if (!id.success) throw new HttpError(404, 'not_found');

  const [trip] = await db
    .select({ id: trips.id, status: trips.status, heroImageFileId: trips.heroImageFileId })
    .from(trips)
    .where(and(eq(trips.id, id.data), eq(trips.userId, user.id)))
    .limit(1);
  if (!trip) throw new HttpError(404, 'not_found');
  if (trip.status === 'pending' || trip.status === 'generating') {
    throw new HttpError(409, 'generation_in_progress', 'This trip is still being generated.');
  }

  await db.delete(trips).where(and(eq(trips.id, trip.id), eq(trips.userId, user.id)));
  await deleteImageKitFile(trip.heroImageFileId);
  return json({ ok: true });
});
