# Sprint 2 — de MVP a producción

Objetivo: que un cliente real pueda usar vivancar (web + Android) sin intervención
manual nuestra, con el flujo completo funcionando contra producción.

Estado de partida (28-jul-2026): web desplegada en Vercel
(`security-car-web.vercel.app`) con Supabase + Flespi funcionando (mapa,
telemetría, viajes con ruta). Móvil corre en Expo Go (sin mapa, limitación de
Expo Go). Los comandos se envían pero **nunca se confirman** (webhook con
secreto placeholder). ~20 archivos de trabajo visual/fixes sin commitear.

El orden de los tracks importa: A desbloquea CI/CD, B es lo que de verdad
separa "demo" de "producción", C depende de credenciales que se crean en B.

---

## Track A — Higiene y cierre (½ día)

- [ ] Commitear el trabajo pendiente en commits separados: fix del proxy
      (assets públicos), iconos Lucide + sistema de elevación web, pulido
      móvil, spec del agente `vivancar-designer`.
- [x] `.vercelignore` en la raíz: el `.env` raíz (tokens reales) viajaba dentro
      del source del deployment de Vercel. Excluido junto con `Manual de
      maraca/` y artefactos locales. **Validar en el próximo deploy** que el
      build sigue funcionando y que `.env` ya no aparece en el source.
- [ ] Borrar el proyecto Vercel duplicado `securitycar` (vacío, creado por
      error; el real es `security-car-web`).
- [ ] Push a GitHub y **conectar el repo a Vercel** (Root Directory
      `apps/web`): cada push a `main` → producción, cada PR → preview. Se acaba
      el deploy manual por CLI.

## Track B — Producción de verdad (1–2 días)

- [ ] **Webhook Flespi real.** Generar secreto fuerte (32+ bytes aleatorios),
      reemplazar `placeholder-webhook-secret` en Vercel (prod y preview) y
      configurar en Flespi un stream/webhook → `POST
      https://<dominio>/api/webhooks/flespi` firmado HMAC-SHA256 (header
      `x-signature`). Verificar con un comando real que `command_logs` pasa a
      `confirmed` y que llegan eventos a `vehicle_events`. Ajustar
      `EVENT_TYPE_MAP` en `transforms.ts` al esquema real que emita Flespi.
- [ ] **Supabase Auth → URLs de producción.** Site URL = dominio real;
      Redirect URLs: `https://<dominio>/auth/callback`,
      `http://localhost:3000/auth/callback`, `vivancar://auth/callback`. Hoy
      los correos de confirmación/recuperación apuntan a localhost.
- [ ] **Dominio vivancar.** Agregar el dominio custom en Vercel, actualizar
      `NEXT_PUBLIC_APP_URL`, re-verificar webhook y Supabase URLs con el
      dominio final. (Pendiente del usuario: decidir subdominio, p. ej.
      `app.vivancar.cl`.)
- [ ] Verificación estática completa antes del corte: `npm run lint`,
      `npm run typecheck`, `next build`, `expo export` (ver DEPLOY.md).

## Track C — Móvil listo para usuarios (2–3 días, requiere B)

- [ ] **`eas.json` + development build Android.** Expo Go no renderiza
      `react-native-maps` (sin Google Maps key) ni el módulo de Google
      Sign-In. El dev build local por Gradle falló en Windows (NDK/libc++), así
      que la vía es EAS en la nube. Probar en el S22.
- [ ] **Google Maps API key** para Android en `app.json`
      (`android.config.googleMaps.apiKey`) — sin esto el mapa sigue gris
      incluso en dev build.
- [ ] **Google Sign-In Android.** Client ID Android en Google Console
      (package `com.vivancar.app` + SHA-1 de `npx eas credentials`), añadirlo a
      *Authorized Client IDs* en Supabase, y `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
      en el `.env` del build.
- [ ] **Portar la ruta del viaje al móvil.** El endpoint
      `GET /api/vehicles/:id/trips/path` ya existe; en `history.tsx` falta el
      acordeón + `<Polyline>` de `react-native-maps` (equivalente al
      `TripRouteMap` web).
- [ ] `EXPO_PUBLIC_API_URL` → dominio de producción; build `preview` (APK)
      para distribución interna.

## Track D — Calidad y confianza (1–2 días, en paralelo)

- [ ] **Tests de lo crítico** (hoy `npm run test` es NO-OP). Prioridad por
      riesgo: `transforms.ts` (num/bool/toTrip/parseWebhookRecord — es lo que
      más se ajusta a mano), validación HMAC del webhook, `safeNext` del proxy.
      Vitest en `apps/web`, task `test` en turbo.
- [ ] Correr `docs/qa-mvp.md` completo contra producción con los dos isuzu
      (claim con código nuevo → mapa → viajes → bloqueo/desbloqueo real →
      confirmación webhook → invitar/revocar → login web y móvil).
- [ ] Post-deploy: revisar `vercel logs --level error` tras cada corte; dejar
      anotado en DEPLOY.md cómo se consulta.

## Track E — Visual "minimalista moderno" (cierre)

Hecho en este sprint: iconografía Lucide unificada (web + móvil), sistema de
elevación y micro-interacciones (hover/press/focus), `VehicleSwitcher` custom,
tarjeta de mapa con blur, spec `vivancar-designer` corregido contra el código.

- [x] Dashboard: `Stat` con iconos Lucide (no emoji), valores con
      `tabular-nums`.
- [x] `EmptyState`: icono Lucide + texto corregido (decía "ID de dispositivo
      Flespi"; el flujo real es código de activación).
- [x] Seguridad web: `CommandButton` con icono Lucide tipado (no string
      emoji), banner de advertencia con `TriangleAlert`.
- [x] Estados de carga: componente `Skeleton` (pulse) aplicado en
      Dashboard/Historial en vez de "Cargando…".
- [x] Marcador de mapa custom (web): ya existía (`.vehicle-marker` en
      globals.css — punto verde, borde blanco, halo accent). Sin trabajo.
- [ ] Favicon/metadata del sitio con el isotipo vivancar (hoy usa el favicon
      por defecto).
- [ ] Verificación visual en producción tras el próximo deploy (web) y en el
      dev build EAS (móvil).

---

## Fuera de alcance (Sprint 3+)

Notificaciones push, geocercas configurables por el usuario, historial > 7
días con selector de rango, tema claro, iOS (requiere cuenta Apple Developer),
multi-idioma.

## Definición de "hecho" del sprint

Un usuario nuevo con un código de activación puede: registrarse en el dominio
real (correo de confirmación funciona), reclamar su vehículo, verlo en el mapa
web y en el APK Android, ver sus viajes con ruta en ambas plataformas, bloquear
y desbloquear el motor **y ver la confirmación** — sin que nosotros toquemos
nada por detrás.
