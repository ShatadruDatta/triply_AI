import { z } from 'zod';

export const TIME_SLOTS = ['morning', 'afternoon', 'evening'] as const;
export const ACTIVITY_CATEGORIES = [
  'sightseeing',
  'food',
  'culture',
  'nature',
  'nightlife',
  'shopping',
  'adventure',
  'relaxation',
  'transport',
] as const;
export const BUDGET_CATEGORIES = ['stay', 'food', 'activities', 'transport', 'other'] as const;

export const activitySchema = z.object({
  time_slot: z.enum(TIME_SLOTS),
  name: z.string().min(2).max(120).describe('Name of the real place or experience'),
  description: z.string().min(10).max(320).describe('One or two sentences on what to do and why'),
  category: z.enum(ACTIVITY_CATEGORIES),
  est_cost: z
    .number()
    .min(0)
    .describe('Estimated cost per person in the trip currency, 0 if free'),
  search_query: z
    .string()
    .min(2)
    .max(160)
    .describe('Text to find this exact place on a map, e.g. "Senso-ji Temple Tokyo"'),
});

export const daySchema = z.object({
  day_number: z.number().int().min(1).max(14),
  title: z.string().min(2).max(80).describe('Short theme for the day, e.g. "Shibuya & Harajuku"'),
  summary: z.string().min(10).max(260),
  activities: z.array(activitySchema).min(3).max(6),
});

export const hotelSchema = z.object({
  name: z.string().min(2).max(120),
  area: z.string().max(80).describe('Neighbourhood the hotel is in'),
  price_range: z.enum(['$', '$$', '$$$', '$$$$']),
  rating: z.number().min(0).max(5).describe('Typical guest rating out of 5'),
  search_query: z.string().min(2).max(160),
});

export const budgetSchema = z.object({
  total: z.number().min(0).describe('Estimated total for all travelers, whole trip'),
  per_day: z.number().min(0).describe('Estimated spend per day for all travelers'),
  items: z
    .array(z.object({ category: z.enum(BUDGET_CATEGORIES), amount: z.number().min(0) }))
    .min(3)
    .max(5),
});

export const tripPlanSchema = z.object({
  summary: z.string().min(10).max(400).describe('Two-sentence overview of the trip'),
  days: z.array(daySchema).min(1).max(14),
  hotels: z.array(hotelSchema).min(2).max(4),
  budget: budgetSchema,
});

export type TripPlan = z.infer<typeof tripPlanSchema>;

// Gemini accepts an OpenAPI-style schema, so drop the JSON Schema meta key.
export function tripPlanJsonSchema() {
  const { $schema: _ignored, ...schema } = z.toJSONSchema(tripPlanSchema, {
    target: 'openapi-3.0',
  }) as Record<string, unknown>;
  return schema;
}
