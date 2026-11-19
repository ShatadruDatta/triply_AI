import { createClerkClient, verifyToken } from '@clerk/backend';
import { eq } from 'drizzle-orm';

import { db } from '@/server/db/client';
import { users, type User } from '@/server/db/schema';
import { HttpError } from '@/server/http';

const DEV_USER_ID = 'dev_bypass_user';

// Dev only: lets the app's dev login shortcut call the API without a Clerk session.
// Needs DEV_BYPASS_AUTH=1 and is never honoured when NODE_ENV is "production".
function isDevBypass(request: Request) {
  return (
    process.env.DEV_BYPASS_AUTH === '1' &&
    process.env.NODE_ENV !== 'production' &&
    request.headers.get('x-dev-bypass') === '1'
  );
}

async function userByClerkId(clerkUserId: string) {
  const [row] = await db.select().from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1);
  return row;
}

export async function requireUser(request: Request): Promise<User> {
  if (isDevBypass(request)) {
    const existing = await userByClerkId(DEV_USER_ID);
    if (existing) return existing;
    const [created] = await db
      .insert(users)
      .values({ clerkUserId: DEV_USER_ID, name: 'Dev User' })
      .onConflictDoNothing()
      .returning();
    return created ?? (await userByClerkId(DEV_USER_ID))!;
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new HttpError(500, 'auth_not_configured', 'CLERK_SECRET_KEY is not set on the server.');
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'unauthorized');

  let clerkUserId: string;
  try {
    const payload = await verifyToken(token, { secretKey });
    clerkUserId = payload.sub;
  } catch {
    throw new HttpError(401, 'unauthorized');
  }

  const existing = await userByClerkId(clerkUserId);
  if (existing) return existing;

  // The Clerk webhook may not have synced this user yet, so create the row on demand.
  const clerk = createClerkClient({ secretKey });
  const profile = await clerk.users.getUser(clerkUserId);
  const [created] = await db
    .insert(users)
    .values({
      clerkUserId,
      email: profile.primaryEmailAddress?.emailAddress ?? null,
      name: [profile.firstName, profile.lastName].filter(Boolean).join(' ') || null,
      avatarUrl: profile.imageUrl ?? null,
    })
    .onConflictDoNothing()
    .returning();
  return created ?? (await userByClerkId(clerkUserId))!;
}
