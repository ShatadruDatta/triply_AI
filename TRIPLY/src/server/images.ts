import type { ImageCredit } from '@/server/db/schema';

// Unsplash API guidelines: hotlink the photo URLs, show the photographer credit with a link
// (carrying our utm params) and ping the download endpoint when a photo is used.
// The demo tier allows 50 requests per hour, so callers must keep their search count low.
const API = 'https://api.unsplash.com';
const UTM = 'utm_source=triply&utm_medium=referral';

export type StockPhoto = { url: string; credit: ImageCredit; downloadLocation: string };

type UnsplashPhoto = {
  links: { html: string; download_location: string };
  urls: { raw: string };
  user: { name: string; links: { html: string } };
};

const cache = new Map<string, StockPhoto | null>();

export const stockPhotosEnabled = () => !!process.env.UNSPLASH_ACCESS_KEY;

export async function searchPhoto(query: string): Promise<StockPhoto | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;
  if (cache.has(query)) return cache.get(query) ?? null;

  try {
    const url = `${API}/search/photos?${new URLSearchParams({
      query,
      per_page: '1',
      orientation: 'landscape',
      content_filter: 'high',
    })}`;
    const response = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}`, 'Accept-Version': 'v1' },
    });
    if (!response.ok) {
      console.warn(`Unsplash search failed (${response.status}) for "${query}"`);
      return null;
    }
    const { results } = (await response.json()) as { results: UnsplashPhoto[] };
    const photo = results[0];
    const result: StockPhoto | null = photo
      ? {
          url: `${photo.urls.raw}&w=900&q=75&fit=crop&auto=format`,
          credit: {
            name: photo.user.name,
            profileUrl: `${photo.user.links.html}?${UTM}`,
            photoUrl: `${photo.links.html}?${UTM}`,
          },
          downloadLocation: photo.links.download_location,
        }
      : null;
    cache.set(query, result);
    return result;
  } catch (error) {
    console.warn('Unsplash search error', error);
    return null;
  }
}

// Required by the Unsplash guidelines whenever a photo is actually shown to a user.
export async function trackDownload(photo: StockPhoto) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return;
  try {
    await fetch(photo.downloadLocation, { headers: { Authorization: `Client-ID ${accessKey}` } });
  } catch (error) {
    console.warn('Unsplash download tracking failed', error);
  }
}
