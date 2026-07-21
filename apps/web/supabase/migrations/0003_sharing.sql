-- Securitycar — 0003: acceso compartido a vehículos
--
-- `vehicle_permissions` existía en 0001 pero era una tabla muerta: la política
-- de `vehicles` solo contemplaba owner_id, no había política de INSERT, y los
-- repositorios filtraban por dueño. Compartir un vehículo no funcionaba.
--
-- Esta migración la convierte en `vehicle_users` con roles reales, arregla las
-- políticas y añade invitaciones.

-- ─── vehicle_users ─────────────────────────────────────────
alter table if exists vehicle_permissions rename to vehicle_users;

alter table vehicle_users drop constraint if exists vehicle_permissions_role_check;
alter table vehicle_users add constraint vehicle_users_role_check
  check (role in ('owner', 'driver', 'viewer'));

-- ─── Resolución de rol ─────────────────────────────────────
-- SECURITY DEFINER a propósito: estas funciones se usan DENTRO de las políticas
-- RLS. Si la política de `vehicles` consultara `vehicle_users` directamente y la
-- de `vehicle_users` consultara `vehicles`, Postgres abortaría con "infinite
-- recursion detected in policy". Al saltarse RLS aquí dentro, el ciclo se corta.
--
-- El dueño no necesita fila en vehicle_users: `vehicles.owner_id` es la fuente
-- de verdad de la propiedad; vehicle_users solo guarda accesos concedidos.
create or replace function public.user_vehicle_role(p_vehicle uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1 from vehicles where id = p_vehicle and owner_id = auth.uid()
    ) then 'owner'
    else (
      select role from vehicle_users
       where vehicle_id = p_vehicle and user_id = auth.uid()
    )
  end;
$$;

create or replace function public.can_read_device(p_device uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from vehicles v
      left join vehicle_users vu
        on vu.vehicle_id = v.id and vu.user_id = auth.uid()
     where v.device_id = p_device
       and (v.owner_id = auth.uid() or vu.id is not null)
  );
$$;

-- Campo calculado de PostgREST: se puede pedir como una columna más
-- (`select=...,effective_role`). Evita una consulta por vehículo para saber qué
-- puede hacer el usuario, y permite a la UI ocultar los botones de comando a
-- quien solo tiene rol 'viewer'.
create or replace function public.effective_role(v vehicles)
returns text
language sql
stable
set search_path = public
as $$
  select public.user_vehicle_role(v.id);
$$;

-- ─── Políticas: vehicles ───────────────────────────────────
-- Lectura para quien tenga cualquier rol; escritura y borrado solo el dueño.
drop policy if exists "own vehicles" on vehicles;
drop policy if exists "vehicles read" on vehicles;
drop policy if exists "vehicles write" on vehicles;

create policy "vehicles read" on vehicles for select
  using (public.user_vehicle_role(id) is not null);

create policy "vehicles insert" on vehicles for insert
  with check (auth.uid() = owner_id);

create policy "vehicles update" on vehicles for update
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "vehicles delete" on vehicles for delete
  using (auth.uid() = owner_id);

-- ─── Políticas: devices ────────────────────────────────────
-- Se amplía lo de 0002: ahora también los usuarios con acceso compartido
-- necesitan leer el device (la UI muestra el IMEI y el servidor resuelve el
-- flespi_device_id por join).
drop policy if exists "devices read via vehicle" on devices;
create policy "devices read via vehicle" on devices for select
  using (public.can_read_device(id));

-- ─── Políticas: vehicle_users ──────────────────────────────
drop policy if exists "own permissions" on vehicle_users;
drop policy if exists "vehicle_users read" on vehicle_users;
drop policy if exists "vehicle_users manage" on vehicle_users;

-- Cada usuario ve sus propios accesos; el dueño ve todos los del vehículo.
create policy "vehicle_users read" on vehicle_users for select
  using (auth.uid() = user_id or public.user_vehicle_role(vehicle_id) = 'owner');

-- Solo el dueño concede o revoca.
create policy "vehicle_users manage" on vehicle_users for all
  using (public.user_vehicle_role(vehicle_id) = 'owner')
  with check (public.user_vehicle_role(vehicle_id) = 'owner');

-- ─── Políticas: command_logs ───────────────────────────────
-- El dueño ve TODO el historial de su vehículo, no solo lo que él mandó: si un
-- conductor bloquea el motor, tiene que quedar visible para el propietario.
drop policy if exists "own commands" on command_logs;

create policy "command_logs read" on command_logs for select
  using (auth.uid() = user_id or public.user_vehicle_role(vehicle_id) = 'owner');

-- El rol se exige también aquí, no solo en la ruta de API: un `viewer` no puede
-- registrar comandos aunque llame a PostgREST directamente con la anon key.
create policy "command_logs insert" on command_logs for insert
  with check (
    auth.uid() = user_id
    and public.user_vehicle_role(vehicle_id) in ('owner', 'driver')
  );

create policy "command_logs update" on command_logs for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── invitations ───────────────────────────────────────────
-- `email` es solo una etiqueta para que el dueño recuerde a quién invitó: NO se
-- valida al aceptar. El token es la credencial, así que el enlace debe tratarse
-- como un secreto. Mitigaciones: un solo uso, caduca a los 7 días, revocable, y
-- el rol por defecto es 'viewer' (conceder 'driver' es explícito).
create table if not exists invitations (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid not null references vehicles on delete cascade,
  invited_by  uuid not null references auth.users on delete cascade,
  email       text,
  role        text not null default 'viewer' check (role in ('driver', 'viewer')),
  token       text not null unique,
  expires_at  timestamptz not null default now() + interval '7 days',
  accepted_by uuid references auth.users on delete set null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists invitations_vehicle_idx on invitations (vehicle_id, created_at desc);

alter table invitations enable row level security;

-- Solo el dueño gestiona invitaciones. El invitado NO lee esta tabla: canjea
-- por `accept_invitation`, que es SECURITY DEFINER.
drop policy if exists "invitations by owner" on invitations;
create policy "invitations by owner" on invitations for all
  using (public.user_vehicle_role(vehicle_id) = 'owner')
  with check (public.user_vehicle_role(vehicle_id) = 'owner');

-- ─── accept_invitation ─────────────────────────────────────
-- Mismo patrón que `claim_device` (0002): devuelve un código de resultado en
-- vez de lanzar excepción, y toma la identidad de auth.uid() para que no se
-- pueda suplantar. Es SECURITY DEFINER porque el invitado no puede leer la
-- invitación por RLS: la política es solo para el dueño.
create or replace function public.accept_invitation(p_token text)
returns table (result text, vehicle_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_inv  invitations%rowtype;
begin
  if v_user is null then
    return query select 'UNAUTHORIZED'::text, null::uuid;
    return;
  end if;

  select * into v_inv
    from invitations
   where token = p_token
     and accepted_by is null
     and expires_at > now();

  if v_inv.id is null then
    return query select 'INVALID_TOKEN'::text, null::uuid;
    return;
  end if;

  if exists (select 1 from vehicles where id = v_inv.vehicle_id and owner_id = v_user) then
    return query select 'ALREADY_OWNER'::text, v_inv.vehicle_id;
    return;
  end if;

  insert into vehicle_users (vehicle_id, user_id, role)
  values (v_inv.vehicle_id, v_user, v_inv.role)
  on conflict (vehicle_id, user_id) do update set role = excluded.role;

  update invitations
     set accepted_by = v_user, accepted_at = now()
   where id = v_inv.id;

  return query select 'OK'::text, v_inv.vehicle_id;
end;
$$;

-- ─── invitation_preview ────────────────────────────────────
-- Permite mostrar QUÉ se está aceptando antes de aceptarlo. El invitado no
-- puede leer `invitations` por RLS, de ahí el SECURITY DEFINER. Expone solo el
-- alias del vehículo y el rol: quien tiene el token va a obtener ese acceso de
-- todas formas, así que no revela nada que no vaya a ver.
create or replace function public.invitation_preview(p_token text)
returns table (vehicle_alias text, role text, expires_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select v.alias, i.role, i.expires_at
    from invitations i
    join vehicles v on v.id = i.vehicle_id
   where i.token = p_token
     and i.accepted_by is null
     and i.expires_at > now();
$$;

-- ─── vehicle_members ───────────────────────────────────────
-- La UI de accesos necesita mostrar A QUIÉN se le concedió permiso, pero la
-- política de `profiles` es `auth.uid() = id`: el dueño no puede leer el perfil
-- de otro usuario, y `auth.users` no es accesible desde el cliente. Esta función
-- expone solo lo necesario y únicamente al dueño del vehículo.
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
     and public.user_vehicle_role(p_vehicle) = 'owner'
   order by vu.granted_at;
$$;

-- ─── Permisos de ejecución ─────────────────────────────────
revoke all on function public.accept_invitation(text) from public;
revoke all on function public.vehicle_members(uuid) from public;
revoke all on function public.invitation_preview(text) from public;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.vehicle_members(uuid) to authenticated;
grant execute on function public.invitation_preview(text) to authenticated;
-- user_vehicle_role / can_read_device se invocan desde las políticas RLS, que
-- se evalúan como el rol de la sesión: necesitan execute para authenticated.
grant execute on function public.user_vehicle_role(uuid) to authenticated;
grant execute on function public.can_read_device(uuid) to authenticated;
grant execute on function public.effective_role(vehicles) to authenticated;
