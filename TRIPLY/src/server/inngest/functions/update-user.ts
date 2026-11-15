import { inngest } from '@/server/inngest/client';
import { type ClerkUserPayload, upsertUser } from '@/server/users';

// Upsert (not plain update) so an updated event that arrives before
// user.created still produces the row.
export const updateUser = inngest.createFunction(
  { id: 'update-clerk-user', triggers: [{ event: 'clerk/user.updated' }] },
  async ({ event, step }) => {
    const u = event.data as ClerkUserPayload;
    await step.run('update-user', () => upsertUser(u));
    return { clerkUserId: u.id };
  },
);
