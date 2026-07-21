-- Securitycar — 0005: soft-delete de vehículos
--
-- `command_logs` cuelga de `vehicles` con `on delete cascade`: un borrado real
-- destruiría la auditoría de bloqueos/desbloqueos de motor. En un producto de
-- seguridad eso es justo lo que no puede perderse. El borrado pasa a marcar
-- `deleted_at`; el vehículo desaparece de la app pero su historial sobrevive.

alter table vehicles add column if not exists deleted_at timestamptz;

-- El unique original sobre device_id (de 0002) impediría re-vincular un equipo
-- reprovisionado a un vehículo nuevo si el anterior quedó soft-deleted. Se
-- sustituye por un índice único PARCIAL: un dispositivo solo puede estar en un
-- vehículo ACTIVO, pero los vehículos borrados no bloquean el equipo.
alter table vehicles drop constraint if exists vehicles_device_id_key;
create unique index if not exists vehicles_device_active_uidx
  on vehicles (device_id) where deleted_at is null;
