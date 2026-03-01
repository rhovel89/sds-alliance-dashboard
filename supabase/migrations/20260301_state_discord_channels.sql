-- State Discord Channels (DB-backed dropdown for state alerts)
-- Safe: new table + simple RLS policies

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

-- Only one default per state
create unique index if not exists state_discord_channels_one_default_per_state
  on public.state_discord_channels (state_code)
  where is_default;

-- updated_at touch trigger
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

alter table public.state_discord_channels enable row level security;

-- Everyone signed-in can read channels (dropdown)
drop policy if exists sdc_select_auth on public.state_discord_channels;
create policy sdc_select_auth
on public.state_discord_channels
for select
to authenticated
using (true);

-- Only Owner/AppAdmin can manage channels
drop policy if exists sdc_manage_owner on public.state_discord_channels;
create policy sdc_manage_owner
on public.state_discord_channels
for all
to authenticated
using (is_dashboard_owner() or is_app_admin())
with check (is_dashboard_owner() or is_app_admin());

-- Seed defaults for state 789 (edit anytime later in UI)
insert into public.state_discord_channels (state_code, channel_name, channel_id, active, is_default)
values
  ('789', 'State Alerts', '1477424639276875919', true, true)
on conflict do nothing;
