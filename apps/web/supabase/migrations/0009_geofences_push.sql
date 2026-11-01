-- Securitycar — 0009: geocercas + tokens de notificaciones push
--
-- La DETECCIÓN de entrada/salida no ocurre aquí: las geocercas se replican en
-- Flespi (gw/geofences) y un calculator con selector `geofence` emite los
-- eventos activated/deactivated que llegan por webhook. Esta tabla guarda solo
-- la definición que dibujó el usuario (metadatos, no telemetría) y el id del
-- espejo en Flespi para poder editarla/borrarla.

-- ─── geofences ─────────────────────────────────────────────
create table if not exists geofences (
  id                  uuid primary key default gen_random_uuid(),
  vehicle_id          uuid not null references vehicles on delete cascade,
  name                text not null check (char_length(name) between 1 and 60),
  shape               text not null check (shape in ('circle', 'polygon')),
  -- circle:  { "center": { "lat": n, "lng": n }, "radius_m": n }
  -- polygon: { "points": [ { "lat": n, "lng": n }, ... ] }
  geometry            jsonb not null,
  alert_on_enter      boolean not null default true,
  alert_on_exit       boolean not null default true,
  flespi_geofence_id  bigint,
  created_by          uuid references auth.users on delete set null,
  created_at          timestamptz not null default now()
);
create index if not exists geofences_vehicle_idx on geofences (vehicle_id);

alter table geofences enable row level security;

-- Mismo criterio que comandos: ver = cualquier rol; crear/editar/borrar =
-- driver u owner. Pasa por user_vehicle_role() (SECURITY DEFINER, 0003) para no
-- consultar vehicles/vehicle_users desde la política.
drop policy if exists "geofences read" on geofences;
create policy "geofences read" on geofences for select
  using (public.user_vehicle_role(vehicle_id) is not null);

drop policy if exists "geofences manage" on geofences;
create policy "geofences manage" on geofences for all
  using (public.user_vehicle_role(vehicle_id) in ('owner', 'driver'))
  with check (public.user_vehicle_role(vehicle_id) in ('owner', 'driver'));

-- ─── push_tokens ───────────────────────────────────────────
-- Un token de Expo por instalación. `token` es único: si otra cuenta inicia
-- sesión en el mismo teléfono, el upsert reasigna el token y la cuenta
-- anterior deja de recibir sus alertas en ese aparato.
create table if not exists push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  token       text not null unique,
  platform    text not null check (platform in ('android', 'ios')),
  updated_at  timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on push_tokens (user_id);

alter table push_tokens enable row level security;

-- Sin política de SELECT/UPDATE de tokens ajenos. La reasignación entre
-- cuentas la hace `register_push_token` (SECURITY DEFINER): con RLS normal un
-- upsert sobre una fila de otro usuario fallaría.
drop policy if exists "own push tokens" on push_tokens;
create policy "own push tokens" on push_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into push_tokens (user_id, token, platform, updated_at)
  values (auth.uid(), p_token, p_platform, now())
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        updated_at = now();
end;
$$;

revoke all on function public.register_push_token(text, text) from public;
grant execute on function public.register_push_token(text, text) to authenticated;
