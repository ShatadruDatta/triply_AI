import { randomUUID } from 'node:crypto';

import { and, eq, inArray, lt } from 'drizzle-orm';

import type { TripInput } from '@/features/trips/schema';
import type { TripPlan } from '@/server/ai/schema';
import { db } from '@/server/db/client';
import {
  activities,
  hotels,
  tripDays,
  trips,
  usageLedger,
  type ImageCredit,
} from '@/server/db/schema';
import { searchPhoto, trackDownload, type StockPhoto } from '@/server/images';
import { distanceKm, placesEnabled, searchPlace, type PlaceMatch } from '@/server/places';

// A place further than this from the destination is treated as a wrong match.
const MAX_DISTANCE_KM = 80;
// Unsplash's demo tier allows 50 searches an hour, so a trip may use at most this many.
const MAX_ACTIVITY_PHOTOS = 8;
const MAX_HOTEL_PHOTOS = 2;

// What the pipeline needs from a trip row. Plain JSON values only, because Inngest step
// results are serialised (a Date would come back as a string).
export type TripSnapshot = {
  id: string;
  userId: string;
  destinationName: string;
  destinationPlaceId: string | null;
  lat: number | null;
  lng: number | null;
  startDate: string;
  endDate: string;
  travelers: number;
  budgetTier: string;
  budgetAmount: number | null;
  currency: string;
  interests: string[];
  pace: string;
  notes: string | null;
};

export function inputFromTrip(trip: TripSnapshot): TripInput {
  return {
    destination: trip.destinationName,
    destinationPlaceId: trip.destinationPlaceId ?? undefined,
    startDate: trip.startDate,
    endDate: trip.endDate,
    travelers: trip.travelers,
    budgetTier: trip.budgetTier as TripInput['budgetTier'],
    budgetAmount: trip.budgetAmount ?? undefined,
    currency: trip.currency,
    interests: trip.interests as TripInput['interests'],
    pace: trip.pace as TripInput['pace'],
    notes: trip.notes ?? undefined,
  };
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function markGenerating(tripId: string) {
  const [trip] = await db
    .update(trips)
    .set({ status: 'generating', updatedAt: new Date() })
    .where(eq(trips.id, tripId))
    .returning();
  if (!trip) throw new Error(`Trip ${tripId} not found`);
  const snapshot: TripSnapshot = {
    id: trip.id,
    userId: trip.userId,
    destinationName: trip.destinationName,
    destinationPlaceId: trip.destinationPlaceId,
    lat: trip.lat,
    lng: trip.lng,
    startDate: trip.startDate,
    endDate: trip.endDate,
    travelers: trip.travelers,
    budgetTier: trip.budgetTier,
    budgetAmount: trip.budgetAmount,
    currency: trip.currency,
    interests: trip.interests,
    pace: trip.pace,
    notes: trip.notes,
  };
  return snapshot;
}

async function inBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>) {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

export type PlaceLookups = {
  destination: PlaceMatch | null;
  // Keyed `${dayNumber}-${index}`.
  activities: Record<string, PlaceMatch | null>;
  hotels: Record<number, PlaceMatch | null>;
  enabled: boolean;
};

export async function lookUpPlaces(trip: TripSnapshot, plan: TripPlan): Promise<PlaceLookups> {
  if (!placesEnabled()) return { destination: null, activities: {}, hotels: {}, enabled: false };

  const destination = await searchPlace(trip.destinationName);
  const bias = destination ? { lat: destination.lat, lng: destination.lng } : undefined;
  const near = (match: PlaceMatch | null) =>
    match && (!bias || distanceKm(bias, match) <= MAX_DISTANCE_KM) ? match : null;

  const activityJobs = plan.days.flatMap((day) =>
    day.activities.map((activity, index) => ({ key: `${day.day_number}-${index}`, activity })),
  );
  const activityMatches = await inBatches(activityJobs, 5, async ({ activity }) =>
    near(await searchPlace(activity.search_query, bias)),
  );
  const hotelMatches = await inBatches(plan.hotels, 5, async (hotel) =>
    near(await searchPlace(hotel.search_query, bias)),
  );

  return {
    destination,
    activities: Object.fromEntries(activityJobs.map((job, i) => [job.key, activityMatches[i]])),
    hotels: Object.fromEntries(hotelMatches.map((match, i) => [i, match])),
    enabled: true,
  };
}

export type PhotoLookups = {
  hero: StockPhoto | null;
  activities: Record<string, StockPhoto | null>;
  hotels: Record<number, StockPhoto | null>;
};

export async function lookUpPhotos(trip: TripSnapshot, plan: TripPlan): Promise<PhotoLookups> {
  const hero = await searchPhoto(`${trip.destinationName} travel`);

  // One highlight photo per day (its first activity), capped to stay inside the rate limit.
  const dayJobs = plan.days
    .slice(0, MAX_ACTIVITY_PHOTOS)
    .map((day) => ({ key: `${day.day_number}-0`, query: day.activities[0].search_query }));
  const dayPhotos = await inBatches(dayJobs, 4, (job) => searchPhoto(job.query));

  const hotelJobs = plan.hotels.slice(0, MAX_HOTEL_PHOTOS).map((hotel, index) => ({
    index,
    query: `${hotel.name} ${hotel.area} hotel`,
  }));
  const hotelPhotos = await inBatches(hotelJobs, 2, (job) => searchPhoto(job.query));

  const result: PhotoLookups = {
    hero,
    activities: Object.fromEntries(dayJobs.map((job, i) => [job.key, dayPhotos[i]])),
    hotels: Object.fromEntries(hotelJobs.map((job, i) => [job.index, hotelPhotos[i]])),
  };

  const used = [hero, ...Object.values(result.activities), ...Object.values(result.hotels)];
  await Promise.all(used.flatMap((photo) => (photo ? [trackDownload(photo)] : [])));
  return result;
}

const creditOf = (photo: StockPhoto | null | undefined): ImageCredit | null => photo?.credit ?? null;

export async function persistTrip(
  trip: TripSnapshot,
  plan: TripPlan,
  places: PlaceLookups,
  photos: PhotoLookups,
) {
  const dayRows = plan.days.map((day) => ({
    id: randomUUID(),
    tripId: trip.id,
    dayNumber: day.day_number,
    date: addDays(trip.startDate, day.day_number - 1),
    title: day.title,
    summary: day.summary,
    status: 'ready' as const,
  }));

  const activityRows = plan.days.flatMap((day, dayIndex) => {
    const verified = day.activities.map((_, i) => !!places.activities[`${day.day_number}-${i}`]);
    const verifiedCount = verified.filter(Boolean).length;
    // Drop places we couldn't find on the map, unless that would leave the day too thin.
    const dropUnverified = places.enabled && verifiedCount >= 2;

    return day.activities.flatMap((activity, index) => {
      if (dropUnverified && !verified[index]) return [];
      const key = `${day.day_number}-${index}`;
      const match = places.activities[key];
      const photo = photos.activities[key];
      return [
        {
          tripDayId: dayRows[dayIndex].id,
          position: index,
          timeSlot: activity.time_slot,
          name: activity.name,
          description: activity.description,
          category: activity.category,
          estCost: Math.round(activity.est_cost),
          placeId: match?.placeId ?? null,
          lat: match?.lat ?? null,
          lng: match?.lng ?? null,
          address: match?.address ?? null,
          imageUrl: photo?.url ?? null,
          imageCredit: creditOf(photo),
        },
      ];
    });
  });

  const hotelRows = plan.hotels.map((hotel, index) => {
    const match = places.hotels[index];
    const photo = photos.hotels[index];
    return {
      tripId: trip.id,
      name: hotel.name,
      area: hotel.area,
      placeId: match?.placeId ?? null,
      lat: match?.lat ?? null,
      lng: match?.lng ?? null,
      address: match?.address ?? null,
      rating: match?.rating ?? hotel.rating,
      priceRange: hotel.price_range,
      imageUrl: photo?.url ?? null,
      imageCredit: creditOf(photo),
    };
  });

  // neon-http has no interactive transactions; batch() runs these atomically in one request.
  // Deleting first makes a retried persist step idempotent.
  await db.batch([
    db.delete(tripDays).where(eq(tripDays.tripId, trip.id)),
    db.delete(hotels).where(eq(hotels.tripId, trip.id)),
    db.insert(tripDays).values(dayRows),
    ...(activityRows.length ? [db.insert(activities).values(activityRows)] : []),
    db.insert(hotels).values(hotelRows),
    db
      .update(trips)
      .set({
        status: 'ready',
        summary: plan.summary,
        lat: places.destination?.lat ?? trip.lat,
        lng: places.destination?.lng ?? trip.lng,
        destinationPlaceId: places.destination?.placeId ?? trip.destinationPlaceId,
        heroImageUrl: photos.hero?.url ?? null,
        heroImageCredit: creditOf(photos.hero),
        budgetBreakdown: {
          total: Math.round(plan.budget.total),
          perDay: Math.round(plan.budget.per_day),
          currency: trip.currency,
          items: plan.budget.items.map((i) => ({ ...i, amount: Math.round(i.amount) })),
        },
        errorCode: null,
        updatedAt: new Date(),
      })
      .where(eq(trips.id, trip.id)),
  ]);
}

// Marks the trip failed and refunds its quota. Safe to call more than once.
export async function failTrip(tripId: string, errorCode: string) {
  const [trip] = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
  if (!trip) return;
  await db.batch([
    db
      .update(trips)
      .set({ status: 'failed', errorCode, updatedAt: new Date() })
      .where(eq(trips.id, tripId)),
    db
      .insert(usageLedger)
      .values({
        userId: trip.userId,
        tripId,
        kind: 'refund',
        units: -3,
        idempotencyKey: `refund:${tripId}`,
      })
      .onConflictDoNothing(),
  ]);
}

// A generation whose job never ran (dev server down, lost event) would otherwise sit on
// "generating" forever. Anything untouched for this long is failed and its credit refunded.
const STALE_GENERATION_MS = 10 * 60 * 1000;

export async function failStaleGenerations(userId: string) {
  const stale = await db
    .select({ id: trips.id })
    .from(trips)
    .where(
      and(
        eq(trips.userId, userId),
        inArray(trips.status, ['pending', 'generating']),
        lt(trips.updatedAt, new Date(Date.now() - STALE_GENERATION_MS)),
      ),
    );
  for (const { id } of stale) await failTrip(id, 'generation_timeout');
}
