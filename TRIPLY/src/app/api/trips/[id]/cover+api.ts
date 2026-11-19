import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { requireUser } from '@/server/auth';
import { db } from '@/server/db/client';
import { trips } from '@/server/db/schema';
import { HttpError, json, route } from '@/server/http';
import { deleteImageKitFile, imageKitEnabled, uploadTripCover } from '@/server/imagekit';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

// React Native's global FormData type has no `get`; on the server request.formData() does.
type UploadedFile = { type: string; size: number; arrayBuffer(): Promise<ArrayBuffer> };
type ServerFormData = { get(name: string): UploadedFile | string | null };

// Replaces the trip's cover image with one the user picked. The original goes to ImageKit; the
// app asks ImageKit for a resized, compressed version when it displays it.
export const POST = route(async (request: Request, params: Record<string, string>) => {
  const user = await requireUser(request);
  const id = z.uuid().safeParse(params.id);
  if (!id.success) throw new HttpError(404, 'not_found');
  if (!imageKitEnabled()) {
    throw new HttpError(503, 'images_not_configured', 'ImageKit is not set up on the server.');
  }

  const [trip] = await db
    .select({ id: trips.id, status: trips.status, heroImageFileId: trips.heroImageFileId })
    .from(trips)
    .where(and(eq(trips.id, id.data), eq(trips.userId, user.id), isNull(trips.deletedAt)))
    .limit(1);
  if (!trip) throw new HttpError(404, 'not_found');
  if (trip.status !== 'ready') {
    throw new HttpError(409, 'trip_not_ready', 'The trip is still being generated.');
  }

  const form = (await request.formData().catch(() => null)) as ServerFormData | null;
  const file = form?.get('file');
  if (!file || typeof file === 'string') throw new HttpError(400, 'invalid_input', 'Choose an image to upload.');
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new HttpError(400, 'invalid_image', 'Use a JPEG, PNG, WebP or HEIC image.');
  }
  if (file.size > MAX_BYTES) {
    throw new HttpError(400, 'image_too_large', 'That image is too large. Choose one under 10 MB.');
  }

  const uploaded = await uploadTripCover({
    userId: user.id,
    tripId: trip.id,
    bytes: Buffer.from(await file.arrayBuffer()),
    mimeType: file.type,
  });

  await db
    .update(trips)
    .set({
      heroImageUrl: uploaded.url,
      heroImageCredit: null,
      heroImageFileId: uploaded.fileId,
      updatedAt: new Date(),
    })
    .where(and(eq(trips.id, trip.id), eq(trips.userId, user.id)));

  await deleteImageKitFile(trip.heroImageFileId);
  return json({ heroImageUrl: uploaded.url });
});
