import { z } from 'zod';

import { requireUser } from '@/server/auth';
import { HttpError, json, route } from '@/server/http';
import { autocompletePlaces } from '@/server/places';

const querySchema = z.object({
  input: z.string().trim().min(2).max(120),
  sessionToken: z.string().min(8).max(80),
});

// Proxies Google Places Autocomplete so the API key never reaches the app.
export const GET = route(async (request: Request) => {
  await requireUser(request);
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = querySchema.safeParse(params);
  if (!query.success) throw new HttpError(400, 'invalid_input');

  const suggestions = await autocompletePlaces(query.data.input, query.data.sessionToken);
  if (!suggestions) {
    throw new HttpError(503, 'places_unavailable', 'GOOGLE_PLACES_API_KEY is not set on the server.');
  }
  return json({ suggestions });
});
