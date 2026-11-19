import { z } from 'zod';

import { strings } from '@/lib/strings';

export const BUDGET_TIERS = ['budget', 'moderate', 'luxury'] as const;
export const PACES = ['relaxed', 'balanced', 'packed'] as const;
export const INTERESTS = [
  'food',
  'culture',
  'nature',
  'nightlife',
  'shopping',
  'adventure',
] as const;

export const MAX_TRIP_DAYS = 14;
export const MAX_TRAVELERS = 20;

const errors = strings.planTrip.errors;

const dayMs = 86_400_000;

// Inclusive number of days between two YYYY-MM-DD strings.
export function tripLengthInDays(startDate: string, endDate: string) {
  return Math.round((Date.parse(endDate) - Date.parse(startDate)) / dayMs) + 1;
}

// Shared by the form (client) and POST /api/trips (server).
export const tripInputSchema = z
  .object({
    destination: z.string().trim().min(2, errors.destinationRequired).max(120),
    destinationPlaceId: z.string().max(300).optional(),
    startDate: z.iso.date(errors.datesRequired),
    endDate: z.iso.date(errors.datesRequired),
    travelers: z.number().int().min(1, errors.travelersRange).max(MAX_TRAVELERS, errors.travelersRange),
    budgetTier: z.enum(BUDGET_TIERS),
    budgetAmount: z.number().int().positive().max(100_000_000).optional(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    interests: z.array(z.enum(INTERESTS)).max(INTERESTS.length),
    pace: z.enum(PACES),
    notes: z.string().trim().max(500, errors.notesTooLong).optional(),
  })
  .refine((v) => v.endDate >= v.startDate, { path: ['endDate'], message: errors.datesRequired })
  .refine((v) => tripLengthInDays(v.startDate, v.endDate) <= MAX_TRIP_DAYS, {
    path: ['endDate'],
    message: errors.tripTooLong,
  });

export type TripInput = z.infer<typeof tripInputSchema>;
