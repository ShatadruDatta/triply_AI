import { inngest } from '@/server/inngest/client';
import { type ClerkUserPayload, upsertUser } from '@/server/users';

export const syncUser = inngest.createFunction(
  { id: 'sync-clerk-user', triggers: [{ event: 'clerk/user.created' }] },
  async ({ event, step }) => {
    const u = event.data as ClerkUserPayload;
    await step.run('insert-user', () => upsertUser(u));
    return { clerkUserId: u.id };
  },
);
