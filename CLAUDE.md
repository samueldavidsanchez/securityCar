# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Securitycar is a serverless vehicle security and monitoring platform (think Tesla app / Apple Find My). Users track one or a few vehicles in real time, view telemetry, and send security commands (engine block/unblock). It is **not** a fleet management system.

**Flespi is the single source of truth for all telemetry.** GPS positions, events, and parameters are never stored locally — they are queried on demand from the Flespi API. Only user/vehicle metadata lives in Supabase.

## Stack

| Layer | Technology |
|---|---|
| Web frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS |
| Mobile | Expo (SDK 51+), React Native, TypeScript, Expo Router |
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
```

## Next.js 16 conventions (IMPORTANT — differs from older Next.js)

The web app runs **Next.js 16 with Turbopack**. Breaking changes that affect how code must be written here:

- **`middleware.ts` → `proxy.ts`.** Route protection lives in `apps/web/proxy.ts`, exporting a `proxy(request)` function (Node.js runtime, not edge). The matcher excludes static assets and `/api/webhooks`. `/api/*` routes are NOT redirected by the proxy — they enforce auth themselves and return JSON 401s.
- **Async request APIs.** `params`, `cookies()`, `headers()`, `searchParams` are all Promises — always `await` them. Route handlers use the generated `RouteContext<'/api/...'>` helper: `async function GET(req, ctx: RouteContext<'/api/vehicles/[id]'>) { const { id } = await ctx.params }`.
- **`next lint` removed.** Lint with `eslint` directly (`npm run lint` → `eslint`). Run `npx next typegen` to regenerate route types after adding/renaming routes.
- **React Compiler purity rules are enforced by ESLint.** No `Date.now()` / `Math.random()` in render (use the `useNow` hook), and no synchronous `setState` in effects that derives from props/state (derive during render with `useMemo` instead — see `VehicleProvider`).
- **Tailwind v4** (CSS-first). Theme tokens are defined in `app/globals.css` under `@theme`; there is no `tailwind.config.js`.

## Mobile app (Expo SDK 57)

`apps/mobile` is an Expo Router app (React Native 0.86, React 19). It reuses the web's API and the `@securitycar/shared` package — screens mirror the web one-to-one (Map, Dashboard, Security, History, Settings) via a bottom tab bar.

- **Auth transport differs from web.** The web authenticates API routes via session cookies; mobile sends `Authorization: Bearer <supabase access_token>`. Both are handled by `getAuthContext(request)` in `apps/web/lib/api/auth.ts` — when a Bearer token is present it builds a Supabase client with that JWT so Postgres RLS still applies. Any new API route must use `getAuthContext(request)` (never the old cookie-only helper) to stay mobile-compatible.
- **Mobile calls the deployed web API.** `apps/mobile/lib/api.ts` targets `EXPO_PUBLIC_API_URL`. For the Android emulator that's `http://10.0.2.2:3000`; iOS simulator uses `localhost`; a physical device needs the LAN IP. Supabase auth happens directly in the app (`lib/supabase.ts`, session persisted in AsyncStorage).
- **`typedRoutes` is disabled.** Expo's typed-route generation crashes under npm workspace hoisting (`@expo/cli` hoists to root but `expo-router` stays in `apps/mobile`, breaking `expo-router/_ctx-shared` resolution). Routes use plain string `href`s. Don't re-enable `experiments.typedRoutes` without fixing the hoisting.
- **Metro monorepo config.** `apps/mobile/metro.config.js` watches the workspace root and adds root `node_modules` to `nodeModulesPaths` so the symlinked shared package bundles. Verify bundling with `npx expo export --platform android`, not just `tsc`.
- **Brand: vivancar.** Green `#9AB055` accent on near-black `#1D1D1B`. Web tokens live in `apps/web/app/globals.css` (`@theme`); mobile mirrors them in `apps/mobile/theme/colors.ts`. Primary buttons use dark text on green (like the logo). Logos are in `apps/web/public/brand/` and the source `Manual de maraca/`.

## Key Architectural Rules

**No telemetry storage.** Never write GPS positions, events, or Flespi messages to the database. Every telemetry request hits Flespi directly through the API layer.

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
/api/vehicles                         GET list, POST create
/api/vehicles/:id                     GET detail, DELETE
/api/vehicles/:id/status              GET — proxies Flespi latest message
/api/vehicles/:id/location            GET — proxies Flespi GPS position
/api/vehicles/:id/trips               GET — proxies Flespi trip calculator
/api/vehicles/:id/commands            GET history (Supabase), POST send (Flespi)
/api/profile                          GET, PUT
/api/notifications/settings           GET, PUT
/api/webhooks/flespi                  POST — no JWT auth, validate with HMAC secret
```

## Database (Supabase)

Core tables: `profiles`, `vehicles`, `vehicle_permissions`, `command_logs`, `notification_settings`.

Row Level Security is enabled on all tables. Every query through the Supabase server client is automatically scoped to the authenticated user. Never bypass RLS with the service role key except in webhook handlers.

`flespi_device_id` (bigint) on the `vehicles` table is the bridge between Supabase metadata and Flespi telemetry.

## Flespi Integration

- Latest telemetry: `GET /gw/devices/{flespi_device_id}/messages` with field filter
- Send command: `POST /gw/devices/{flespi_device_id}/commands`
- Incoming events: Flespi → `POST /api/webhooks/flespi` (validate HMAC)
- Transforms from raw Flespi message format to app types live in `apps/web/lib/flespi/transforms.ts`

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
