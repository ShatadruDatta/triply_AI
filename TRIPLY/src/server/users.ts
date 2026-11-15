import { eq } from 'drizzle-orm';

import { db } from '@/server/db/client';
import { users } from '@/server/db/schema';

export type ClerkUserPayload = {
  id: string;
  email: string | null;
  name: string | null;
  imageUrl: string | null;
};

export async function upsertUser(u: ClerkUserPayload) {
  await db
    .insert(users)
    .values({ clerkUserId: u.id, email: u.email, name: u.name, avatarUrl: u.imageUrl })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: { email: u.email, name: u.name, avatarUrl: u.imageUrl },
    });
}

// Child rows are removed by ON DELETE CASCADE once those tables exist.
export async function deleteUserByClerkId(clerkUserId: string) {
  await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
}
