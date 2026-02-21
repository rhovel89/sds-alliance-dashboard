-- ============================================================
-- State Achievements Schema + RLS (idempotent)
-- Tables:
--  - public.state_achievement_types
--  - public.state_achievement_options
--  - public.state_achievement_requests
--  - public.state_achievement_access
--
-- Notes:
--  - DOES NOT disable RLS
--  - Uses public.is_dashboard_owner() if present (already in your app)
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- TYPES ----------
create table if not exists public.state_achievement_types (
  id uuid primary key default gen_random_uuid(),
  state_code text not null,
  name text not null,
  kind text not null default 'generic', -- generic | swp_weapon | governor_count
  requires_option boolean not null default false,
  required_count int not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'state_achievement_types_state_name_uniq'
  ) then
    alter table public.state_achievement_types
      add constraint state_achievement_types_state_name_uniq unique (state_code, name);
  end if;
end $$;

-- ---------- OPTIONS ----------
create table if not exists public.state_achievement_options (
  id uuid primary key default gen_random_uuid(),
  achievement_type_id uuid not null references public.state_achievement_types(id) on delete cascade,
  label text not null,
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'state_achievement_options_type_label_uniq'
  ) then
    alter table public.state_achievement_options
      add constraint state_achievement_options_type_label_uniq unique (achievement_type_id, label);
  end if;
end $$;

-- ---------- ACCESS ----------
create table if not exists public.state_achievement_access (
  id uuid primary key default gen_random_uuid(),
  state_code text not null,
  user_id uuid not null,
  can_view boolean not null default true,
  can_edit boolean not null default false,
  can_manage_types boolean not null default false,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'state_achievement_access_state_user_uniq'
  ) then
    alter table public.state_achievement_access
      add constraint state_achievement_access_state_user_uniq unique (state_code, user_id);
  end if;
end $$;

-- ---------- REQUESTS ----------
create table if not exists public.state_achievement_requests (
  id uuid primary key default gen_random_uuid(),
  state_code text not null,
  requester_user_id uuid not null default auth.uid(),
  player_name text not null,
  alliance_name text not null,
  achievement_type_id uuid not null references public.state_achievement_types(id),
  option_id uuid references public.state_achievement_options(id),
  status text not null default 'submitted', -- submitted | in_progress | completed | denied
  current_count int not null default 0,
  required_count int not null default 1,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'state_achievement_requests_status_chk'
  ) then
    alter table public.state_achievement_requests
      add constraint state_achievement_requests_status_chk
      check (status in ('submitted','in_progress','completed','denied'));
  end if;
end $$;

-- ---------- TRIGGERS: sync required_count + enforce requires_option ----------
create or replace function public.state_ach_requests_sync_required()
returns trigger
language plpgsql
as $$
declare
  v_required int;
  v_requires_option boolean;
begin
  select required_count, requires_option
    into v_required, v_requires_option
  from public.state_achievement_types
  where id = new.achievement_type_id;

  if v_required is null then
    raise exception 'Invalid achievement_type_id';
  end if;

  new.required_count := v_required;

  if v_requires_option = true and new.option_id is null then
    raise exception 'This achievement requires an option (weapon).';
  end if;

  if new.requester_user_id is null then
    new.requester_user_id := auth.uid();
  end if;

  new.updated_at := now();

  return new;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'tr_state_ach_req_sync_required') then
    create trigger tr_state_ach_req_sync_required
      before insert or update of achievement_type_id, option_id on public.state_achievement_requests
      for each row
      execute function public.state_ach_requests_sync_required();
  end if;
end $$;

create or replace function public.state_ach_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'tr_state_ach_types_updated') then
    create trigger tr_state_ach_types_updated
      before update on public.state_achievement_types
      for each row execute function public.state_ach_set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'tr_state_ach_opts_updated') then
    create trigger tr_state_ach_opts_updated
      before update on public.state_achievement_options
      for each row execute function public.state_ach_set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'tr_state_ach_reqs_updated') then
    create trigger tr_state_ach_reqs_updated
      before update on public.state_achievement_requests
      for each row execute function public.state_ach_set_updated_at();
  end if;
end $$;

-- ---------- RLS ----------
alter table public.state_achievement_types enable row level security;
alter table public.state_achievement_options enable row level security;
alter table public.state_achievement_requests enable row level security;
alter table public.state_achievement_access enable row level security;

-- TYPES policies
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_types' and policyname='sat_select_active') then
    create policy sat_select_active on public.state_achievement_types
      for select to authenticated
      using (active = true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_types' and policyname='sat_manage_owner_or_access') then
    create policy sat_manage_owner_or_access on public.state_achievement_types
      for all to authenticated
      using (
        public.is_dashboard_owner()
        or exists (
          select 1 from public.state_achievement_access a
          where a.state_code = state_achievement_types.state_code
            and a.user_id = auth.uid()
            and a.can_manage_types = true
        )
      )
      with check (
        public.is_dashboard_owner()
        or exists (
          select 1 from public.state_achievement_access a
          where a.state_code = state_achievement_types.state_code
            and a.user_id = auth.uid()
            and a.can_manage_types = true
        )
      );
  end if;
end $$;

-- OPTIONS policies
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_options' and policyname='sao_select_active') then
    create policy sao_select_active on public.state_achievement_options
      for select to authenticated
      using (active = true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_options' and policyname='sao_manage_owner_or_access') then
    create policy sao_manage_owner_or_access on public.state_achievement_options
      for all to authenticated
      using (
        public.is_dashboard_owner()
        or exists (
          select 1
          from public.state_achievement_types t
          join public.state_achievement_access a on a.state_code = t.state_code and a.user_id = auth.uid()
          where t.id = state_achievement_options.achievement_type_id
            and a.can_manage_types = true
        )
      )
      with check (
        public.is_dashboard_owner()
        or exists (
          select 1
          from public.state_achievement_types t
          join public.state_achievement_access a on a.state_code = t.state_code and a.user_id = auth.uid()
          where t.id = state_achievement_options.achievement_type_id
            and a.can_manage_types = true
        )
      );
  end if;
end $$;

-- ACCESS policies (owner only)
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_access' and policyname='saa_owner_all') then
    create policy saa_owner_all on public.state_achievement_access
      for all to authenticated
      using (public.is_dashboard_owner())
      with check (public.is_dashboard_owner());
  end if;
end $$;

-- REQUESTS policies
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_requests' and policyname='sar_select_owner_or_access_or_self') then
    create policy sar_select_owner_or_access_or_self on public.state_achievement_requests
      for select to authenticated
      using (
        public.is_dashboard_owner()
        or requester_user_id = auth.uid()
        or exists (
          select 1 from public.state_achievement_access a
          where a.state_code = state_achievement_requests.state_code
            and a.user_id = auth.uid()
            and a.can_view = true
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_requests' and policyname='sar_insert_self') then
    create policy sar_insert_self on public.state_achievement_requests
      for insert to authenticated
      with check (
        requester_user_id = auth.uid()
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_requests' and policyname='sar_update_owner_or_edit') then
    create policy sar_update_owner_or_edit on public.state_achievement_requests
      for update to authenticated
      using (
        public.is_dashboard_owner()
        or exists (
          select 1 from public.state_achievement_access a
          where a.state_code = state_achievement_requests.state_code
            and a.user_id = auth.uid()
            and a.can_edit = true
        )
      )
      with check (
        public.is_dashboard_owner()
        or exists (
          select 1 from public.state_achievement_access a
          where a.state_code = state_achievement_requests.state_code
            and a.user_id = auth.uid()
            and a.can_edit = true
        )
      );
  end if;
end $$;