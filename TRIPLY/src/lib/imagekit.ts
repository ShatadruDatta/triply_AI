// ImageKit delivery URLs: ask for the size the view needs, in the best format the device supports.
// Other hosts (e.g. Unsplash) are returned untouched.
export function optimizedImageUrl(url: string | null | undefined, width: number) {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (!parsed.hostname.endsWith('imagekit.io')) return url;
  parsed.searchParams.set('tr', `w-${Math.round(width)},q-75,f-auto`);
  return parsed.toString();
}
