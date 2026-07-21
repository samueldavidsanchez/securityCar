# Checklist QA — MVP vivancar

Prueba manual de extremo a extremo antes de lanzar. Requiere: proyecto Supabase
con las migraciones `0001`–`0005` aplicadas, `apps/web/.env.local` con claves
reales, y un dispositivo provisionado con `scripts/provision-device.mjs`.

Marca cada punto al verificarlo. El orden importa: unos dependen de otros.

## 1. Autenticación (web)

- [ ] Registro con correo crea la cuenta y el perfil (trigger `handle_new_user`).
- [ ] Login con correo entra al mapa.
- [ ] Login con Google entra al mapa (ver configuración en DEPLOY.md).
- [ ] Cerrar sesión y volver a `/map` redirige a `/login`.
- [ ] Abrir `/map` sin sesión redirige a `/login?next=/map`; tras entrar, vuelve a `/map`.

## 2. Autenticación (móvil — requiere development build)

- [ ] Login con correo entra a las tabs.
- [ ] Login con Google entra a las tabs (o el botón no aparece si falta el client ID).
- [ ] Dejar la app en segundo plano > 1 h y volver: las llamadas siguen
      funcionando (no hay 401 por token caducado — refresh por AppState).

## 3. Alta de vehículo (claim)

- [ ] Con un código válido, "Agregar vehículo" crea el vehículo y aparece en la lista.
- [ ] El mismo código, usado por segunda vez, falla con "inválido o ya utilizado".
- [ ] Un código inexistente falla con el mismo mensaje (no distingue ambos casos).
- [ ] Enviar un `flespi_device_id` crudo al endpoint NO crea nada (el campo ya no existe).
- [ ] Un equipo sin señal muestra el aviso "aún no reporta señal".

## 4. Telemetría (Flespi)

- [ ] El mapa muestra la última posición del vehículo.
- [ ] El dashboard muestra velocidad, batería, ignición.
- [ ] El historial lista viajes (requiere `FLESPI_TRIPS_CALC_ID` y calculator asignado).
- [ ] Sin `FLESPI_TRIPS_CALC_ID`, el historial dice "sin viajes" y no rompe.

## 5. Comandos

- [ ] Bloquear motor pide confirmación y registra el comando como `sent`.
- [ ] Con webhook configurado, el comando pasa a `confirmed` al recibir el ACK.
- [ ] Enviar más de 10 comandos en un minuto devuelve 429.
- [ ] Un usuario con rol `viewer` no ve los botones de comando y el endpoint le da 403.

## 6. Compartir vehículo

- [ ] El propietario genera un enlace de invitación (rol viewer o driver).
- [ ] Otro usuario abre el enlace, ve la previsualización (alias + rol) y acepta.
- [ ] El vehículo aparece en la lista del invitado.
- [ ] Un invitado `driver` puede enviar comandos; un `viewer` no.
- [ ] El propietario ve en el historial de comandos los enviados por el invitado.
- [ ] El propietario revoca el acceso y el invitado deja de ver el vehículo.
- [ ] Una invitación caducada o ya usada falla al aceptar.

## 7. Eventos y webhook

- [ ] Un evento de Flespi (ignición, desconexión…) aparece en "Eventos recientes".
- [ ] El webhook rechaza payloads sin firma HMAC válida (401).
- [ ] Reenviar el mismo evento no lo duplica (idempotencia por `flespi_event_id`).

## 8. Borrado

- [ ] Eliminar un vehículo lo quita de la app…
- [ ] …pero su historial de comandos sigue en la base de datos (soft-delete).
- [ ] Un usuario compartido (no propietario) no ve el botón Eliminar y recibe 403.

## 9. Aislamiento (RLS)

- [ ] Un usuario no puede leer por API un vehículo que no es suyo ni compartido (404).
- [ ] Ninguna consulta falla con "infinite recursion detected in policy".
