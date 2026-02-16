-- Roles & Permissions v2 (foundation)
-- Safe: adds new tables/functions/policies without changing existing working features.

create extension if not exists pgcrypto;

-- App admins table (may already exist; safe)
create table if not exists public.app_admins (
  user_id uuid primary key,
  created_at timestamptz not null default now()
);

-- Helper: is_app_admin(uuid) used by RLS (safe overwrite)
create or replace function public.is_app_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.app_admins a where a.user_id = uid);
$$;

grant execute on function public.is_app_admin(uuid) to authenticated;

-- Permission keys (global dictionary)
create table if not exists public.permission_keys (
  key text primary key,
  label text not null,
  category text not null default 'general',
  created_at timestamptz not null default now()
);

-- Alliance role definitions (Owner creates roles per alliance)
create table if not exists public.alliance_role_defs (
  id uuid primary key default gen_random_uuid(),
  alliance_id text not null,
  role_key text not null,
  display_name text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid,
  unique (alliance_id, role_key)
);

-- Role -> permission mapping
create table if not exists public.alliance_role_permissions (
  alliance_id text not null,
  role_key text not null,
  permission_key text not null references public.permission_keys(key) on delete cascade,
  allowed boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (alliance_id, role_key, permission_key),
  foreign key (alliance_id, role_key)
    references public.alliance_role_defs(alliance_id, role_key)
    on delete cascade
);

-- -------------------------
-- RLS
-- -------------------------
alter table public.permission_keys enable row level security;
alter table public.alliance_role_defs enable row level security;
alter table public.alliance_role_permissions enable row level security;

-- Drop policies if they exist (safe)
do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='permission_keys' and policyname='permission_keys_select') then
    drop policy permission_keys_select on public.permission_keys;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='permission_keys' and policyname='permission_keys_admin_write') then
    drop policy permission_keys_admin_write on public.permission_keys;
  end if;

  if exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_role_defs' and policyname='alliance_role_defs_select') then
    drop policy alliance_role_defs_select on public.alliance_role_defs;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_role_defs' and policyname='alliance_role_defs_admin_write') then
    drop policy alliance_role_defs_admin_write on public.alliance_role_defs;
  end if;

  if exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_role_permissions' and policyname='alliance_role_permissions_select') then
    drop policy alliance_role_permissions_select on public.alliance_role_permissions;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_role_permissions' and policyname='alliance_role_permissions_admin_write') then
    drop policy alliance_role_permissions_admin_write on public.alliance_role_permissions;
  end if;
end $$;

-- Everyone signed-in can read keys/roles/permissions
create policy permission_keys_select
on public.permission_keys
for select
to authenticated
using (true);

create policy alliance_role_defs_select
on public.alliance_role_defs
for select
to authenticated
using (true);

create policy alliance_role_permissions_select
on public.alliance_role_permissions
for select
to authenticated
using (true);

-- Only app admins (Owner) can write
create policy permission_keys_admin_write
on public.permission_keys
for all
to authenticated
using (public.is_app_admin(auth.uid()))
with check (public.is_app_admin(auth.uid()));

create policy alliance_role_defs_admin_write
on public.alliance_role_defs
for all
to authenticated
using (public.is_app_admin(auth.uid()))
with check (public.is_app_admin(auth.uid()));

create policy alliance_role_permissions_admin_write
on public.alliance_role_permissions
for all
to authenticated
using (public.is_app_admin(auth.uid()))
with check (public.is_app_admin(auth.uid()));

-- -------------------------
-- Seed permission keys (safe upsert)
-- -------------------------
insert into public.permission_keys(key, label, category) values
  ('calendar.view', 'View Calendar', 'Calendar'),
  ('calendar.edit', 'Create/Edit/Delete Calendar Events', 'Calendar'),

  ('roster.view', 'View Roster / Memberships', 'Roster'),
  ('roster.manage', 'Manage Roster / Memberships', 'Roster'),

  ('discord.view', 'View Discord Settings', 'Discord'),
  ('discord.manage', 'Manage Discord Settings', 'Discord'),

  ('alliances.view', 'View Alliances', 'Alliances'),
  ('alliances.manage', 'Manage Alliances', 'Alliances'),

  ('players.view', 'View Players', 'Players'),
  ('players.manage', 'Manage Players', 'Players'),

  ('hq_map.view', 'View HQ Map', 'HQ Map'),
  ('hq_map.manage', 'Manage HQ Map', 'HQ Map'),

  ('state.view', 'View State Dashboard', 'State'),
  ('state.manage', 'Manage State Dashboard', 'State')
on conflict (key) do update
set label = excluded.label,
    category = excluded.category;

-- Best-effort PostgREST schema cache refresh
do $$
begin
  perform pg_notify('pgrst', 'reload schema');
exception when others then
  null;
end $$;

