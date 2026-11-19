import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  email: text('email'),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  plan: text('plan').notNull().default('free'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const tripStatus = pgEnum('trip_status', ['pending', 'generating', 'ready', 'failed']);
export const dayStatus = pgEnum('day_status', ['ready', 'regenerating', 'failed']);
export const ledgerKind = pgEnum('ledger_kind', ['generate', 'regenerate_day', 'refund']);

// Photo credit that Unsplash requires us to show next to its images.
export type ImageCredit = { name: string; profileUrl: string; photoUrl: string };

export type BudgetBreakdown = {
  total: number;
  currency: string;
  items: { category: 'stay' | 'food' | 'activities' | 'transport' | 'other'; amount: number }[];
  perDay: number | null;
};

export const trips = pgTable(
  'trips',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: tripStatus('status').notNull().default('pending'),
    destinationPlaceId: text('destination_place_id'),
    destinationName: text('destination_name').notNull(),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    travelers: integer('travelers').notNull(),
    budgetTier: text('budget_tier').notNull(),
    budgetAmount: integer('budget_amount'),
    currency: text('currency').notNull().default('USD'),
    interests: text('interests').array().notNull().default([]),
    pace: text('pace').notNull(),
    notes: text('notes'),
    summary: text('summary'),
    heroImageUrl: text('hero_image_url'),
    heroImageCredit: jsonb('hero_image_credit').$type<ImageCredit>(),
    // ImageKit file id when the user uploaded their own cover (so it can be deleted later).
    heroImageFileId: text('hero_image_file_id'),
    budgetBreakdown: jsonb('budget_breakdown').$type<BudgetBreakdown>(),
    shareToken: text('share_token').unique(),
    shareEnabled: boolean('share_enabled').notNull().default(false),
    errorCode: text('error_code'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('trips_user_idx').on(t.userId, t.createdAt)],
);

export const tripDays = pgTable(
  'trip_days',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    dayNumber: integer('day_number').notNull(),
    date: date('date').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    status: dayStatus('status').notNull().default('ready'),
  },
  (t) => [unique('trip_days_trip_day_unique').on(t.tripId, t.dayNumber)],
);

export const activities = pgTable(
  'activities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripDayId: uuid('trip_day_id')
      .notNull()
      .references(() => tripDays.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    timeSlot: text('time_slot').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    estCost: integer('est_cost'),
    placeId: text('place_id'),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    address: text('address'),
    imageUrl: text('image_url'),
    imageCredit: jsonb('image_credit').$type<ImageCredit>(),
  },
  (t) => [index('activities_day_idx').on(t.tripDayId, t.position)],
);

export const hotels = pgTable('hotels', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  area: text('area'),
  placeId: text('place_id'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  address: text('address'),
  rating: doublePrecision('rating'),
  priceRange: text('price_range'),
  imageUrl: text('image_url'),
  imageCredit: jsonb('image_credit').$type<ImageCredit>(),
});

// Quota is tracked in thirds of a trip: generate = +3, regenerate a day = +1, refund = negative.
export const usageLedger = pgTable('usage_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'set null' }),
  kind: ledgerKind('kind').notNull(),
  units: integer('units').notNull(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Trip = typeof trips.$inferSelect;
