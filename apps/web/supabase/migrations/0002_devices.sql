-- Securitycar — 0002: device provisioning + claim flow
--
-- Motivación: hasta ahora `vehicles.flespi_device_id` lo enviaba el cliente al
-- crear un vehículo. Los IDs de Flespi son enteros secuenciales, así que
-- cualquier usuario autenticado podía enumerarlos y apropiarse del rastreador
-- de otro cliente (ver su GPS en vivo y enviarle comandos de bloqueo de motor).
--
-- El hardware pasa a vivir en `devices`, dado de alta por nosotros al instalar
-- el GPS. El cliente no declara un dispositivo: lo *reclama* con un código de
-- un solo uso. `vehicles` ya nunca guarda el ID de Flespi directamente.

-- ─── devices ───────────────────────────────────────────────
create table if not exists devices (
  id               uuid primary key default gen_random_uuid(),
  imei             text not null unique,
  flespi_device_id bigint not null unique,
  sim_iccid        text,
  status           text not null default 'provisioned'
                     check (status in ('provisioned', 'active', 'retired')),
  -- Normalizado: 8 chars en mayúscula sin separadores. Se pone a null al
  -- consumirse, de modo que un código nunca sirve dos veces.
  claim_code       text unique,
  claimed_by       uuid references auth.users on delete set null,
  claimed_at       timestamptz,
  created_at       timestamptz not null default now()
);

-- ─── vehicles: device_id reemplaza a flespi_device_id ──────
alter table vehicles add column if not exists device_id uuid unique references devices;
-- Reservada para la fase multiempresa. Añadirla ahora evita una migración de
-- datos con downtime más adelante; sin FK hasta que exista `organizations`.
alter table vehicles add column if not exists org_id uuid;

-- Backfill: un device por cada vehículo ya existente. El IMEI real se
-- desconoce en estas filas, así que se marca para poder corregirlo luego.
insert into devices (imei, flespi_device_id, status, claimed_by, claimed_at)
select 'MIGRATED-' || v.flespi_device_id, v.flespi_device_id, 'active', v.owner_id, v.created_at
from vehicles v
on conflict (flespi_device_id) do nothing;

update vehicles v
   set device_id = d.id
  from devices d
 where d.flespi_device_id = v.flespi_device_id
   and v.device_id is null;

alter table vehicles alter column device_id set not null;
alter table vehicles drop column flespi_device_id;

-- ─── claim_attempts ────────────────────────────────────────
-- Antifuerza bruta del código. RLS activo y SIN políticas: nadie lo toca
-- directamente, solo la función `claim_device` (security definer).
create table if not exists claim_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  attempted_at timestamptz not null default now()
);
create index if not exists claim_attempts_user_idx
  on claim_attempts (user_id, attempted_at desc);

-- ─── RLS ───────────────────────────────────────────────────
alter table devices        enable row level security;
alter table claim_attempts enable row level security;

-- El usuario solo ve el device de un vehículo suyo. Los no reclamados son
-- invisibles, así que no se pueden enumerar. Toda fila visible tiene
-- claim_code = null (se anula al reclamarse), por lo que el código nunca
-- se expone al cliente.
drop policy if exists "devices read via vehicle" on devices;
create policy "devices read via vehicle" on devices for select using (
  exists (
    select 1 from vehicles v
     where v.device_id = devices.id
       and v.owner_id = auth.uid()
  )
);

-- ─── claim_device ──────────────────────────────────────────
-- Reclama un dispositivo y crea su vehículo en una sola transacción.
--
-- Devuelve un código de resultado en lugar de lanzar excepción en los fallos
-- de negocio: un `raise` haría rollback de la fila de claim_attempts y
-- anularía el rate limit, que es justo lo que protege contra fuerza bruta.
--
-- La identidad sale de auth.uid(), no de un parámetro, para que no se pueda
-- suplantar. Es seguro llamarla directamente con la anon key: el límite de
-- intentos y la validación viven aquí dentro, no en la capa de API.
create or replace function public.claim_device(
  p_claim_code text,
  p_alias      text,
  p_plate      text default null,
  p_make       text default null,
  p_model      text default null,
  p_year       int  default null
)
returns table (result text, vehicle_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_code     text;
  v_attempts int;
  v_device   devices%rowtype;
  v_vehicle  uuid;
begin
  if v_user is null then
    return query select 'UNAUTHORIZED'::text, null::uuid;
    return;
  end if;

  select count(*) into v_attempts
    from claim_attempts
   where user_id = v_user
     and attempted_at > now() - interval '1 hour';

  if v_attempts >= 5 then
    return query select 'RATE_LIMITED'::text, null::uuid;
    return;
  end if;

  insert into claim_attempts (user_id) values (v_user);

  -- Normaliza lo que teclee el usuario: minúsculas, guiones, espacios.
  v_code := upper(regexp_replace(coalesce(p_claim_code, ''), '[^A-Za-z0-9]', '', 'g'));

  -- Consumo atómico: el WHERE sobre status impide que dos peticiones
  -- simultáneas reclamen el mismo dispositivo.
  update devices
     set status     = 'active',
         claimed_by = v_user,
         claimed_at = now(),
         claim_code = null
   where claim_code = v_code
     and status = 'provisioned'
  returning * into v_device;

  if v_device.id is null then
    return query select 'INVALID_CODE'::text, null::uuid;
    return;
  end if;

  insert into vehicles (owner_id, device_id, alias, plate, make, model, year)
  values (v_user, v_device.id, p_alias, p_plate, p_make, p_model, p_year)
  returning id into v_vehicle;

  return query select 'OK'::text, v_vehicle;
end;
$$;

revoke all on function public.claim_device(text, text, text, text, text, int) from public;
grant execute on function public.claim_device(text, text, text, text, text, int) to authenticated;
