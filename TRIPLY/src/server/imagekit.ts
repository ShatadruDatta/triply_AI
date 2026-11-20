import ImageKit, { toFile } from '@imagekit/nodejs';

import { log, span } from '@/server/sentry';

// Custom trip covers are uploaded here. Delivery URLs are optimised on the client with
// ImageKit transformation params (see src/lib/imagekit.ts), so we only store the original.
export const imageKitEnabled = () =>
  !!process.env.IMAGEKIT_PRIVATE_KEY && !!process.env.IMAGEKIT_URL_ENDPOINT;

function client() {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) throw new Error('IMAGEKIT_PRIVATE_KEY is not set on the server.');
  return new ImageKit({ privateKey });
}

export async function uploadTripCover(params: {
  userId: string;
  tripId: string;
  bytes: Buffer;
  mimeType: string;
}): Promise<{ url: string; fileId: string }> {
  const extension = params.mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const response = await span('ImageKit upload', 'http.client', { service: 'imagekit' }, async () => client().files.upload({
    file: await toFile(params.bytes, `cover.${extension}`, { type: params.mimeType }),
    fileName: `cover-${params.tripId}.${extension}`,
    folder: `/triply/covers/${params.userId}`,
    useUniqueFileName: true,
    tags: ['trip-cover'],
  }));
  if (!response.url || !response.fileId) throw new Error('ImageKit returned an incomplete upload response.');
  return { url: response.url, fileId: response.fileId };
}

// Best effort: a leftover file in ImageKit must never block the user's own action.
export async function deleteImageKitFile(fileId: string | null | undefined) {
  if (!fileId || !imageKitEnabled()) return;
  try {
    await client().files.delete(fileId);
  } catch (error) {
    log.warn('Could not delete ImageKit file', {
      file_id: fileId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
