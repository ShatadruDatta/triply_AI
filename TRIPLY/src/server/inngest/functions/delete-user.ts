import { inngest } from '@/server/inngest/client';
import { log } from '@/server/sentry';
import { deleteUserByClerkId } from '@/server/users';

export const deleteUser = inngest.createFunction(
  { id: 'delete-clerk-user', triggers: [{ event: 'clerk/user.deleted' }] },
  async ({ event, step }) => {
    const { id } = event.data as { id: string };
    await step.run('delete-user', () => deleteUserByClerkId(id));
    log.info('User deleted from Clerk', { clerk_user_id: id });
    return { clerkUserId: id };
  },
);
