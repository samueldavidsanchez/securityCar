-- Securitycar — initial schema
-- Only user/vehicle metadata is stored. Telemetry lives in Flespi.

-- ─── profiles ──────────────────────────────────────────────
create table if not exists profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text,
  phone        text,
  avatar_url   text,
  preferences  jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);

-- ─── vehicles ──────────────────────────────────────────────
create table if not exists vehicles (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users on delete cascade,
  flespi_device_id bigint not null unique,
  alias            text not null,
  plate            text,
  make             text,
  model            text,
  year             int,
  created_at       timestamptz not null default now()
);
create index if not exists vehicles_owner_idx on vehicles (owner_id);

-- ─── vehicle_permissions ───────────────────────────────────
create table if not exists vehicle_permissions (
  id         uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  role       text not null default 'viewer' check (role in ('owner', 'viewer')),
  granted_at timestamptz not null default now(),
  unique (vehicle_id, user_id)
);

-- ─── command_logs ──────────────────────────────────────────
create table if not exists command_logs (
  id              uuid primary key default gen_random_uuid(),
  vehicle_id      uuid not null references vehicles on delete cascade,
  user_id         uuid not null references auth.users on delete cascade,
  command_type    text not null,
  payload         jsonb,
  status          text not null default 'pending'
                    check (status in ('pending', 'sent', 'confirmed', 'failed')),
  flespi_response jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists command_logs_vehicle_idx on command_logs (vehicle_id, created_at desc);

-- ─── notification_settings ─────────────────────────────────
create table if not exists notification_settings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  vehicle_id uuid references vehicles on delete cascade,
  event_type text not null,
  enabled    boolean not null default true,
  unique (user_id, vehicle_id, event_type)
);

-- ─── Row Level Security ────────────────────────────────────
alter table profiles              enable row level security;
alter table vehicles              enable row level security;
alter table vehicle_permissions   enable row level security;
alter table command_logs          enable row level security;
alter table notification_settings enable row level security;

-- profiles: users manage their own row
create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- vehicles: owner has full access
create policy "own vehicles" on vehicles
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- command_logs: user sees their own command history
create policy "own commands" on command_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- notification_settings: user manages their own
create policy "own notifications" on notification_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- vehicle_permissions: user sees rows granting them access
create policy "own permissions" on vehicle_permissions
  for select using (auth.uid() = user_id);

-- ─── Auto-create profile on signup ─────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
