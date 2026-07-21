-- Securitycar — 0004: eventos de negocio + confirmación de comandos
--
-- Sigue valiendo la regla de "no almacenar telemetría": aquí NO se guardan
-- posiciones ni mensajes crudos. `vehicle_events` guarda HECHOS de negocio ya
-- interpretados (desconexión, batería baja, ignición, geocerca) que llegan por
-- webhook — son el insumo de las notificaciones y el usuario reclama sobre
-- ellos ("¿cuándo me avisaron?"). La retención de mensajes en Flespi es finita;
-- estos hechos deben sobrevivir a esa ventana.

-- ─── command_logs: correlación con Flespi ──────────────────
-- El id que Flespi asigna al comando encolado. Permite que el webhook case el
-- ACK del dispositivo con la fila correcta y la pase a 'confirmed'. El estado
-- 'confirmed' ya existía en el check de 0001, pero nunca se escribía.
alter table command_logs add column if not exists flespi_command_id bigint;
create index if not exists command_logs_flespi_cmd_idx
  on command_logs (flespi_command_id)
  where flespi_command_id is not null;

-- ─── vehicle_events ────────────────────────────────────────
create table if not exists vehicle_events (
  id                uuid primary key default gen_random_uuid(),
  vehicle_id        uuid not null references vehicles on delete cascade,
  event_type        text not null,
  occurred_at       timestamptz not null,
  payload           jsonb,
  -- Idempotencia: Flespi puede reintentar el webhook. Cuando el evento trae un
  -- id estable, un unique impide duplicar la misma alerta.
  flespi_event_id   text,
  created_at        timestamptz not null default now(),
  unique (vehicle_id, flespi_event_id)
);
create index if not exists vehicle_events_vehicle_idx
  on vehicle_events (vehicle_id, occurred_at desc);

alter table vehicle_events enable row level security;

-- Lectura para cualquiera con acceso al vehículo (dueño o compartido). La
-- escritura no tiene política: solo el service client del webhook inserta.
drop policy if exists "vehicle_events read" on vehicle_events;
create policy "vehicle_events read" on vehicle_events for select
  using (public.user_vehicle_role(vehicle_id) is not null);
