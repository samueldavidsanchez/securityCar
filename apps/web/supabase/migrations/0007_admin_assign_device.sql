-- Securitycar — 0007: asignación directa de dispositivos por admin
--
-- El flujo normal sigue siendo autoservicio: el admin provisiona un
-- dispositivo (0006, panel admin) y el CLIENTE lo reclama con `claim_device`,
-- que toma la identidad de auth.uid() — por eso `claim_device` nunca pudo
-- usarse para asignarle un vehículo a OTRO usuario.
--
-- Para casos donde el cliente no puede/no necesita canjear el código él mismo
-- (instalación en concesionario, alta B2B, cliente sin la app todavía), el
-- admin necesita poder crear el vehículo directamente a nombre de un usuario
-- elegido. `p_owner_id` es un parámetro (no auth.uid()) a propósito — por eso
-- el único gate de esta función es `is_admin()`, comprobado DENTRO del cuerpo:
-- al ser SECURITY DEFINER bypassa RLS por completo, así que la política no
-- puede protegerla — la protección vive aquí.

create or replace function public.admin_assign_device(
  p_device_id uuid,
  p_owner_id  uuid,
  p_alias     text,
  p_plate     text default null,
  p_make      text default null,
  p_model     text default null,
  p_year      int  default null
)
returns table (result text, vehicle_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device  devices%rowtype;
  v_vehicle uuid;
begin
  if not public.is_admin() then
    return query select 'UNAUTHORIZED'::text, null::uuid;
    return;
  end if;

  if not exists (select 1 from auth.users where id = p_owner_id) then
    return query select 'USER_NOT_FOUND'::text, null::uuid;
    return;
  end if;

  -- Consumo atómico: mismo patrón que `claim_device` (0002). El WHERE sobre
  -- status impide que dos asignaciones simultáneas ganen el mismo device.
  update devices
     set status     = 'active',
         claimed_by = p_owner_id,
         claimed_at = now(),
         claim_code = null
   where id = p_device_id
     and status = 'provisioned'
  returning * into v_device;

  if v_device.id is null then
    return query select 'DEVICE_UNAVAILABLE'::text, null::uuid;
    return;
  end if;

  insert into vehicles (owner_id, device_id, alias, plate, make, model, year)
  values (p_owner_id, v_device.id, p_alias, p_plate, p_make, p_model, p_year)
  returning id into v_vehicle;

  return query select 'OK'::text, v_vehicle;
end;
$$;

revoke all on function public.admin_assign_device(uuid, uuid, text, text, text, text, int) from public;
grant execute on function public.admin_assign_device(uuid, uuid, text, text, text, text, int) to authenticated;
