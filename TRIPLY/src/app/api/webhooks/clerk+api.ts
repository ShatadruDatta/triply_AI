import { verifyWebhook } from '@clerk/backend/webhooks';

import { inngest } from '@/server/inngest/client';

export async function POST(request: Request) {
  let evt;
  try {
    // Reads CLERK_WEBHOOK_SIGNING_SECRET and verifies the signature.
    evt = await verifyWebhook(request);
  } catch (error) {
    console.error('Clerk webhook verification failed', error);
    return new Response('Invalid signature', { status: 400 });
  }

  if (evt.type === 'user.created' || evt.type === 'user.updated') {
    const { id, email_addresses, primary_email_address_id, first_name, last_name, image_url } =
      evt.data;
    const email =
      email_addresses.find((e) => e.id === primary_email_address_id)?.email_address ??
      email_addresses[0]?.email_address ??
      null;
    const name = [first_name, last_name].filter(Boolean).join(' ') || null;

    await inngest.send({
      // Dedupes Clerk retries; each distinct update has its own updated_at.
      id:
        evt.type === 'user.created'
          ? `clerk-user-created-${id}`
          : `clerk-user-updated-${id}-${evt.data.updated_at}`,
      name: evt.type === 'user.created' ? 'clerk/user.created' : 'clerk/user.updated',
      data: { id, email, name, imageUrl: image_url ?? null },
    });
  }

  if (evt.type === 'user.deleted' && evt.data.id) {
    await inngest.send({
      id: `clerk-user-deleted-${evt.data.id}`,
      name: 'clerk/user.deleted',
      data: { id: evt.data.id },
    });
  }

  return new Response('ok', { status: 200 });
}
