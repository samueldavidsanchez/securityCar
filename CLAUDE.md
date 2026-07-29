# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Securitycar is a serverless vehicle security and monitoring platform (think Tesla app / Apple Find My). Users track one or a few vehicles in real time, view telemetry, and send security commands (engine block/unblock). It is **not** a fleet management system.

**Flespi is the single source of truth for all telemetry.** GPS positions, events, and parameters are never stored locally — they are queried on demand from the Flespi API. Only user/vehicle metadata lives in Supabase.

## Stack

| Layer | Technology |
|---|---|
| Web frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4 |
| Mobile | Expo SDK 57, React Native 0.86, TypeScript, Expo Router |
| Backend | Next.js API Routes deployed on Vercel |
| Auth + DB | Supabase (Auth + PostgreSQL + RLS) |
| Telemetry | Flespi REST API (server-side only, token never exposed to client) |
| Monorepo | Turborepo |
| Validation | Zod |
| Maps (web) | MapLibre GL + OpenStreetMap |
| Maps (mobile) | react-native-maps |

## Monorepo Structure

```
securitycar/
├── apps/
│   ├── web/          # Next.js app (hosted on Vercel)
│   └── mobile/       # Expo app (built with EAS)
└── packages/
    └── shared/       # Types, Zod schemas, formatters — used by both apps
```

## Development Commands

```bash
# Install all dependencies (run from root)
npm install

# From repo root — Turborepo fans these out to every workspace that DEFINES the task.
# Not every workspace defines every task, so these only run where the script exists:
npm run dev          # turbo run dev (persistent, uncached)
npm run build        # turbo run build (web only)
npm run lint         # turbo run lint (web only)
npm run typecheck    # turbo run typecheck — covers mobile + shared; web typechecks via `next build`
npm run test         # turbo run test — NO-OP: no workspace defines `test` and there are no tests yet
npm run format       # prettier --write across the whole repo

# Web (Next.js) — from apps/web
npx next dev            # dev server
npx next build          # production build (runs typecheck)
npx eslint .            # lint
npx next typegen        # regenerate route types after adding/renaming routes

# Mobile (Expo) — from apps/mobile
npx expo start                              # dev (Metro); press a/i for emulator
npm run typecheck                           # tsc --noEmit
npx expo export --platform android          # verify the bundle resolves & compiles

# Shared package — from packages/shared
npx tsc --noEmit        # typecheck

# Provision hardware (mints a single-use claim_code the client redeems via POST /api/vehicles)
node scripts/provision-device.mjs --imei <IMEI> [--iccid <ICCID>]
node scripts/provision-device.mjs --imei <IMEI> --flespi-id <ID>   # skip the Flespi lookup
```

**No automated test suite exists yet.** Verification is manual — see the end-to-end
QA checklist in `docs/qa-mvp.md` (Spanish). Deployment (Vercel root dir, env push via
`scripts/vercel-push-env.sh`, EAS mobile builds, Google OAuth setup) is documented in `DEPLOY.md`.

## Next.js 16 conventions (IMPORTANT — differs from older Next.js)

The web app runs **Next.js 16 with Turbopack**. Breaking changes that affect how code must be written here:

- **`middleware.ts` → `proxy.ts`.** Route protection lives in `apps/web/proxy.ts`, exporting a `proxy(request)` function (Node.js runtime, not edge). The matcher excludes static assets and `/api/webhooks`. `/api/*` routes are NOT redirected by the proxy — they enforce auth themselves and return JSON 401s.
- **Async request APIs.** `params`, `cookies()`, `headers()`, `searchParams` are all Promises — always `await` them. Route handlers use the generated `RouteContext<'/api/...'>` helper: `async function GET(req, ctx: RouteContext<'/api/vehicles/[id]'>) { const { id } = await ctx.params }`.
- **`next lint` removed.** Lint with `eslint` directly (`npm run lint` → `eslint`). Run `npx next typegen` to regenerate route types after adding/renaming routes.
- **React Compiler purity rules are enforced by ESLint.** No `Date.now()` / `Math.random()` in render (use the `useNow` hook), and no synchronous `setState` in effects that derives from props/state (derive during render with `useMemo` instead — see `VehicleProvider`).
- **Tailwind v4** (CSS-first). Theme tokens are defined in `app/globals.css` under `@theme`; there is no `tailwind.config.js`.
- **`apps/web/AGENTS.md` and `apps/mobile/AGENTS.md` are load-bearing, not boilerplate.** Each one flags that the installed framework version (Next.js 16, Expo SDK 57) is newer than training data and points at the versioned docs to read first (`node_modules/next/dist/docs/` for web, `docs.expo.dev/versions/v57.0.0` for mobile). Don't skip them — APIs referenced from memory are frequently wrong for this repo's versions.

## Mobile app (Expo SDK 57)

`apps/mobile` is an Expo Router app (React Native 0.86, React 19). It reuses the web's API and the `@securitycar/shared` package — screens mirror the web one-to-one (Map, Dashboard, Security, History, Settings) via a bottom tab bar.

- **Auth transport differs from web.** The web authenticates API routes via session cookies; mobile sends `Authorization: Bearer <supabase access_token>`. Both are handled by `getAuthContext(request)` in `apps/web/lib/api/auth.ts` — when a Bearer token is present it builds a Supabase client with that JWT so Postgres RLS still applies. Any new API route must use `getAuthContext(request)` (never the old cookie-only helper) to stay mobile-compatible.
- **Google login is native, not the web OAuth flow.** `lib/google-auth.ts` uses `@react-native-google-signin/google-signin` to get an `id_token` and redeems it with `supabase.auth.signInWithIdToken` — no browser, no redirect URI, no deep link. `GoogleSignin.configure` takes the **web** client ID (the Android one lives only in Google Console, matched by keystore SHA-1); passing the Android id causes `DEVELOPER_ERROR`. The button hides itself when `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is unset.
- **Expo Go no longer runs this app.** The Google Sign-In native module requires a development build (`npx eas build --profile development`). `expo export` still validates bundling, but it cannot exercise native modules.
- **Token refresh is tied to AppState.** `lib/supabase.ts` starts/stops `autoRefreshToken` on foreground/background. Without it the refresh timer is frozen while backgrounded and the first API call after ~1h returns 401 despite a valid session. Don't remove the `AppState` listener.
- **Mobile calls the deployed web API.** `apps/mobile/lib/api.ts` targets `EXPO_PUBLIC_API_URL`. For the Android emulator that's `http://10.0.2.2:3000`; iOS simulator uses `localhost`; a physical device needs the LAN IP. Supabase auth happens directly in the app (`lib/supabase.ts`, session persisted in AsyncStorage).
- **`typedRoutes` is disabled.** Expo's typed-route generation crashes under npm workspace hoisting (`@expo/cli` hoists to root but `expo-router` stays in `apps/mobile`, breaking `expo-router/_ctx-shared` resolution). Routes use plain string `href`s. Don't re-enable `experiments.typedRoutes` without fixing the hoisting.
- **Metro monorepo config.** `apps/mobile/metro.config.js` watches the workspace root and adds root `node_modules` to `nodeModulesPaths` so the symlinked shared package bundles. Verify bundling with `npx expo export --platform android`, not just `tsc`.
- **Brand: vivancar.** Green `#9AB055` accent on near-black `#1D1D1B`. Web tokens live in `apps/web/app/globals.css` (`@theme`); mobile mirrors them in `apps/mobile/theme/colors.ts`. Primary buttons use dark text on green (like the logo). Logos are in `apps/web/public/brand/` and the source `Manual de maraca/`.

## Key Architectural Rules

**No telemetry storage.** Never write GPS positions, events, or Flespi messages to the database. Every telemetry request hits Flespi directly through the API layer.

**Devices are claimed, never declared.** A client never sends a `flespi_device_id` or IMEI to create a vehicle — Flespi ids are sequential and enumerable, so accepting one from the client let any user bind another customer's tracker (live GPS + engine-block commands). We pre-register hardware with `scripts/provision-device.mjs`, which mints a single-use `claim_code`; the client redeems it via `POST /api/vehicles`. Adding any endpoint that accepts a device identifier from user input reopens this hole.

**Access is role-based, resolved by `loadAccessibleVehicle(supabase, id, role)`.** Roles are `owner > driver > viewer` (`vehicle_users` table). Telemetry reads need `viewer`, commands need `driver`, mutating the vehicle or managing access needs `owner`. Never reintroduce `loadOwnedVehicle` — it hid shared vehicles. Reads in `VehicleRepository` deliberately do **not** filter by `owner_id` (RLS scopes them, and filtering would hide shared vehicles); writes still filter explicitly.

**Vehicles are soft-deleted.** `DELETE /api/vehicles/:id` sets `deleted_at` (migration `0005`) instead of removing the row, so `command_logs` (engine-block audit trail) survives. Every vehicle read must filter `.is('deleted_at', null)`; a partial unique index keeps one *active* vehicle per device while freeing soft-deleted ones.

**Command dispatch is rate-limited in the route (10/min/user).** Unlike claim/accept, the sensitive action here (Flespi dispatch) is server-only — the token never reaches the client — so counting `command_logs` in the Route Handler is sufficient and there's no Postgres-function bypass to worry about.

**RLS policies must not query each other directly.** A `vehicles` policy reading `vehicle_users` while the `vehicle_users` policy reads `vehicles` makes Postgres abort with *"infinite recursion detected in policy"*. All cross-table checks go through the `SECURITY DEFINER` helpers `user_vehicle_role()` / `can_read_device()` (migration `0003`), which bypass RLS internally and break the cycle. Reach for those before writing a subquery in a new policy.

**Claim validation lives in Postgres, not in the route.** `claim_device` (migration `0002`) is a `SECURITY DEFINER` function that rate-limits, consumes the code and creates the vehicle in one transaction. It must stay there: users hold the anon key and can call `supabase.rpc()` directly, so any check implemented only in the Route Handler is bypassable. The function returns a result code (`OK` / `INVALID_CODE` / `RATE_LIMITED`) instead of raising — a `raise` would roll back the `claim_attempts` row and void the rate limit.

**Flespi token is server-only.** The `FLESPI_TOKEN` env var is used exclusively inside Next.js API Routes (`/api/*`). It must never be passed to the client.

**Repository Pattern.** All database operations go through repository classes (`VehicleRepository`, `CommandRepository`). This allows swapping Supabase for another PostgreSQL provider without touching business logic.

**Shared types via `packages/shared`.** Both `apps/web` and `apps/mobile` import types, Zod schemas, and utility functions from `packages/shared`. Never duplicate types between apps.

**Uniform API envelope.**
```typescript
type ApiResponse<T> = { data: T | null; error: string | null }
```
Every Route Handler returns this shape.

## API Routes Structure

```
/api/vehicles                         GET list (own + shared), POST claim (claim_code → vehicle)
/api/vehicles/:id                     GET detail, PATCH, DELETE
/api/vehicles/:id/users               GET members (owner only)
/api/vehicles/:id/users/:userId       PATCH role, DELETE revoke (owner only)
/api/vehicles/:id/invitations         GET pending, POST create → { invitation, url }
/api/vehicles/:id/invitations/:invId  DELETE revoke (owner only)
/api/invitations/:token               GET preview (vehicle alias + role)
/api/invitations/:token/accept        POST redeem
/api/vehicles/:id/status              GET — proxies Flespi latest message
/api/vehicles/:id/location            GET — proxies Flespi GPS position
/api/vehicles/:id/telemetry           GET — proxies Flespi latest message (dashboard field set)
/api/vehicles/:id/trips               GET — proxies Flespi trip CALCULATOR intervals
/api/vehicles/:id/events              GET — business events from vehicle_events (Supabase)
/api/vehicles/:id/commands            GET history (Supabase), POST send (Flespi)
/api/profile                          GET, PUT
/api/notifications/settings           GET, PUT
/api/webhooks/flespi                  POST — no JWT auth, validate with HMAC secret
```

Auth itself lives outside `/api`: `apps/web/app/auth/callback/route.ts` handles both email/password confirmation and Google OAuth via `exchangeCodeForSession`. It builds the `NextResponse.redirect(...)` first and writes Supabase session cookies directly onto that response object — `cookieStore.set()` from `next/headers` does **not** propagate to a redirect response, so session cookies would silently get dropped if written the "normal" way.

## Database (Supabase)

Core tables: `profiles`, `devices`, `vehicles`, `vehicle_users`, `invitations`, `command_logs`, `vehicle_events`, `notification_settings`, `claim_attempts`.

Row Level Security is enabled on all tables. Every query through the Supabase server client is automatically scoped to the authenticated user. Never bypass RLS with the service role key except in webhook handlers.

`devices` is the bridge to Flespi: it holds `imei` + `flespi_device_id` (bigint). `vehicles.device_id` is a FK to it — **`vehicles` does not store `flespi_device_id`** (removed in migration `0002`). Server code reaches the Flespi id via the join in `VEHICLE_SELECT` (`repositories/VehicleRepository.ts`), i.e. `vehicle.device.flespi_device_id`.

`devices` has no user-facing INSERT policy and only a narrow SELECT policy (a device is visible only through a vehicle the caller owns), so unclaimed devices cannot be enumerated. `claim_attempts` has RLS enabled with **no policies at all** — only the `claim_device` function touches it.

## Flespi Integration

- Latest telemetry: `GET /gw/devices/{flespi_device_id}/messages` with field filter
- Trips: `GET /gw/calcs/{FLESPI_TRIPS_CALC_ID}/devices/{id}/intervals/all` — a **trip calculator**, never raw `/messages` over a time range (that returns tens of thousands of raw points, times out, and isn't trips). `getTrips` returns `[]` when `FLESPI_TRIPS_CALC_ID` is unset so History degrades to "no trips" instead of erroring.
- Send command: `POST /gw/devices/{flespi_device_id}/commands` — the queued command's `id` is saved to `command_logs.flespi_command_id` so the webhook can correlate the ACK.
- Incoming events: Flespi → `POST /api/webhooks/flespi` (validate HMAC). The handler does exactly two things via the service client: confirm commands (`command_logs` → `confirmed`) and record typed business events into `vehicle_events`. Raw telemetry with no recognizable event type is ignored — **never persist telemetry**. `vehicle_events` is the deliberate exception: interpreted business facts (disconnect, low battery, ignition, geofence), not GPS data.
- All Flespi REST responses are validated with `FlespiEnvelopeSchema` (structure only — field names vary by protocol, so `transforms.ts` extracts each field defensively via `num()`/`bool()` candidate-key lookups).

## Client-Side Telemetry Polling

Web uses SWR with `refreshInterval: 10000` for map and dashboard screens. There is no WebSocket in v1 — polling is intentional to keep complexity low.

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # server-only, webhook handlers only

# Flespi
FLESPI_TOKEN=                # server-only, never NEXT_PUBLIC_
FLESPI_WEBHOOK_SECRET=       # HMAC validation for /api/webhooks/flespi

# App
NEXT_PUBLIC_APP_URL=
```

## Code Style

- **TypeScript strict mode** everywhere. No `any`.
- **Zod** for all external data validation (Flespi API responses, request bodies, webhook payloads).
- **ESLint** + **Prettier** — run `npm run lint` before committing.
- Errors bubble up as `{ data: null, error: "message" }` — no unhandled promise rejections in route handlers.
- Command buttons on the Security screen always show a confirmation dialog before calling the API.

## Scalability Path

The system is designed so that replacing services requires only swapping repository implementations or infrastructure, not business logic:

- Supabase DB → Neon or RDS: change connection string
- Vercel Functions → Lambda: move Route Handlers to Lambda handlers  
- Vercel Cron → EventBridge: extract cron logic to standalone Lambda
