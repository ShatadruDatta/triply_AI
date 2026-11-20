import { and, eq, gte, inArray, isNull, sql } from 'drizzle-orm';

import { db } from '@/server/db/client';
import { trips, usageLedger } from '@/server/db/schema';

// 3 units per generation, 1 per regenerated day, 9 units = 3 trips per UTC month.
// Override with QUOTA_LIMIT_UNITS (e.g. in .env while developing); the default is 3 trips a month.
export const QUOTA_LIMIT_UNITS = Number(process.env.QUOTA_LIMIT_UNITS) || 9;
export const GENERATE_COST_UNITS = 3;

function startOfUtcMonth(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function unitsUsedThisMonth(userId: string) {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${usageLedger.units}), 0)::int` })
    .from(usageLedger)
    .where(and(eq(usageLedger.userId, userId), gte(usageLedger.createdAt, startOfUtcMonth())));
  return Math.max(0, row?.total ?? 0);
}

export async function getQuota(userId: string, now = new Date()) {
  const used = await unitsUsedThisMonth(userId);
  const remaining = Math.max(0, QUOTA_LIMIT_UNITS - used);
  return {
    used,
    limit: QUOTA_LIMIT_UNITS,
    remaining,
    // The same numbers in trips, which is how the app shows them.
    tripsTotal: Math.floor(QUOTA_LIMIT_UNITS / GENERATE_COST_UNITS),
    tripsLeft: Math.floor(remaining / GENERATE_COST_UNITS),
    // The quota is per UTC month, so it resets at the start of the next one.
    resetsAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString(),
  };
}

// A user may have at most one generation running at a time. Runs older than this are treated
// as abandoned so a lost job can't block the user forever.
const IN_FLIGHT_WINDOW_MS = 10 * 60 * 1000;


export async function hasGenerationInFlight(userId: string) {
  const [row] = await db
    .select({ id: trips.id })
    .from(trips)
    .where(
      and(
        eq(trips.userId, userId),
        inArray(trips.status, ['pending', 'generating']),
        isNull(trips.deletedAt),
        gte(trips.updatedAt, new Date(Date.now() - IN_FLIGHT_WINDOW_MS)),
      ),
    )
    .limit(1);
  return !!row;
}
