-- Phase 4: Fix state_discord_channels + state_discord_defaults schema drift
-- Safe: ADD missing columns, relax NOT NULL, add defaults columns, enable RLS policies

-- Ensure channels columns exist
create table if not exists public.state_discord_channels (
  id uuid primary key default gen_random_uuid(),
  state_code text not null,
  channel_name text not null,
  channel_id text not null,
  active boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.state_discord_channels add column if not exists active boolean not null default true;
alter table public.state_discord_channels add column if not exists is_default boolean not null default false;
alter table public.state_discord_channels add column if not exists created_at timestamptz not null default now();
alter table public.state_discord_channels add column if not exists updated_at timestamptz not null default now();

create unique index if not exists state_discord_channels_one_default_per_state
  on public.state_discord_channels (state_code)
  where is_default;

-- Ensure defaults table exists (used by achievements export and reports)
create table if not exists public.state_discord_defaults (
  state_code text primary key,
  alerts_channel_id text null,
  reports_channel_id text null,
  achievements_export_channel_id text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.state_discord_defaults add column if not exists alerts_channel_id text;
alter table public.state_discord_defaults add column if not exists reports_channel_id text;
alter table public.state_discord_defaults add column if not exists achievements_export_channel_id text;
alter table public.state_discord_defaults add column if not exists created_at timestamptz not null default now();
alter table public.state_discord_defaults add column if not exists updated_at timestamptz not null default now();

-- Drop NOT NULL on alerts_channel_id if it exists and is constrained
do $$
begin
  begin
    alter table public.state_discord_defaults alter column alerts_channel_id drop not null;
  exception when undefined_column then
    null;
  exception when invalid_table_definition then
    null;
  end;
end $$;

-- Touch updated_at trigger (shared)
create or replace function public.trg_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_state_discord_channels_touch on public.state_discord_channels;
create trigger trg_state_discord_channels_touch
before update on public.state_discord_channels
for each row execute function public.trg_touch_updated_at();

drop trigger if exists trg_state_discord_defaults_touch on public.state_discord_defaults;
create trigger trg_state_discord_defaults_touch
before update on public.state_discord_defaults
for each row execute function public.trg_touch_updated_at();

-- RLS
alter table public.state_discord_channels enable row level security;
alter table public.state_discord_defaults enable row level security;

drop policy if exists sdc_select_auth on public.state_discord_channels;
create policy sdc_select_auth
on public.state_discord_channels
for select
to authenticated
using (true);

drop policy if exists sdc_manage_owner on public.state_discord_channels;
create policy sdc_manage_owner
on public.state_discord_channels
for all
to authenticated
using (is_dashboard_owner() or is_app_admin())
with check (is_dashboard_owner() or is_app_admin());

drop policy if exists sdd_select_auth on public.state_discord_defaults;
create policy sdd_select_auth
on public.state_discord_defaults
for select
to authenticated
using (true);

drop policy if exists sdd_manage_owner on public.state_discord_defaults;
create policy sdd_manage_owner
on public.state_discord_defaults
for all
to authenticated
using (is_dashboard_owner() or is_app_admin())
with check (is_dashboard_owner() or is_app_admin());
