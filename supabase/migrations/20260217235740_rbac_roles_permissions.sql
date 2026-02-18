-- RBAC: roles + permissions + mappings (SAFE)
-- Creates tables/indexes/policies only if missing.
-- Requires is_app_admin(uuid) already present (you already have RPC is_app_admin).

create extension if not exists pgcrypto;

create table if not exists public.app_roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  scope text not null default 'alliance',
  description text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text null,
  created_at timestamptz not null default now()
);

create table if not exists public.app_role_permissions (
  role_id uuid not null references public.app_roles(id) on delete cascade,
  permission_id uuid not null references public.app_permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

-- RLS
alter table public.app_roles enable row level security;
alter table public.app_permissions enable row level security;
alter table public.app_role_permissions enable row level security;

do $$
begin
  -- READ policies (authenticated)
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='app_roles' and policyname='app_roles_read'
  ) then
    execute $p$
      create policy app_roles_read
      on public.app_roles
      for select
      using (auth.uid() is not null)
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='app_permissions' and policyname='app_permissions_read'
  ) then
    execute $p$
      create policy app_permissions_read
      on public.app_permissions
      for select
      using (auth.uid() is not null)
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='app_role_permissions' and policyname='app_role_permissions_read'
  ) then
    execute $p$
      create policy app_role_permissions_read
      on public.app_role_permissions
      for select
      using (auth.uid() is not null)
    $p$;
  end if;

  -- ADMIN write policies
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='app_roles' and policyname='app_roles_admin_all'
  ) then
    execute $p$
      create policy app_roles_admin_all
      on public.app_roles
      for all
      using (public.is_app_admin(auth.uid()))
      with check (public.is_app_admin(auth.uid()))
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='app_permissions' and policyname='app_permissions_admin_all'
  ) then
    execute $p$
      create policy app_permissions_admin_all
      on public.app_permissions
      for all
      using (public.is_app_admin(auth.uid()))
      with check (public.is_app_admin(auth.uid()))
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='app_role_permissions' and policyname='app_role_permissions_admin_all'
  ) then
    execute $p$
      create policy app_role_permissions_admin_all
      on public.app_role_permissions
      for all
      using (public.is_app_admin(auth.uid()))
      with check (public.is_app_admin(auth.uid()))
    $p$;
  end if;
end $$;

-- Seed defaults (safe)
insert into public.app_roles (key,label,scope,description)
values
  ('owner','Owner','alliance','Full control in alliance context'),
  ('r5','R5','alliance','Alliance manager (full write)'),
  ('r4','R4','alliance','Alliance manager (full write)'),
  ('member','Member','alliance','Read-only member')
on conflict (key) do nothing;

insert into public.app_permissions (key,description)
values
  ('announcements.read','Read announcements'),
  ('announcements.write','Create/edit announcements'),
  ('guides.read','Read guides'),
  ('guides.write','Create/edit guides'),
  ('hq_map.read','View HQ map'),
  ('hq_map.write','Edit HQ map'),
  ('calendar.read','View calendar'),
  ('calendar.write','Edit calendar'),
  ('memberships.manage','Assign players to alliances / roles'),
  ('roles.manage','Manage roles + permissions')
on conflict (key) do nothing;

-- Map permissions to roles (safe)
-- Owner gets everything
insert into public.app_role_permissions(role_id, permission_id)
select r.id, p.id
from public.app_roles r
join public.app_permissions p on true
where r.key = 'owner'
on conflict do nothing;

-- R5 and R4 get full alliance write + reads
insert into public.app_role_permissions(role_id, permission_id)
select r.id, p.id
from public.app_roles r
join public.app_permissions p on p.key in (
  'announcements.read','announcements.write',
  'guides.read','guides.write',
  'hq_map.read','hq_map.write',
  'calendar.read','calendar.write'
)
where r.key in ('r5','r4')
on conflict do nothing;

-- Member gets read-only
insert into public.app_role_permissions(role_id, permission_id)
select r.id, p.id
from public.app_roles r
join public.app_permissions p on p.key in (
  'announcements.read','guides.read','hq_map.read','calendar.read'
)
where r.key = 'member'
on conflict do nothing;
