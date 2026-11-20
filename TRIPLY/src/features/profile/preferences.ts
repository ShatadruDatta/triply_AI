import { z } from 'zod';

export const TRAVEL_STYLES = ['Adventure', 'Relaxation', 'Culture', 'Nature', 'Luxury'] as const;
export const FOOD_PREFERENCES = ['Any', 'Vegetarian', 'Vegan', 'Non-Vegetarian', 'Jain'] as const;
export const TRAVEL_WITH = ['Solo', 'Couple', 'Family', 'Friends', 'Business'] as const;

export const travelStyleSchema = z.enum(TRAVEL_STYLES);
export const foodPreferenceSchema = z.enum(FOOD_PREFERENCES);
export const travelWithSchema = z.enum(TRAVEL_WITH);

// What the Edit Profile screen keeps in the user's Clerk `unsafeMetadata`. Anything missing or
// invalid falls back to its default, so a half-filled or older profile still loads.
export const profilePrefsSchema = z.object({
  phone: z.string().max(30).catch(''),
  homeCity: z.string().max(80).catch(''),
  travelStyle: travelStyleSchema.catch('Adventure'),
  foodPreference: foodPreferenceSchema.catch('Any'),
  travelWith: travelWithSchema.catch('Friends'),
  travelUpdates: z.boolean().catch(true),
});

export type ProfilePrefs = z.infer<typeof profilePrefsSchema>;

export function readPrefs(metadata: unknown): ProfilePrefs {
  return profilePrefsSchema.parse(typeof metadata === 'object' && metadata !== null ? metadata : {});
}
