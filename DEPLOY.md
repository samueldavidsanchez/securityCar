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
| `FLESPI_TRIPS_CALC_ID` | server | id del calculator de trips (ver abajo). Opcional: sin él, no hay historial de viajes |
| `NEXT_PUBLIC_APP_URL` | public | the deployed URL |

### Flespi: calculator de viajes y webhook

- **Trips.** Crea en el panel de Flespi un *calculator* de tipo trip/intervals y asígnalo a los dispositivos. Copia su id en `FLESPI_TRIPS_CALC_ID`. El código consulta sus `intervals`, no los mensajes crudos.
- **Webhook.** Configura un webhook/stream en Flespi que apunte a `POST https://<app>/api/webhooks/flespi`, firmado con HMAC-SHA256 usando `FLESPI_WEBHOOK_SECRET` (cabecera `x-signature`). Envía dos clases de payload: confirmaciones de comando (con `command.id`) y eventos tipados (`event.type`: ignición, desconexión, batería baja, geocerca). Los nombres de campo se mapean en `apps/web/lib/flespi/transforms.ts` (`parseWebhookRecord`, `EVENT_TYPE_MAP`) — ajústalos al esquema real que emita tu configuración de Flespi.

### Deploy

```bash
vercel deploy            # preview deployment
vercel deploy --prod     # production
```

### Continuous deployment (recommended)

Push the repo to GitHub and import it in the Vercel dashboard (Root Directory = `apps/web`). Every push → preview deployment; merges to the default branch → production. No `vercel.json` changes needed.

## Database

Before the first deploy, run the migrations in `apps/web/supabase/migrations/` **in order** in the Supabase SQL editor:

| Migración | Qué hace |
|---|---|
| `0001_init.sql` | Tablas base + RLS + trigger de perfil |
| `0002_devices.sql` | Tabla `devices`, flujo de claim, función `claim_device`. Migra `vehicles.flespi_device_id` → `vehicles.device_id` |
| `0003_sharing.sql` | `vehicle_permissions` → `vehicle_users` con roles owner/driver/viewer, políticas RLS reales, invitaciones |
| `0004_events.sql` | `vehicle_events` (hechos de negocio), `command_logs.flespi_command_id` para confirmar comandos por webhook |
| `0005_soft_delete.sql` | `vehicles.deleted_at` (soft-delete para preservar la auditoría), índice único parcial sobre `device_id` |

`0002` hace backfill de los vehículos existentes creando un `device` por cada uno con IMEI provisional `MIGRATED-<flespi_id>`. Si ya tenías vehículos en producción, corrige esos IMEI a mano después de migrar.

## Aprovisionar equipos GPS

Un cliente no puede dar de alta un vehículo hasta que su equipo esté provisionado: el alta se hace con un código de activación de un solo uso, no con el IMEI ni el ID de Flespi.

```bash
# El equipo debe estar ya dado de alta en el panel de Flespi (ident = IMEI)
export NEXT_PUBLIC_SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...   # server-only
export FLESPI_TOKEN=...

node scripts/provision-device.mjs --imei 864895030123456
# → imprime el código (p. ej. AB3D-9XKF) para entregar al cliente
```

Si ya conoces el device id de Flespi, sáltate la búsqueda con `--flespi-id 123456`. Opcionalmente `--iccid` para registrar la SIM.

## Mobile (EAS)

Point the app at the deployed API and build:

```bash
# apps/mobile/.env
EXPO_PUBLIC_API_URL=https://<your-app>.vercel.app
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...   # opcional, ver abajo
```

```bash
cd apps/mobile
npx eas-cli login
npx eas build:configure
npx eas build --platform android --profile preview
```

### Google Sign-In en móvil

El login con Google usa el SDK nativo (`signInWithIdToken`), no el flujo OAuth
por navegador. Ventaja: no hay redirect URIs ni deep links que configurar.
Coste: **el módulo nativo no existe en Expo Go**, así que a partir de ahora hay
que probar con un development build:

```bash
npx eas build --profile development --platform android
```

Si `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` no está definido, el botón simplemente no
aparece y el login por correo sigue funcionando — puedes dejar esto para después.

**Configuración (una vez):**

1. **Google Cloud Console** → Credentials. El client **Web** ya existe (lo usa
   Supabase). Crea además:
   - **Android**: package name `com.vivancar.app` + el SHA-1 del keystore.
     Obtén el SHA-1 con `npx eas credentials` (plataforma Android) — es el de
     EAS, **no** el de tu debug local. Un SHA-1 que no coincide es la causa
     número uno de `DEVELOPER_ERROR`.
   - **iOS**: bundle identifier `com.vivancar.app`.
2. **`.env`**: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` = el client ID **Web**
   (el de Android no se pone en ningún sitio del código).
3. **Supabase** → Auth → Providers → Google → *Authorized Client IDs*: añade
   los client IDs de Android e iOS. Sin esto Supabase rechaza el `id_token`
   que emiten esas apps.
4. **Solo iOS**: añade el URL scheme invertido al config plugin en `app.json`:
   ```json
   ["@react-native-google-signin/google-signin",
    { "iosUrlScheme": "com.googleusercontent.apps.<TU_ID_INVERTIDO>" }]
   ```

---

## Runbook de lanzamiento (orden completo)

Secuencia de extremo a extremo para el primer despliegue a producción. Cada paso
enlaza con la sección de arriba que lo detalla. **No saltes el orden**: el
esquema (paso 2) es prerrequisito de todo lo demás.

### Fase A — Base de datos y credenciales

1. **Proyecto Supabase de producción** creado. Copia URL, anon key y
   service-role key (Project → Settings → API).
2. **Migraciones** `0001`→`0005` ejecutadas **en orden** en el SQL editor
   (sección *Database*). Verifica que ninguna aborta con
   *"infinite recursion detected in policy"* (riesgo de `0003`).
3. **Supabase → Auth → URL Configuration**: `Site URL` = dominio de producción;
   en *Redirect URLs* añade `https://<app>.vercel.app/auth/callback`,
   `http://localhost:3000/auth/callback` y `vivancar://auth/callback`.
4. **Supabase → Auth → Providers → Google**: client ID/secret Web; en
   *Authorized Client IDs* los IDs de Android/iOS (para el login móvil).

### Fase B — Flespi

5. **Calculator de trips** creado y asignado a los dispositivos. Guarda su id.
6. **Webhook** apuntando a `https://<app>.vercel.app/api/webhooks/flespi`,
   firmado HMAC-SHA256 con el mismo valor que pondrás en `FLESPI_WEBHOOK_SECRET`.

### Fase C — Despliegue web

7. `vercel link` desde la raíz (Root Directory = `apps/web`).
8. `cp scripts/.env.vercel.example scripts/.env.vercel`, rellena valores reales
   (incluido `FLESPI_TRIPS_CALC_ID` del paso 5), y empuja:
   ```bash
   bash scripts/vercel-push-env.sh production
   bash scripts/vercel-push-env.sh preview
   ```
9. `vercel deploy --prod`.

### Fase D — Primeros equipos

10. Da de alta cada GPS en Flespi (ident = IMEI), luego
    `node scripts/provision-device.mjs --imei <IMEI>` y entrega el código.

### Fase E — Móvil

11. `apps/mobile/.env` con `EXPO_PUBLIC_API_URL` = dominio de producción y las
    claves públicas de Supabase.
12. `npx eas build --platform android --profile preview` (o `development` para
    probar el login de Google).

### Fase F — Smoke test

13. Recorre `docs/qa-mvp.md` con un GPS físico: claim → señal en el mapa →
    bloqueo/desbloqueo real → confirmación (`confirmed` en el historial) →
    invitar/revocar → login web y móvil.

### Verificación estática antes de desplegar

Cobertura por paquete (cada uno se valida por su vía, no todos con el mismo
comando): web con `lint` + `next build`; shared y mobile con `typecheck`; el
bundle móvil real con `expo export`.

```bash
npm run lint && npm run typecheck          # raíz (turbo): lint→web, typecheck→shared+mobile
cd apps/web && npx next build              # typecheck + build de web
cd apps/mobile && npx expo export --platform android
```
