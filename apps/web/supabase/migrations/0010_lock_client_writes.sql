-- Securitycar — 0010: cerrar escrituras directas por PostgREST
--
-- Cualquier usuario tiene la anon key y su propio JWT, así que puede llamar a
-- PostgREST sin pasar por las rutas de API. Varias políticas validaban solo la
-- FILA (auth.uid() = id/owner_id/user_id) y dejaban escribir CUALQUIER columna.
-- Hallazgos de la auditoría run-1 que esta migración cierra:
--
--   1. profiles.is_admin era escribible por el propio usuario → cualquiera se
--      volvía admin de plataforma (is_admin() confía en esa columna).
--   2. vehicles insert/update solo exigían owner_id: se podía crear un vehículo
--      con un device_id liberado sin pasar por claim_device, mover device_id o
--      revertir un soft-delete (incluido el que hace un admin).
--   3. vehicles delete seguía vivo desde 0003: un hard delete borraba en
--      cascada command_logs, justo lo que 0005 quería preservar.
--   4. command_logs update permitía reescribir vehicle_id/created_at/etc. de las
--      filas propias: ocultar un bloqueo de motor al dueño o saltarse el
--      rate limit de 10/min (que cuenta por created_at).
--
-- Patrón: revocar el privilegio de tabla y volver a darlo solo sobre las
-- columnas que la app de verdad escribe. Las funciones SECURITY DEFINER
-- (handle_new_user, claim_device, admin_assign_device) corren como owner y no
-- se ven afectadas por estos revokes.

-- ─── profiles ──────────────────────────────────────────────
revoke insert, update on public.profiles from anon, authenticated;
grant update (display_name, phone, avatar_url, preferences, updated_at)
  on public.profiles to authenticated;

-- Defensa en profundidad: aunque alguien vuelva a dar UPDATE de tabla por error,
-- is_admin solo cambia desde el SQL editor / service role.
create or replace function public.profiles_guard_is_admin()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon')
     and new.is_admin is distinct from (case when tg_op = 'UPDATE' then old.is_admin else false end)
  then
    raise exception 'is_admin no es editable por el usuario';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_is_admin on public.profiles;
create trigger profiles_guard_is_admin
  before insert or update on public.profiles
  for each row execute function public.profiles_guard_is_admin();

-- ─── vehicles ──────────────────────────────────────────────
-- Los vehículos solo nacen por claim_device o admin_assign_device.
drop policy if exists "vehicles insert" on vehicles;
drop policy if exists "vehicles delete" on vehicles;
revoke insert, delete on public.vehicles from anon, authenticated;

-- Solo metadata editable desde el cliente. device_id, owner_id y deleted_at
-- quedan fuera: la baja va por soft_delete_vehicle().
revoke update on public.vehicles from anon, authenticated;
grant update (alias, plate, make, model, year) on public.vehicles to authenticated;

drop policy if exists "vehicles update" on vehicles;
create policy "vehicles update" on vehicles for update
  using (auth.uid() = owner_id and deleted_at is null)
  with check (auth.uid() = owner_id and deleted_at is null);

-- Soft-delete (dueño o admin). Devuelve si marcó alguna fila. Es la única vía
-- para escribir deleted_at, y no permite revertirlo.
create or replace function public.soft_delete_vehicle(p_vehicle uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  update vehicles
     set deleted_at = now()
   where id = p_vehicle
     and deleted_at is null
     and (owner_id = auth.uid() or public.is_admin());
  return found;
end;
$$;

revoke all on function public.soft_delete_vehicle(uuid) from public;
grant execute on function public.soft_delete_vehicle(uuid) to authenticated;

-- ─── command_logs ──────────────────────────────────────────
-- El cliente inserta el intento ('pending') y luego marca el resultado. Nada
-- más: vehicle_id, command_type, payload y created_at quedan inmutables, y el
-- resultado solo se marca una vez (pending → sent/failed). La confirmación
-- (sent → confirmed) la hace el webhook con el service client.
revoke insert, update on public.command_logs from anon, authenticated;
grant insert (vehicle_id, user_id, command_type, payload, status)
  on public.command_logs to authenticated;
grant update (status, flespi_response, flespi_command_id)
  on public.command_logs to authenticated;

drop policy if exists "command_logs insert" on command_logs;
create policy "command_logs insert" on command_logs for insert
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and public.user_vehicle_role(vehicle_id) in ('owner', 'driver')
  );

drop policy if exists "command_logs update" on command_logs;
create policy "command_logs update" on command_logs for update
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status in ('sent', 'failed'));
