Triply is an AI trip planner built with Expo/React Native for **iOS and Android** (web is not a v1 target). Prioritize mobile-first patterns, native platform UI, and performance.

The v1 roadmap lives in `PLAN.md`. When you finish a task, tick it `[x]` and update the milestone status table.

## Expo has changed: do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json` (currently **SDK 57**).
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v57.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt. It indexes all Expo docs and corrects common LLM misconceptions. Follow its links to the page you need; never answer from memory.

The same applies to every service in the tech stack below: check the current docs before writing an integration.

## Tech stack

| Area | Choice | Notes |
|---|---|---|
| App | Expo SDK 57, React Native 0.86, React 19, TypeScript (strict) | React Compiler and typed routes are enabled |
| Navigation | Expo Router + **native tabs** | See "Navigation & Routing" |
| Styling | NativeWind v4 (Tailwind) | |
| Database | **Postgres on Neon** | `@neondatabase/serverless` |
| ORM | **Drizzle** | `drizzle-orm` + `drizzle-kit`; migrations in `drizzle/` |
| Auth | **Clerk** | `@clerk/expo` on the client (`@clerk/clerk-expo` is deprecated), `@clerk/backend` on the server |
| Background jobs | **Inngest** | Local Dev Server: `npx inngest-cli@latest dev` |
| Images | **ImageKit** | `@imagekit/nodejs` (the `imagekit` package is deprecated) |
| Errors & monitoring | **Sentry** | `@sentry/react-native` with its config plugin |
| AI | Google Gemini | `@google/genai`, structured output |
| Places | Google Places API | Proxied through our API routes |
| Client data | TanStack Query | Persisted for offline reading |
| Validation | Zod | Schemas shared between client and server |

Don't add libraries that duplicate these (another ORM, auth provider, job queue, image CDN, or error tracker). Ask first if you think a new dependency is needed.

## Never run the app yourself

The developer is already running the app in a separate terminal. **Never start, restart, or build the app yourself.** That means no `npx expo start`, `npm start`, `npx expo run:ios`, `npx expo run:android`, `npx expo start --web`, or `npx inngest-cli dev`, and no local or EAS builds. If a change needs a restart, a rebuild, or a cache clear, tell the developer instead of doing it.

## Commands

The package manager is **npm** (`package-lock.json`). Don't use bun, yarn, or pnpm.

```bash
npx expo install <package>  # Expo and native packages: resolves SDK-compatible versions
npm install <package>       # pure JS packages with no native code (drizzle-orm, zod, inngest…)
npx expo start              # dev server + API routes (developer runs this, never you)
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx drizzle-kit generate    # generate a migration after changing the schema
npx drizzle-kit migrate     # apply migrations
npx inngest-cli@latest dev  # local Inngest Dev Server (developer runs this, never you)
```

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/`: every file there is a screen, and `_layout.tsx` files define navigators. Keep non-route code outside `src/app/`.
- **Always use native tabs.** Tab bars use `NativeTabs` from `expo-router/unstable-native-tabs`. Never use JavaScript tab navigators (`Tabs` from `expo-router`, `expo-router/js-tabs`, `@react-navigation/bottom-tabs`) or custom-built tab bars.
- Stacks use `Stack` from `expo-router` (native stack). Prefer native headers, large titles, and native modals/sheets over JS reimplementations.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`. Typed routes are on, so use typed `href`s and never build route strings by concatenation.
- Route groups: `(auth)` holds signed-out screens, `(app)` holds signed-in screens (gated with `Stack.Protected` in the root layout), and `share/[token]` stays public.
- API routes are `+api.ts` files under `src/app/api/`.
- Docs: https://docs.expo.dev/router/introduction.md

## UI primitives: native components only

- Never use HTML/DOM elements (`div`, `span`, `p`, `img`, `button`, `input`, `a`). Use React Native primitives.
- **All text must be inside `<Text>`.** A bare string inside a `<View>` crashes on native.
- Buttons and taps use `Pressable`, not `TouchableOpacity`/`TouchableHighlight`.
- Images use `Image` from `expo-image`, not the `Image` from `react-native`. Remote images come from ImageKit URLs with transformation params sized for the view.
- Icons use `SymbolView` from `expo-symbols`. Don't add icon font packages.
- Long or dynamic lists use `FlatList`/`SectionList` with a `keyExtractor`, never `.map()` inside a `ScrollView`.
- Safe areas use `SafeAreaView` / `useSafeAreaInsets` from `react-native-safe-area-context`, never the ones from `react-native`.
- Forms use `TextInput` with keyboard handling (`KeyboardAvoidingView` or equivalent).
- Prefer native platform UI where it fits: `@expo/ui` components and `expo-glass-effect`.
- Open external URLs with `expo-web-browser`.

## Styling: NativeWind v4

- Style with Tailwind classes via `className`. Use `StyleSheet` or inline `style` only for dynamic or animated values (e.g. Reanimated styles).
- Design tokens (colors, fonts, radii) live in `tailwind.config.js` under `theme.extend`. Don't hard-code hex values in components.
- Support light and dark mode (`userInterfaceStyle: automatic`) with `dark:` variants.
- Reference designs are in `design/`. Match `design/design-system.png` for colors, type, and spacing.
- Only files under `src/` are scanned for classes. Never build class names dynamically (e.g. `` `bg-${color}-500` ``).

## React & performance

- React Compiler is enabled, so don't add `useMemo`, `useCallback`, or `React.memo` by hand unless profiling shows a need.
- Animations use Reanimated 4, never the `Animated` API. Gestures use `react-native-gesture-handler`.
- Write function components only. Route files use a default export; everything else uses named exports.
- No `any`.

## Code organization

```
src/app/            routes and +api.ts routes only
src/features/<x>/   client components and hooks per feature (trips, auth, share)
src/lib/            API client, query client, constants, strings.ts
src/server/         server-only code: db, auth, quota, ai, places, imagekit, push, inngest
drizzle/            generated migrations (never edit by hand)
```

- **Never import `src/server/` from client code.** It holds secrets and Node-only SDKs.
- Import with the `@/` alias, not deep relative paths.
- All user-facing strings go in `src/lib/strings.ts`. The app is English only.

## Backend rules

**Database (Neon + Drizzle)**
- The schema is defined in `src/server/db/schema.ts`. Change it there, then run `drizzle-kit generate`. Never write raw DDL or edit generated migrations.
- Use Drizzle's query builder. Use raw SQL only through Drizzle's `sql` template, never string concatenation.
- Writes that must succeed together (e.g. insert a trip + a usage ledger row) go in one transaction.
- Soft-deleted rows (`deleted_at`) are excluded from every user-facing query.

**Auth (Clerk)**
- Every API route except `/api/share/*`, `/api/webhooks/*`, and `/api/inngest` verifies the Clerk session and scopes queries to the current user. Never trust a user id sent by the client.
- Verify webhook signatures before handling them.
- Check the Clerk skills in `.claude/skills/` before writing auth code.

**Background jobs (Inngest)**
- Long or slow work (AI generation, Places lookups, image uploads, push notifications) runs in Inngest functions under `src/server/inngest/functions/`, never inline in an API route.
- Wrap each side effect in `step.run` so retries are safe, and make steps idempotent.
- On a failed generation, set the status to `failed` and refund the quota.

**Images (ImageKit)**
- Upload and store images through `src/server/imagekit.ts`. The client only ever receives ImageKit URLs, never raw Google Places photo URLs or API keys.

**Validation**
- Validate every API request body and every Gemini response with Zod. The schemas are shared with the client.

## Client data

- Server data goes through TanStack Query (`useQuery` / `useMutation`). Never `fetch` inside `useEffect`.
- Every screen that loads data handles its loading, error, and empty states.

## Secrets & environment

- Only client-safe values get the `EXPO_PUBLIC_` prefix (e.g. the Clerk publishable key, Sentry DSN).
- Neon, Clerk secret, Gemini, Google Places, ImageKit private, and Inngest keys are server-only and are never prefixed.
- Keep `.env.example` up to date when you add a variable. Never commit `.env.local`.

## Errors & monitoring (Sentry)

- The root layout is wrapped with `Sentry.wrap`. API routes and Inngest functions report errors through the server Sentry helper.
- Never swallow errors with an empty `catch`. Report them to Sentry or show them to the user.
- Never send tokens, API keys, or other personal data in Sentry events.

## Accessibility

- Interactive elements need `accessibilityRole` and `accessibilityLabel`, especially icon-only buttons.
- Touch targets must be at least 44×44 pt.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`). Run it as `npx eas-cli@latest <command>` wherever the docs say bare `eas`.
Docs: https://docs.expo.dev/eas/index.md

## Native projects

- `ios/` and `android/` are generated by prebuild (Continuous Native Generation) and are gitignored. Never create or edit them by hand. Configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, tell the developer the development build must be rebuilt (`npx expo run:ios|android` or `eas build --profile development`). Don't run it yourself.
- Prefer recommended Expo modules over third-party libraries. Docs: https://docs.expo.dev/versions/latest/index.md

## Definition of done

1. `npx expo lint` passes.
2. `npx tsc --noEmit` passes.
3. The code handles both iOS and Android (check any `Platform.OS` branches). Ask the developer to verify it in their running app.
4. The matching `PLAN.md` task is ticked.
