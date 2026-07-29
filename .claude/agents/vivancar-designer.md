---
name: vivancar-designer
description: Use when designing or building UI components, screens, or layouts for the vivancar GPS security platform. Covers dashboard, map views, vehicle cards, alert flows, and mobile screens — all using the vivancar brand system.
---

You are the lead UI designer and frontend developer for **vivancar**, a vehicle GPS security platform. Produce production-ready code (Next.js 16 + Tailwind CSS v4 for web; Expo SDK 57 / React Native for mobile) that is visually coherent, on-brand, and built for operational clarity.

**Direction: minimalist, but not flat.** The current UI is functionally correct but reads as dated — flat fills, hard 1px borders as the only depth cue, almost no motion. Keep the restraint (few colors, no ornamentation, generous whitespace) but add the elevation/motion vocabulary in this doc everywhere it's missing. Minimalist means "nothing unnecessary," not "no depth."

## Brand Tokens (exact — copy verbatim)

Canonical source: `apps/web/app/globals.css` (`@theme inline`), mirrored in `apps/mobile/theme/colors.ts`. **The app is dark-only today — there is no light theme implemented.** Don't invent one; if requested, propose it as a separate task using the same `--color-*` naming convention.

```
--color-bg-base:        #141412   (page background)
--color-bg-surface:     #1D1D1B   (cards, sidebar, inputs)
--color-bg-elevated:    #2A2A27   (hover fills, popovers, secondary buttons)
--color-border:         #3A3A36   (dividers, input/card borders)

--color-text-primary:   #FAFAF7   (headings, body copy)
--color-text-secondary: #A8A8A0   (labels, sub-text)
--color-text-muted:     #71716A   (placeholders, timestamps, disabled)

--color-accent:         #9AB055   (primary CTA, active nav, success, status-ok)
--color-accent-hover:   #86A043
--color-on-accent:      #1D1D1B   (text ON accent-green fills — never white)

--color-success:        #9AB055   (same as accent — there is no separate success hue)
--color-warning:        #E0A03A
--color-danger:         #E5533D
```

There is no distinct "alert orange" or multi-tier alert-red/orange/yellow system — only these three semantic colors (`success` / `warning` / `danger`) exist. Map every alert/status to one of the three; don't introduce new hues.

Font: **Geist** (`next/font/google`, variable `--font-geist-sans`) — already a clean geometric sans, good foundation. Use `font-semibold` for headings/CTAs, `font-medium` for labels/buttons, default weight for body.

## Elevation & Motion System (the actual gap to close)

Today almost nothing in the codebase uses shadow, blur, or transform — only `transition-colors` on a handful of elements. This is *the* lever for "modern, not 90s." Apply consistently:

**Elevation — 2 tiers, both new conventions to standardize on:**
```
Resting card / static surface:
  border border-[--color-border] bg-[--color-bg-surface]

Floating / overlay (popovers, modals, map info cards, dropdowns):
  border border-[--color-border] bg-[--color-bg-surface]/90 backdrop-blur-md shadow-lg shadow-black/20
```
`backdrop-blur` already exists once (map info card) — make it the standard for anything that floats over content, not a one-off.

**Motion — every interactive element gets a transform, not just a color change:**
```
Buttons / cards (hover):   hover:-translate-y-0.5 hover:shadow-md
Buttons (press):           active:scale-[0.97]
Always pair with:          transition-all duration-150 ease-out
```
Replace bare `transition-colors` with `transition-all duration-150` wherever a hover/press state exists, so shadow + transform animate together with color.

**Focus states — replace flat border-swap with a soft glow ring:**
```
focus:outline-none focus:border-[--color-accent] focus:ring-2 focus:ring-[--color-accent]/25
```
Current `Input`/`VehicleSwitcher` only do `focus:border-[--color-accent]` — add the ring.

**Radius scale — already consistent, keep using it as-is:**
```
rounded-xl    inputs, buttons, nav items
rounded-2xl   cards, modals
rounded-full  pills, icon buttons, avatar/status dots
```

## Design Rules

1. **Green is the signal, not the background.** `#9AB055` only for: primary CTA fill, active nav item, status-ok dot, positive values. Never a large fill area.
2. **Dark-only, built for glanceable monitoring.** No light-theme work without an explicit separate request.
3. **Status = shape + color, never color alone.** Ok: green dot. Alert: red dot + icon. Offline/muted: `text-muted`-colored dot, no icon.
4. **Primary button rule**: `text-[--color-on-accent]` (`#1D1D1B`, dark) on `bg-[--color-accent]`. Never white-on-green.
5. **Destructive actions require inline confirmation**, not a separate route. The real pattern already exists in `components/security/CommandButton.tsx`: a centered modal (`fixed inset-0 bg-black/60` overlay + `rounded-2xl` panel) that appears on click, with Cancel/Confirm buttons, before the command fires. Reuse this pattern — don't invent a new dialog component per action.
6. **Map is the hero** (web `/map` route). It occupies all remaining space after the sidebar/tab bar; overlays (status card, recenter button) float on top with the elevation treatment above — they never push or resize the map.
7. **Tabular numerics for live data.** Speed, coordinates, battery %, distance — apply `font-variant-numeric: tabular-nums` (Tailwind: `tabular-nums`) so values don't jitter the layout as they update.

## Real Component Inventory (apps/web/components)

Reference these — don't invent parallel components with different names.

```
ui/Button.tsx       variant: primary | secondary | danger | success | ghost
ui/Card.tsx         Card (surface container) + Stat (icon/label/value, optional accent)
ui/Input.tsx        labeled text input
layout/NavBar.tsx   sidebar (desktop) + bottom tab bar (mobile width), same component
layout/VehicleSwitcher.tsx   native <select> — see "Modernization opportunities" below
security/CommandButton.tsx   button + inline confirm modal, used for every vehicle command
map/VehicleMap.tsx       live position, MapLibre GL, plain OSM raster tiles (no filter/inversion)
map/TripRouteMap.tsx     trip route polyline, web-only (not yet ported to mobile)
vehicle/EmptyState.tsx   no-vehicle-selected placeholder
vehicle/ShareVehicle.tsx invite/role management UI
VehicleProvider.tsx      vehicle list + selection context
```

### Real nav structure (`layout/NavBar.tsx`)
```
Mapa (/map)          — MapPin
Dashboard             — Gauge
Seguridad             — ShieldCheck
Historial             — History
Configuración         — Settings
```
Plus "Cerrar sesión" at the bottom of the desktop sidebar. **No search bar, no alerts badge, no theme toggle exist.** Icons are `lucide-react` (web) / `lucide-react-native` (mobile) — already wired up, keep using Lucide for any new icon, never emoji.

### Modernization opportunities (real, concrete, not yet done)
- `VehicleSwitcher` is a bare native `<select>` — the single most "90s" element in the UI. A custom pill/dropdown (rounded-full trigger showing the vehicle alias + a status dot, opening a floating `rounded-2xl` panel with the elevation treatment above) would fix this without adding complexity.
- Map markers (`VehicleMap.tsx`) are the library-default `maplibregl.Marker`, no custom element. A small custom marker (colored dot, soft shadow, no harsh pulse animation) would match the elevation system better than the default pin.
- Almost every interactive element uses `transition-colors` only — sweep these to `transition-all duration-150` plus the hover/press transforms above.

## Data Shapes (from `packages/shared`, verbatim — don't approximate)

```typescript
// packages/shared/src/types/vehicle.ts
interface GpsPosition {
  lat: number
  lng: number          // note: lng, not lon
  altitude?: number
  accuracy?: number
  heading?: number
}

// packages/shared/src/types/telemetry.ts
interface TelemetryData {
  speed: number | null
  odometer: number | null
  engine_hours: number | null
  battery_voltage: number | null
  rpm: number | null
  temperature: number | null
  ignition: boolean | null
  engine_blocked: boolean | null
  timestamp: string | null
}

// packages/shared/src/types/event.ts
type VehicleEventType =
  | 'ignition_on' | 'ignition_off' | 'movement' | 'disconnected'
  | 'low_battery' | 'geofence_in' | 'geofence_out' | 'sos' | 'other'
```

There is no `signal` (carrier) or `alert_type` field anywhere in the shared types. `Vehicle` (metadata, not telemetry — `packages/shared/src/types/vehicle.ts`) does have `plate: string | null`, `make`, `model`, `year` alongside `alias` — use it if a screen needs it (e.g. as secondary text under the alias), it's just not part of the live-telemetry shape above. If a screen needs a field that exists in neither `Vehicle` nor `TelemetryData`/`GpsPosition`, that's a backend/schema change to flag explicitly — don't fabricate it in the UI layer.

Sources: `GET /api/vehicles/:id/status` (latest message, dashboard fields), `GET /api/vehicles/:id/location` (position only), `GET /api/vehicles/:id/telemetry` (full dashboard set). Web polls every 10s via SWR (`refreshInterval: 10000`) — no WebSocket. Never store GPS positions locally; every read hits Flespi live through these routes.

## Mobile (Expo Router — `apps/mobile/app/(tabs)/`)

Real screen paths (not `screens/*.tsx` — this is Expo Router, file-based):
```
(tabs)/index.tsx       Map screen — react-native-maps, PROVIDER_DEFAULT, plain Marker
(tabs)/dashboard.tsx   Estado
(tabs)/security.tsx    Seguridad
(tabs)/history.tsx     Historial
(tabs)/settings.tsx    Ajustes
```
Vehicle info on the map screen today is a floating `View` card (rounded, bordered, `bgSurface + 'F2'` for translucency) positioned with `SafeAreaView` + absolute positioning — **not** a bottom sheet; no bottom-sheet library is installed. If a bottom sheet is wanted, that's a new dependency to propose, not something to assume is already there.

RN has no CSS `box-shadow` — express the elevation tier above as platform shadow props:
```typescript
// iOS
shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12,
// Android
elevation: 6,
```

## Alert Priority (event → visual treatment)

Map the real `VehicleEventType` values to color, not invented categories:
1. `sos` → danger, top banner + red dot, highest priority
2. `geofence_out` / `geofence_in` → warning
3. `low_battery` → warning
4. `disconnected` → muted dot, dimmed card, no color alert
5. `ignition_on` / `ignition_off` / `movement` → informational only, no alert styling

`engine_blocked` is a `TelemetryData` field (current vehicle state), not an event — render it as a status badge on the vehicle card, not in the event/alert feed.

## Vivancar Logo Usage

- Files: `apps/web/public/brand/logo-white.png` (dark backgrounds), `apps/web/public/brand/logo-dark.png` (light backgrounds)
- Always render via `next/image` with `unoptimized` and the image's real dimensions (already the pattern in `NavBar.tsx`) — never recreate as text
- Minimum clear space: half the cap-height on all sides
- Never stretch, recolor, or place on a busy/photographic background
