# Deploy — vivancar

The web app (`apps/web`) deploys to Vercel. The mobile app (`apps/mobile`) is built separately with EAS and talks to the deployed web API.

## Vercel setup (web)

This is an npm-workspaces monorepo. The Next.js app lives in `apps/web`, so Vercel's **Root Directory must be `apps/web`**. `apps/web/vercel.json` already scopes the install to `apps/web` + `packages/shared` (so the heavy mobile/React Native deps are skipped).

### One-time

```bash
# 1. Authenticate (interactive — run it yourself in the prompt)
!vercel login

# 2. Link the project. Run from the REPO ROOT so Vercel detects the monorepo.
#    When asked "In which directory is your code located?", answer: apps/web
vercel link
```

Linking with Root Directory = `apps/web` also auto-enables "Include files outside the Root Directory", so `packages/shared` is bundled.

### Environment variables

Set these in Vercel (Project → Settings → Environment Variables), or push them all at once:

```bash
# Fill scripts/.env.vercel with real values (gitignored), then:
bash scripts/vercel-push-env.sh production
bash scripts/vercel-push-env.sh preview
```

| Variable | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** | webhook handler only — bypasses RLS |
| `FLESPI_TOKEN` | **secret** | server-only; never `NEXT_PUBLIC_` |
| `FLESPI_WEBHOOK_SECRET` | **secret** | HMAC validation for `/api/webhooks/flespi` |
| `NEXT_PUBLIC_APP_URL` | public | the deployed URL |

### Deploy

```bash
vercel deploy            # preview deployment
vercel deploy --prod     # production
```

### Continuous deployment (recommended)

Push the repo to GitHub and import it in the Vercel dashboard (Root Directory = `apps/web`). Every push → preview deployment; merges to the default branch → production. No `vercel.json` changes needed.

## Database

Before the first deploy, run `apps/web/supabase/migrations/0001_init.sql` in the Supabase SQL editor (creates tables + RLS + the profile trigger).

## Mobile (EAS)

Point the app at the deployed API and build:

```bash
# apps/mobile/.env
EXPO_PUBLIC_API_URL=https://<your-app>.vercel.app
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

```bash
cd apps/mobile
npx eas-cli login
npx eas build:configure
npx eas build --platform android --profile preview
```
