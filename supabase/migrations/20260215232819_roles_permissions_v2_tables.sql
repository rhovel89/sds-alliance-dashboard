-- Roles + Permissions V2 (NEW tables; does NOT touch legacy tables)
create extension if not exists pgcrypto;

create table if not exists public.permission_keys_v2 (
  key text primary key,
  label text not null,
  feature text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.alliance_roles_v2 (
  id uuid primary key default gen_random_uuid(),
  alliance_code text not null,
  role_key text not null,
  display_name text not null,
  rank integer not null default 0,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique(alliance_code, role_key)
);

create table if not exists public.alliance_role_permissions_v2 (
  id uuid primary key default gen_random_uuid(),
  alliance_code text not null,
  role_key text not null,
  permission_key text not null references public.permission_keys_v2(key) on delete cascade,
  allowed boolean not null default false,
  created_at timestamptz not null default now(),
  unique(alliance_code, role_key, permission_key)
);

alter table public.permission_keys_v2 enable row level security;
alter table public.alliance_roles_v2 enable row level security;
alter table public.alliance_role_permissions_v2 enable row level security;

-- Policies: readable by authenticated; writable by app_admins only
drop policy if exists permission_keys_v2_select on public.permission_keys_v2;
drop policy if exists permission_keys_v2_admin_insert on public.permission_keys_v2;
drop policy if exists permission_keys_v2_admin_update on public.permission_keys_v2;
drop policy if exists permission_keys_v2_admin_delete on public.permission_keys_v2;

create policy permission_keys_v2_select
on public.permission_keys_v2
for select
to authenticated
using (true);

create policy permission_keys_v2_admin_insert
on public.permission_keys_v2
for insert
to authenticated
with check (exists (select 1 from public.app_admins a where a.user_id = auth.uid()));

create policy permission_keys_v2_admin_update
on public.permission_keys_v2
for update
to authenticated
using (exists (select 1 from public.app_admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.app_admins a where a.user_id = auth.uid()));

create policy permission_keys_v2_admin_delete
on public.permission_keys_v2
for delete
to authenticated
using (exists (select 1 from public.app_admins a where a.user_id = auth.uid()));

drop policy if exists alliance_roles_v2_select on public.alliance_roles_v2;
drop policy if exists alliance_roles_v2_admin_insert on public.alliance_roles_v2;
drop policy if exists alliance_roles_v2_admin_update on public.alliance_roles_v2;
drop policy if exists alliance_roles_v2_admin_delete on public.alliance_roles_v2;

create policy alliance_roles_v2_select
on public.alliance_roles_v2
for select
to authenticated
using (true);

create policy alliance_roles_v2_admin_insert
on public.alliance_roles_v2
for insert
to authenticated
with check (exists (select 1 from public.app_admins a where a.user_id = auth.uid()));

create policy alliance_roles_v2_admin_update
on public.alliance_roles_v2
for update
to authenticated
using (exists (select 1 from public.app_admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.app_admins a where a.user_id = auth.uid()));

create policy alliance_roles_v2_admin_delete
on public.alliance_roles_v2
for delete
to authenticated
using (exists (select 1 from public.app_admins a where a.user_id = auth.uid()));

drop policy if exists alliance_role_permissions_v2_select on public.alliance_role_permissions_v2;
drop policy if exists alliance_role_permissions_v2_admin_insert on public.alliance_role_permissions_v2;
drop policy if exists alliance_role_permissions_v2_admin_update on public.alliance_role_permissions_v2;
drop policy if exists alliance_role_permissions_v2_admin_delete on public.alliance_role_permissions_v2;

create policy alliance_role_permissions_v2_select
on public.alliance_role_permissions_v2
for select
to authenticated
using (true);

create policy alliance_role_permissions_v2_admin_insert
on public.alliance_role_permissions_v2
for insert
to authenticated
with check (exists (select 1 from public.app_admins a where a.user_id = auth.uid()));

create policy alliance_role_permissions_v2_admin_update
on public.alliance_role_permissions_v2
for update
to authenticated
using (exists (select 1 from public.app_admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.app_admins a where a.user_id = auth.uid()));

create policy alliance_role_permissions_v2_admin_delete
on public.alliance_role_permissions_v2
for delete
to authenticated
using (exists (select 1 from public.app_admins a where a.user_id = auth.uid()));

-- Seed keys (safe upsert)
insert into public.permission_keys_v2(key, label, feature) values
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
    feature = excluded.feature;
