// Google Places API (New). Only coordinates, address and rating are used; photos are not
// stored because of the Places caching terms, images come from Unsplash instead.
export type PlaceMatch = {
  placeId: string;
  lat: number;
  lng: number;
  address: string | null;
  rating: number | null;
};

export const placesEnabled = () => !!process.env.GOOGLE_PLACES_API_KEY;

type SearchTextResponse = {
  places?: {
    id: string;
    location?: { latitude: number; longitude: number };
    formattedAddress?: string;
    rating?: number;
  }[];
};

export async function searchPlace(
  textQuery: string,
  bias?: { lat: number; lng: number },
): Promise<PlaceMatch | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.location,places.formattedAddress,places.rating',
      },
      body: JSON.stringify({
        textQuery,
        pageSize: 1,
        ...(bias
          ? {
              locationBias: {
                circle: {
                  center: { latitude: bias.lat, longitude: bias.lng },
                  radius: 30_000,
                },
              },
            }
          : {}),
      }),
    });
    if (!response.ok) {
      console.warn(`Places search failed (${response.status}) for "${textQuery}"`);
      return null;
    }
    const place = ((await response.json()) as SearchTextResponse).places?.[0];
    if (!place?.location) return null;
    return {
      placeId: place.id,
      lat: place.location.latitude,
      lng: place.location.longitude,
      address: place.formattedAddress ?? null,
      rating: place.rating ?? null,
    };
  } catch (error) {
    console.warn('Places search error', error);
    return null;
  }
}

export type PlaceSuggestion = { placeId: string; name: string; description: string };

export async function autocompletePlaces(
  input: string,
  sessionToken: string,
): Promise<PlaceSuggestion[] | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
    body: JSON.stringify({ input, sessionToken, includedPrimaryTypes: ['(regions)'] }),
  });
  if (!response.ok) throw new Error(`Places autocomplete failed (${response.status})`);

  const data = (await response.json()) as {
    suggestions?: {
      placePrediction?: {
        placeId: string;
        text: { text: string };
        structuredFormat?: { mainText: { text: string }; secondaryText?: { text: string } };
      };
    }[];
  };
  return (data.suggestions ?? []).flatMap((s) =>
    s.placePrediction
      ? [
          {
            placeId: s.placePrediction.placeId,
            name: s.placePrediction.structuredFormat?.mainText.text ?? s.placePrediction.text.text,
            description: s.placePrediction.text.text,
          },
        ]
      : [],
  );
}

// Great-circle distance, used to reject Places matches that are nowhere near the destination.
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 12_742 * Math.asin(Math.sqrt(h));
}
