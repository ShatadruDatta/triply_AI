import { inngest } from '@/server/inngest/client';
import { log } from '@/server/sentry';
import { type ClerkUserPayload, upsertUser } from '@/server/users';

export const syncUser = inngest.createFunction(
  { id: 'sync-clerk-user', triggers: [{ event: 'clerk/user.created' }] },
  async ({ event, step }) => {
    const u = event.data as ClerkUserPayload;
    await step.run('insert-user', () => upsertUser(u));
    log.info('User synced from Clerk', { clerk_user_id: u.id });
    return { clerkUserId: u.id };
  },
);
