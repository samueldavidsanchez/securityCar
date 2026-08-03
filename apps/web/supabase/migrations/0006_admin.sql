-- Securitycar — 0006: panel admin interno
--
-- No existía ningún rol de plataforma (staff/admin) — solo los roles por
-- vehículo (owner/driver/viewer) de vehicle_users. Soporte necesita ver y
-- gestionar vehículos/dispositivos/usuarios de TODOS los clientes.
--
-- Diseño: en vez de tocar user_vehicle_role()/can_read_device() (usadas
-- dentro de casi todas las políticas existentes), se agregan políticas RLS
-- NUEVAS y aditivas gateadas por is_admin(). Postgres combina políticas
-- permisivas con OR, así que esto no reescribe nada existente y, a
-- diferencia de ampliar el helper compartido, una cuenta admin sigue viendo
-- solo lo suyo en la app de consumidor (/dashboard, /map) — is_admin() solo
-- habilita las rutas /api/admin/*.

-- ─── profiles.is_admin ─────────────────────────────────────
-- Se activa a mano por SQL. Sin flujo de autoregistro ni UI para crear
-- admins: es una operación de confianza, deliberadamente fuera de la app.
alter table profiles add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- ─── Políticas aditivas: vehicles, vehicle_users, devices, command_logs ──
create policy "vehicles admin read" on vehicles for select
  using (public.is_admin());

create policy "vehicle_users admin manage" on vehicle_users for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "devices admin read" on devices for select
  using (public.is_admin());

create policy "devices admin insert" on devices for insert
  with check (public.is_admin());

create policy "devices admin update" on devices for update
  using (public.is_admin())
  with check (public.is_admin());
-- Sin DELETE en devices para admin: mismo espíritu que el soft-delete de
-- vehicles (0005) — un dispositivo se retira (status='retired'), no se borra.

create policy "command_logs admin read" on command_logs for select
  using (public.is_admin());

create policy "command_logs admin insert" on command_logs for insert
  with check (public.is_admin());

-- ─── vehicle_members: único ajuste a una función existente ─────────────
-- Amplía quién pasa el gate interno (dueño real O admin); no cambia nada
-- para el flujo normal del dueño.
create or replace function public.vehicle_members(p_vehicle uuid)
returns table (user_id uuid, email text, display_name text, role text, granted_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select vu.user_id, u.email::text, p.display_name, vu.role, vu.granted_at
    from vehicle_users vu
    join auth.users u on u.id = vu.user_id
    left join profiles p on p.id = vu.user_id
   where vu.vehicle_id = p_vehicle
     and (public.user_vehicle_role(p_vehicle) = 'owner' or public.is_admin())
   order by vu.granted_at;
$$;

-- ─── RPCs exclusivas de admin ────────────────────────────────────────
-- auth.users no es accesible desde PostgREST directamente (mismo motivo que
-- ya resolvió vehicle_members en 0003): estas funciones exponen solo lo
-- necesario, gateadas por is_admin() dentro del cuerpo.

-- Listado/detalle de vehículos de TODOS los clientes. Deliberadamente SIN
-- filtro deleted_at is null: soporte necesita ver vehículos soft-deleted
-- para investigar reclamos e historial.
create or replace function public.admin_vehicles(p_query text default null, p_vehicle_id uuid default null)
returns table (
  id uuid, owner_id uuid, owner_email text, alias text, plate text, make text, model text,
  year int, created_at timestamptz, deleted_at timestamptz, device_id uuid, imei text,
  flespi_device_id bigint, device_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select v.id, v.owner_id, u.email::text, v.alias, v.plate, v.make, v.model, v.year,
         v.created_at, v.deleted_at, v.device_id, d.imei, d.flespi_device_id, d.status
    from vehicles v
    join auth.users u on u.id = v.owner_id
    left join devices d on d.id = v.device_id
   where public.is_admin()
     and (p_vehicle_id is null or v.id = p_vehicle_id)
     and (p_query is null or v.alias ilike '%'||p_query||'%' or v.plate ilike '%'||p_query||'%'
          or u.email ilike '%'||p_query||'%' or d.imei ilike '%'||p_query||'%')
   order by v.created_at desc;
$$;

-- Listado de usuarios de la plataforma con búsqueda por email/nombre.
create or replace function public.admin_users(p_query text default null)
returns table (id uuid, email text, display_name text, phone text, is_admin boolean, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.email::text, p.display_name, p.phone, coalesce(p.is_admin, false), u.created_at
    from auth.users u
    left join profiles p on p.id = u.id
   where public.is_admin()
     and (p_query is null or u.email ilike '%'||p_query||'%' or p.display_name ilike '%'||p_query||'%')
   order by u.created_at desc;
$$;

-- Vehículos a los que un usuario tiene acceso (como dueño o por vehicle_users).
create or replace function public.admin_user_access(p_user uuid)
returns table (vehicle_id uuid, alias text, role text, granted_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select v.id, v.alias, 'owner'::text, v.created_at
    from vehicles v where v.owner_id = p_user and public.is_admin()
  union all
  select vu.vehicle_id, v.alias, vu.role, vu.granted_at
    from vehicle_users vu join vehicles v on v.id = vu.vehicle_id
   where vu.user_id = p_user and public.is_admin();
$$;

-- ─── Permisos de ejecución ─────────────────────────────────
revoke all on function public.is_admin() from public;
revoke all on function public.admin_vehicles(text, uuid) from public;
revoke all on function public.admin_users(text) from public;
revoke all on function public.admin_user_access(uuid) from public;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_vehicles(text, uuid) to authenticated;
grant execute on function public.admin_users(text) to authenticated;
grant execute on function public.admin_user_access(uuid) to authenticated;
