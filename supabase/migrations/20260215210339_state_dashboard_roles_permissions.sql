-- STATE DASHBOARD: roles + permissions + memberships (additive)

-- Extensions
create extension if not exists pgcrypto;

-- 1) State roles
create table if not exists public.state_roles (
  id uuid primary key default gen_random_uuid(),
  role_key text not null unique,
  display_name text not null,
  rank int not null default 100,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Permission keys
create table if not exists public.state_permission_keys (
  key text primary key,
  description text
);

-- 3) Role -> permissions
create table if not exists public.state_role_permissions (
  role_key text not null references public.state_roles(role_key) on delete cascade,
  permission_key text not null references public.state_permission_keys(key) on delete cascade,
  allowed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (role_key, permission_key)
);

-- 4) Memberships (who is state leader etc.)
create table if not exists public.state_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role_key text not null references public.state_roles(role_key) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role_key)
);

-- RLS on
alter table public.state_roles enable row level security;
alter table public.state_permission_keys enable row level security;
alter table public.state_role_permissions enable row level security;
alter table public.state_memberships enable row level security;

-- Helper: Owner/app admin check (uses your existing RPC if present)
create or replace function public._is_app_admin()
returns boolean
language sql
stable
as $$
  select exists(select 1 from public.app_admins a where a.user_id = auth.uid());
$$;

-- Permission check: app admins always true; else check membership + role permissions
create or replace function public.has_state_permission(p_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return false;
  end if;

  if public._is_app_admin() then
    return true;
  end if;

  return exists (
    select 1
    from public.state_memberships sm
    join public.state_role_permissions rp
      on rp.role_key = sm.role_key
    where sm.user_id = v_uid
      and rp.permission_key = p_permission
      and rp.allowed = true
  );
end $$;

grant execute on function public.has_state_permission(text) to authenticated;

-- Policies (readable by authenticated, writable by app admins only)
do $$
begin
  -- state_roles
  begin
    create policy state_roles_select on public.state_roles
      for select to authenticated
      using (true);
  exception when duplicate_object then null; end;

  begin
    create policy state_roles_admin_write on public.state_roles
      for all to authenticated
      using (public._is_app_admin())
      with check (public._is_app_admin());
  exception when duplicate_object then null; end;

  -- permission_keys
  begin
    create policy state_permission_keys_select on public.state_permission_keys
      for select to authenticated
      using (true);
  exception when duplicate_object then null; end;

  begin
    create policy state_permission_keys_admin_write on public.state_permission_keys
      for all to authenticated
      using (public._is_app_admin())
      with check (public._is_app_admin());
  exception when duplicate_object then null; end;

  -- role_permissions
  begin
    create policy state_role_permissions_select on public.state_role_permissions
      for select to authenticated
      using (true);
  exception when duplicate_object then null; end;

  begin
    create policy state_role_permissions_admin_write on public.state_role_permissions
      for all to authenticated
      using (public._is_app_admin())
      with check (public._is_app_admin());
  exception when duplicate_object then null; end;

  -- memberships
  begin
    create policy state_memberships_select on public.state_memberships
      for select to authenticated
      using (true);
  exception when duplicate_object then null; end;

  begin
    create policy state_memberships_admin_write on public.state_memberships
      for all to authenticated
      using (public._is_app_admin())
      with check (public._is_app_admin());
  exception when duplicate_object then null; end;
end $$;

-- Seed system roles (safe)
insert into public.state_roles (role_key, display_name, rank, is_system)
values
  ('owner', 'Owner', 1, true),
  ('state_leader', 'State Leader', 10, true),
  ('viewer', 'Viewer', 100, true)
on conflict (role_key) do nothing;

-- Seed permission keys (you can expand later)
insert into public.state_permission_keys (key, description)
values
  ('state:view', 'View state dashboard'),
  ('state:announce:write', 'Create/edit state announcements'),
  ('state:leaders:manage', 'Manage state leaders')
on conflict (key) do nothing;

-- Default perms: state_leader can view
insert into public.state_role_permissions (role_key, permission_key, allowed)
values
  ('state_leader', 'state:view', true),
  ('viewer', 'state:view', true)
on conflict do nothing;

-- Best-effort schema cache refresh for PostgREST
do $$
begin
  perform pg_notify('pgrst', 'reload schema');
exception when others then null;
end $$;
