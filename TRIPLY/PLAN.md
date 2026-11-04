# Triply — v1 Implementation Plan

This is the implementation plan for Triply, an AI trip planner (Expo SDK 57, iOS + Android). Mark each task `[x]` when it's done. A milestone is complete when all of its tasks and its **Done when** check are ticked.

**Stack:** Expo Router · Clerk (Google + Apple) · Neon Postgres + Drizzle · Inngest (local Dev Server) · Google Gemini · Google Places · ImageKit · Sentry · TanStack Query · Expo Notifications · Expo Maps

> **Local-first:** Expo API routes run through `npx expo start`, and Inngest runs against the local Dev Server. Nothing is deployed to EAS Hosting yet.

---

## Progress

| # | Milestone | Status |
|---|---|---|
| M0 | Foundation | ⬜ Not started |
| M1 | Database | ⬜ Not started |
| M2 | Auth | ⬜ Not started |
| M3 | Trip creation, quota, Inngest skeleton | ⬜ Not started |
| M4 | AI generation (Gemini) | ⬜ Not started |
| M5 | Places + images | ⬜ Not started |
| M6 | Client core flows | ⬜ Not started |
| M7 | Regenerate a day | ⬜ Not started |
| M8 | Share + deep links | ⬜ Not started |
| M9 | Push notifications | ⬜ Not started |
| M10 | Hardening | ⬜ Not started |
| QA | Definition of done | ⬜ Not started |

Status legend: ⬜ Not started · 🟨 In progress · ✅ Completed

---

## Product scope

**In v1**
- Google + Apple sign-in
- Generate a trip, with generation running in the background and a push notification when it's ready
- Trip details: itinerary, hotels, map, budget breakdown
- List and delete trips
- Regenerate a single day
- Public read-only share link
- Free quota
- Offline reading of trips the user has already viewed

**Out of v1**
- Email auth, web UI, payments/paywall
- Editing a whole trip and rerunning it; manual itinerary editing
- Multiple languages
- Bookings and collaboration
- Streaming generation in real time

**Key rules**
- Quota is 3 trips per UTC calendar month. It's tracked in thirds: a generation costs 3 units, regenerating a day costs 1, and the limit is 9.
- A failed generation refunds its quota.
- A user can have at most 1 generation in flight at a time.
- Trips are 1–14 days for 1–20 travelers, and dates must be today or later.
- Budget is a tier (Budget / Moderate / Luxury) plus an optional amount. Currency defaults to the device locale's currency.
- The app is English only, with all strings kept in `src/lib/strings.ts`.

---

## Packages (versions checked on npm, 2026-09-26)

Use `npx expo install` for Expo and native packages, and `npm install` for everything else.

| Area | Package | Notes |
|---|---|---|
| Auth (client) | `@clerk/expo` 4.x | `@clerk/clerk-expo` is **deprecated** |
| Auth peers | `expo-secure-store`, `expo-apple-authentication`, `expo-auth-session`, `expo-crypto` | |
| Auth (server) | `@clerk/backend` 3.x | |
| DB | `@neondatabase/serverless` 1.x, `drizzle-orm` 0.45, `drizzle-kit` (dev) | |
| Jobs | `inngest` 4.x | Dev Server: `npx inngest-cli@latest dev` |
| AI | `@google/genai` 2.x | |
| Validation | `zod` 4.x | Shared between client and server |
| Images | `@imagekit/nodejs` 7.x | The `imagekit` package is **deprecated** |
| Monitoring | `@sentry/react-native` 8.x | Includes a config plugin |
| Client data | `@tanstack/react-query`, `@tanstack/react-query-persist-client` + async-storage persister | |
| Native | `expo-notifications`, `expo-maps`, `expo-localization`, `expo-clipboard` | |

Before writing each integration, check its API against the current docs (Expo v57, Clerk Core 3, Inngest v4, Gemini structured output).

---

## Folder layout

```
src/app/                    routes only
  _layout.tsx               providers (Clerk, Query, Sentry) + Stack.Protected gating
  (auth)/sign-in.tsx
  (app)/(tabs)/_layout.tsx  NativeTabs: Trips / Profile
  (app)/(tabs)/index.tsx    trips list + empty state
  (app)/(tabs)/profile.tsx  quota, sign out, delete account
  (app)/trip/new.tsx        generate form
  (app)/trip/[id]/index.tsx details (pending / failed / ready)
  share/[token].tsx         public read-only viewer (outside the auth gate)
  api/                      +api.ts server routes
src/server/                 server-only (never imported by the client)
  db/schema.ts, db/client.ts, auth.ts, quota.ts, ai/gemini.ts, ai/schema.ts,
  places.ts, imagekit.ts, push.ts, inngest/client.ts, inngest/functions/*.ts
src/features/               client components/hooks by feature (trips, auth, share)
src/lib/                    api client, query client, constants, strings.ts
drizzle/                    generated migrations
```

---

## Data model

| Table | Key fields |
|---|---|
| `users` | id uuid, clerk_user_id (unique), email, name, avatar_url, plan (`free`), created_at |
| `push_tokens` | id, user_id FK, expo_token (unique), platform, created_at |
| `trips` | id, user_id FK, status (`pending\|generating\|ready\|failed`), destination_place_id, destination_name, lat, lng, start_date, end_date, travelers, budget_tier, budget_amount?, currency, interests[], pace, notes, hero_image_url, budget_breakdown jsonb, share_token (unique)?, share_enabled, error_code, created_at, updated_at, deleted_at |
| `trip_days` | id, trip_id FK, day_number, date, title, summary, status (`ready\|regenerating\|failed`), unique(trip_id, day_number) |
| `activities` | id, trip_day_id FK, position, time_slot, name, description, category, est_cost, place_id, lat, lng, address, image_url |
| `hotels` | id, trip_id FK, name, place_id, lat, lng, address, rating, price_range, image_url |
| `places_cache` | place_id PK, name, lat, lng, address, rating, imagekit_url, fetched_at |
| `usage_ledger` | id, user_id FK, trip_id FK, kind (`generate\|regenerate_day\|refund`), units int, idempotency_key (unique), created_at |

---

## API routes

| Route | Purpose |
|---|---|
| `POST /api/trips` | Validate the input, check quota and the in-flight limit, insert the trip and a ledger row in one transaction, then send `trip/generate.requested` |
| `GET /api/trips` | List the user's trips (excluding deleted ones) |
| `GET /api/trips/:id` | Full trip. Owner only |
| `DELETE /api/trips/:id` | Soft delete and revoke the share link |
| `POST /api/trips/:id/days/:n/regenerate` | Quota check (+1), set the day to `regenerating`, send the event |
| `POST/DELETE /api/trips/:id/share` | Create or revoke the share token |
| `GET /api/share/:token` | Public read-only trip with owner fields removed |
| `GET /api/places/autocomplete` | Places Autocomplete proxy with a session token |
| `GET /api/me` | Profile plus quota used and remaining |
| `DELETE /api/me` | Delete the Clerk user; the DB rows cascade |
| `POST /api/push-tokens` | Upsert the device's Expo push token |
| `POST /api/webhooks/clerk` | Verify the signature and handle `user.deleted` |
| `GET/POST/PUT /api/inngest` | Inngest `serve` handler |

---

## M0 — Foundation

- [ ] Install the core dependencies with `npx expo install` / `npm install`
- [ ] Create `.env.local`, with the `EXPO_PUBLIC_` prefix only on client keys, plus a committed `.env.example`
- [ ] Make sure `.env*` files (except `.env.example`) are git-ignored
- [ ] Add a Jest config and a sample test
- [ ] Add an `npm run typecheck` script (`tsc --noEmit`)
- [ ] Wire up Sentry: config plugin in `app.json`, `Sentry.wrap` on the root layout
- [ ] Add a server-side Sentry helper for API routes
- [ ] Create `eas.json` with `development` and `production` profiles
- [ ] Make the first dev build (`npx expo run:ios` / `npx expo run:android`)
- [ ] Create the folder skeleton (`src/server`, `src/features`, `src/lib`)
- [ ] **Done when:** the app launches on a dev build, a test error appears in Sentry, and lint and typecheck pass

## M1 — Database

- [ ] Create a Neon project with a `dev` branch and put its connection string in the env
- [ ] Write the Drizzle schema for every table above, with enums and `ON DELETE CASCADE` from users
- [ ] Add `drizzle.config.ts` and the migration scripts
- [ ] Generate and apply the first migration
- [ ] Create the DB client with the Neon serverless driver (`src/server/db/client.ts`)
- [ ] **Done when:** the migration applies cleanly to Neon dev and a test query works

## M2 — Auth

- [ ] Create a Clerk dev instance and enable Google and Apple
- [ ] Add `ClerkProvider` with a secure-store token cache in the root layout
- [ ] Build the sign-in screen: native Apple button (iOS) and Google OAuth
- [ ] Gate the `(app)` routes with `Stack.Protected` based on `isSignedIn`
- [ ] Add a sign-out action
- [ ] Server: `requireUser(request)` verifies the Clerk JWT and upserts the `users` row
- [ ] Add an API client that attaches the Clerk session token (`src/lib/api.ts`)
- [ ] Add the `GET /api/me` route
- [ ] Add the `POST /api/webhooks/clerk` route handling `user.deleted` (needs a tunnel in dev)
- [ ] **Done when:** sign-in and sign-out work on iOS and Android and `/api/me` returns the user

## M3 — Trip creation, quota, Inngest skeleton

- [ ] Write the shared Zod schema for trip input (`src/features/trips/schema.ts`)
- [ ] `quota.ts`: units used this UTC month, a limit of 9, and the in-flight check
- [ ] Create the Inngest client and the `/api/inngest` serve route
- [ ] `POST /api/trips`: validate → quota → one transaction inserting the trip and a +3 ledger row → send the event (id = tripId)
- [ ] `GET /api/trips` and `GET /api/trips/:id` (owner only)
- [ ] Stub `trip/generate` function that marks the trip `ready` with fake data
- [ ] Run the Dev Server: `npx inngest-cli@latest dev -u http://localhost:8081/api/inngest`
- [ ] **Done when:** a trip created with curl goes from `pending` to `ready` in the Dev Server UI

## M4 — AI generation (Gemini)

- [ ] `ai/schema.ts`: Zod schema covering days, activities (with a `search_query`), 2–4 hotels and the budget breakdown
- [ ] Convert the Zod schema to a JSON schema for Gemini's `responseSchema`
- [ ] Prompt builder: destination, dates and season, travelers, tier and amount, currency, interests, pace, notes
- [ ] `ai/gemini.ts`: call Gemini with structured output
- [ ] `step.run('generate')`: call Gemini, then parse with Zod, throwing on failure so the step retries
- [ ] `step.run('persist')`: write the days, activities, hotels and budget breakdown
- [ ] Set the trip's status to `generating` when the job starts and `ready` when it finishes
- [ ] `onFailure`: set the trip to `failed` and add a −3 refund row (idempotency key `refund:<tripId>`)
- [ ] **Done when:** a real Gemini itinerary lands in the DB for a test trip

## M5 — Places + images

- [ ] **Decide first:** check the Google Places terms on caching photos. Default: ImageKit as a proxy for Places photo URLs, caching the place_id only
- [ ] `places.ts`: Text Search (New) biased to the destination, with a minimal field mask
- [ ] Enrich activities and hotels in batched steps (to respect rate limits)
- [ ] Policy for places that can't be verified: drop them, but if a day has fewer than 2 verified activities, keep the AI entry without a pin
- [ ] Look up and write `places_cache` entries
- [ ] `imagekit.ts`: build photo URLs with transforms
- [ ] Choose the trip's hero image from the destination photo
- [ ] **Done when:** a generated trip has real coordinates and ImageKit-served photos

## M6 — Client core flows

- [ ] Query client with a persisted cache (trips list and details only, 7-day max age)
- [ ] `GET /api/places/autocomplete` proxy route
- [ ] Destination autocomplete input with debouncing and a session token
- [ ] Generate form: date range, travelers stepper, budget tier + optional amount, currency, interest chips, pace, notes (≤500 characters)
- [ ] Client-side validation using the shared Zod schema, with inline errors
- [ ] Quota-exceeded state on the form
- [ ] Trip details: loading state that polls every 3s while `pending|generating`
- [ ] Trip details: failed state with a retry
- [ ] Trip details: hero image, day sections, activity cards
- [ ] Trip details: hotels section
- [ ] Trip details: `expo-maps` pins plus "Open in Maps"
- [ ] Trip details: budget breakdown, labelled as estimates
- [ ] Trips tab: status cards (generating, ready, failed) and an empty state with a "Plan a trip" CTA
- [ ] Profile tab: user info and quota used/remaining
- [ ] NativeTabs layout with SF Symbols, liquid glass where available, automatic light and dark mode
- [ ] **Done when:** generate → wait → view works end to end on iOS and Android

## M7 — Regenerate a day

- [ ] `POST /api/trips/:id/days/:n/regenerate` route (quota +1, day set to `regenerating`)
- [ ] `trip/regenerate-day` Inngest function that reuses the M4/M5 steps for one day and passes the rest of the trip as context so it doesn't repeat places
- [ ] `onFailure`: restore the day to `ready` and refund −1
- [ ] Client: a regenerate action on each day with an optional note
- [ ] Client: a per-day regenerating state, with polling
- [ ] **Done when:** one day is replaced and the quota reflects ⅓ of a trip

## M8 — Share + deep links

- [ ] `POST/DELETE /api/trips/:id/share` (random token of 128 bits or more, base64url)
- [ ] `GET /api/share/:token` public route that strips owner fields
- [ ] `share/[token].tsx` read-only viewer outside the auth gate
- [ ] Share button using the native share sheet with the `triply://share/<token>` link
- [ ] Revoke action for the owner
- [ ] Deleting a trip invalidates its share link
- [ ] (Later) Universal links once a domain exists
- [ ] **Done when:** a signed-out device opens a shared trip, and revoking the link breaks it

## M9 — Push notifications

- [ ] Set up APNs and FCM credentials through EAS
- [ ] Ask for notification permission after the first trip is generated, not at launch
- [ ] Register the Expo push token through `POST /api/push-tokens`
- [ ] `push.ts`: send through the Expo Push API
- [ ] Final Inngest step sends the push with `data.url = /trip/<id>`
- [ ] Add a notification-response listener that routes to the trip
- [ ] Remove push tokens the Expo Push API reports as invalid
- [ ] **Done when:** backgrounding the app during generation → a push arrives → tapping it opens the trip

## M10 — Hardening

- [ ] `DELETE /api/trips/:id` plus delete actions in the list and on the details screen
- [ ] Account deletion in Profile (`DELETE /api/me`, cascading)
- [ ] Offline banner driven by network state, with generation disabled while offline
- [ ] Error boundaries on each route
- [ ] Sentry: tag the user id (no PII), and tag the trip id inside Inngest steps
- [ ] Empty and error states on every screen
- [ ] Accessibility pass: labels, Dynamic Type, contrast
- [ ] Move all copy into `src/lib/strings.ts`
- [ ] **Done when:** every QA item below passes

---

## QA — Definition of done

**Unit tests (Jest)**
- [ ] AI-output Zod schema: valid, malformed and partial fixtures
- [ ] Quota math: month boundary, refunds, fractional regenerations
- [ ] Share-token access: revoked, deleted and wrong tokens
- [ ] Inngest function logic with Gemini and Places mocked: success, retry, `onFailure` refund

**Manual QA on iOS and Android dev builds**
- [ ] Sign in with Apple and with Google
- [ ] Generate a Tokyo trip → background the app → receive the push → tap through to the trip
- [ ] Regenerate one day
- [ ] Share a trip and open the link while signed out
- [ ] Go offline and confirm a previously viewed trip still opens
- [ ] Hit the quota limit and see the blocked state
- [ ] Delete a trip, then delete the account

**Tooling**
- [ ] `npx expo lint` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npx expo-doctor` passes

---

## Assumptions

1. Drizzle is the ORM, used with the Neon serverless driver.
2. The app polls for trip status every ~3s instead of using realtime updates.
3. Account deletion lives in Profile (an App Store requirement).
4. Failed generations refund their quota.
5. There's no product analytics beyond Sentry in v1.
6. Maps use `expo-maps`: Apple Maps on iOS, Google Maps on Android.
7. Opening a share link requires the app to be installed; there's no web viewer.
8. Trips are soft-deleted.

## Open risks

1. **Inngest on EAS Hosting:** deferred, because we're local-only with the Dev Server for now. Before the first hosted deploy, check that the edge `serve` handler works there and that each step fits inside the request timeout. The fallback is a separate Hono backend. When testing on a physical device, it must reach the dev machine over the LAN or a tunnel.
2. **Google Places terms on caching:** these may forbid storing photos. Resolve this before M5.
3. **Gemini hallucination:** mitigated by Zod validation plus Places verification.
4. **Cost per trip:** measure it once generation works (Gemini plus 10–30 Places calls).
5. **Clerk native Apple and Google setup:** Apple Services ID and the Android SHA fingerprint.
6. **Universal links:** need a domain.
7. **Push notifications:** need APNs and FCM credentials.
8. **Quota reset time:** resetting at UTC midnight may not match what users expect.
