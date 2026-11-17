# Sprint 2 — de MVP a producción

Objetivo: que un cliente real pueda usar vivancar (web + Android) sin intervención
manual nuestra, con el flujo completo funcionando contra producción.

Estado de partida (28-jul-2026): web desplegada en Vercel
(`security-car-web.vercel.app`) con Supabase + Flespi funcionando (mapa,
telemetría, viajes con ruta). Móvil corre en Expo Go (sin mapa, limitación de
Expo Go). Los comandos se envían pero **nunca se confirman** (webhook con
secreto placeholder).

## Estado al 14-nov-2026

Todo el código del sprint está en `main` (PR #1 `feat/mvp-hardening`, PR #2
`feat/alertas-push`). Además entró trabajo que estaba fuera de alcance:
geocercas configurables + alertas push (encendido/geocerca), panel admin con
subdominio opcional, cierre de escrituras directas por PostgREST (migración
`0010`).

**Lo que falta es configuración de producción, no código.** En orden:

1. Confirmar que las migraciones `0009` y `0010` están aplicadas en Supabase
   (se aplican a mano en el SQL editor).
2. Secreto real del webhook Flespi (Track B) — sin esto los comandos nunca
   pasan a `confirmed`, que es el criterio central de "hecho".
3. Activar alertas push en producción (Track B).
4. Dominio vivancar + URLs de Supabase Auth (Track B).
5. QA completo contra producción (Track D).

El orden de los tracks importa: A desbloquea CI/CD, B es lo que de verdad
separa "demo" de "producción", C depende de credenciales que se crean en B.

---

## Track A — Higiene y cierre

- [x] Commitear el trabajo pendiente (proxy, iconos Lucide, elevación web,
      pulido móvil, spec `vivancar-designer`).
- [x] `.vercelignore` en la raíz: excluye el `.env` raíz, `Manual de marca/`,
      credenciales sueltas (`*.jks`, `client_secret_*.json`, …) y artefactos
      locales. Pendiente: **validar en un deploy** que `.env` ya no aparece en
      el source.
- [ ] **Borrar el proyecto Vercel duplicado `securitycar`.** Sigue vivo y,
      peor, conectado al repo: el merge del PR #2 (4-nov) generó un deploy de
      producción en `securitycar` además de en `security-car-web`. El real es
      `security-car-web`.
- [x] Repo en GitHub conectado a Vercel: push a `main` → producción, PR →
      preview.

## Track B — Producción de verdad

- [ ] **Webhook Flespi real.** Generar secreto fuerte (32+ bytes aleatorios),
      reemplazar `placeholder-webhook-secret` en Vercel (prod y preview) y
      configurar en Flespi un stream/webhook → `POST
      https://<dominio>/api/webhooks/flespi` firmado HMAC-SHA256 (header
      `x-signature`). Verificar con un comando real que `command_logs` pasa a
      `confirmed` y que llegan eventos a `vehicle_events`. Ajustar
      `EVENT_TYPE_MAP` en `transforms.ts` al esquema real que emita Flespi.
      (El `.env.local` de desarrollo todavía tiene el placeholder.)
- [ ] **Alertas push en producción** (código ya en `main`):
      - aplicar migraciones `0009_geofences_push` y `0010_lock_client_writes`;
      - generar `FLESPI_ALERTS_WEBHOOK_TOKEN` y correr
        `node scripts/setup-flespi-alerts.mjs --url https://<dominio>`;
      - cargar en Vercel `FLESPI_GEOFENCE_CALC_ID`, `FLESPI_IGNITION_CALC_ID`
        y `FLESPI_ALERTS_WEBHOOK_TOKEN` (sin ellas las geocercas se guardan
        pero nunca disparan);
      - `GOOGLE_SERVICES_JSON` como file env var en EAS (FCM) y rebuild del
        APK.
- [ ] **Supabase Auth → URLs de producción.** Site URL = dominio real;
      Redirect URLs: `https://<dominio>/auth/callback`,
      `http://localhost:3000/auth/callback`. Hoy los correos de
      confirmación/recuperación apuntan a localhost. (El móvil ya no necesita
      deep link: Google Sign-In es nativo con `signInWithIdToken`.)
- [ ] **Dominio vivancar.** Agregar el dominio custom en Vercel, actualizar
      `NEXT_PUBLIC_APP_URL`, re-verificar webhooks y Supabase URLs con el
      dominio final. Opcional: `ADMIN_HOST` para el panel admin. (Pendiente
      del usuario: decidir subdominio, p. ej. `app.vivancar.cl`.)
- [ ] Verificación estática completa antes del corte: `npm run lint`,
      `npm run typecheck`, `next build`, `expo export` (ver DEPLOY.md).

## Track C — Móvil listo para usuarios

- [x] `eas.json` + builds en la nube con EAS (el build local por Gradle
      fallaba en Windows).
- [x] Google Maps API key Android — leída por `app.config.js` desde
      `GOOGLE_MAPS_API_KEY_ANDROID`.
- [x] Google Sign-In Android nativo (`@react-native-google-signin`,
      web client ID en `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`).
- [x] Ruta del viaje en el móvil (`history.tsx` con `<Polyline>`).
- [x] Splash screen nativo y build de producción Android.
- [ ] `EXPO_PUBLIC_API_URL` → dominio final (hoy apunta a
      `security-car-web.vercel.app`; cambiar cuando exista el dominio vivancar)
      y nuevo build para distribución.

## Track D — Calidad y confianza

- [ ] **Tests de lo crítico** (hoy `npm run test` es NO-OP). Prioridad por
      riesgo: `transforms.ts` (num/bool/toTrip/parseWebhookRecord — es lo que
      más se ajusta a mano), validación HMAC del webhook, token del webhook de
      intervalos, `safeNext` del proxy. Vitest en `apps/web`, task `test` en
      turbo.
- [ ] Correr `docs/qa-mvp.md` completo contra producción con los dos isuzu
      (claim con código nuevo → mapa → viajes → bloqueo/desbloqueo real →
      confirmación webhook → invitar/revocar → geocerca + push → login web y
      móvil).
- [ ] Post-deploy: revisar `vercel logs --level error` tras cada corte; dejar
      anotado en DEPLOY.md cómo se consulta.

## Track E — Visual "minimalista moderno"

- [x] Iconografía Lucide unificada, sistema de elevación, `VehicleSwitcher`,
      tarjeta de mapa con blur, `Stat` con `tabular-nums`, `EmptyState`,
      `CommandButton`, `Skeleton`, marcador de mapa custom.
- [ ] Favicon/metadata del sitio con el isotipo vivancar
      (`apps/web/app/favicon.ico` sigue siendo el de Next.js por defecto;
      logos en `apps/web/public/brand/`).
- [ ] Verificación visual en producción (web) y en el APK (móvil).

---

## Fuera de alcance (Sprint 3+)

Historial > 7 días con selector de rango, tema claro, iOS (requiere cuenta
Apple Developer), multi-idioma.

(Notificaciones push y geocercas configurables estaban aquí y se adelantaron
al PR #2.)

## Definición de "hecho" del sprint

Un usuario nuevo con un código de activación puede: registrarse en el dominio
real (correo de confirmación funciona), reclamar su vehículo, verlo en el mapa
web y en el APK Android, ver sus viajes con ruta en ambas plataformas, bloquear
y desbloquear el motor **y ver la confirmación** — sin que nosotros toquemos
nada por detrás.
