-- State Leaders + State Announcements (safe/additive)

create extension if not exists pgcrypto;

-- Who can manage state? (State Leaders OR App Admins)
create table if not exists public.state_leaders (
  user_id uuid primary key,
  created_at timestamptz not null default now(),
  created_by uuid
);

alter table public.state_leaders enable row level security;

-- Everyone logged in can read state leaders (so UI can show "State Leader" status if you want later)
drop policy if exists state_leaders_select on public.state_leaders;
create policy state_leaders_select
on public.state_leaders
for select
to authenticated
using (true);

-- Only app admins can manage state leaders
drop policy if exists state_leaders_admin_write on public.state_leaders;
create policy state_leaders_admin_write
on public.state_leaders
for all
to authenticated
using (
  exists (select 1 from public.app_admins a where a.user_id = auth.uid())
)
with check (
  exists (select 1 from public.app_admins a where a.user_id = auth.uid())
);

-- Helper RPC: is_state_leader()
create or replace function public.is_state_leader()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (select 1 from public.state_leaders sl where sl.user_id = auth.uid())
    or exists (select 1 from public.app_admins aa where aa.user_id = auth.uid());
$$;

grant execute on function public.is_state_leader() to authenticated;

-- Announcements
create table if not exists public.state_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body  text not null,
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid()
);

alter table public.state_announcements enable row level security;

drop policy if exists state_announcements_select on public.state_announcements;
create policy state_announcements_select
on public.state_announcements
for select
to authenticated
using (true);

-- Only state leaders can write announcements
drop policy if exists state_announcements_insert on public.state_announcements;
create policy state_announcements_insert
on public.state_announcements
for insert
to authenticated
with check (public.is_state_leader());

drop policy if exists state_announcements_update on public.state_announcements;
create policy state_announcements_update
on public.state_announcements
for update
to authenticated
using (public.is_state_leader())
with check (public.is_state_leader());

drop policy if exists state_announcements_delete on public.state_announcements;
create policy state_announcements_delete
on public.state_announcements
for delete
to authenticated
using (public.is_state_leader());

-- Best-effort schema cache refresh for PostgREST
do $$
begin
  perform pg_notify('pgrst', 'reload schema');
exception when others then
  null;
end $$;
