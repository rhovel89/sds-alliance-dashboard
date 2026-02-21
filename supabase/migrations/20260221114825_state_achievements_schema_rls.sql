-- ============================================================
-- State Achievements schema + RLS (idempotent)
-- Tables:
--   public.state_achievement_types
--   public.state_achievement_options
--   public.state_achievement_requests
--   public.state_achievement_access
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- helpers ----------
create or replace function public.sad_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.sad_state_ach_request_defaults()
returns trigger
language plpgsql
as $$
declare
  rc int;
begin
  -- ensure requester set (never trust client)
  if new.requester_user_id is null then
    new.requester_user_id = auth.uid();
  end if;

  -- fill required_count from type if missing/invalid
  if new.achievement_type_id is not null then
    select coalesce(required_count, 1) into rc
    from public.state_achievement_types
    where id = new.achievement_type_id;

    if rc is null then rc := 1; end if;

    if new.required_count is null or new.required_count < 1 then
      new.required_count = rc;
    end if;
  end if;

  if new.current_count is null or new.current_count < 0 then
    new.current_count = 0;
  end if;

  if new.status is null or new.status = '' then
    new.status = 'submitted';
  end if;

  return new;
end;
$$;

create or replace function public.sad_state_ach_request_autocomplete()
returns trigger
language plpgsql
as $$
declare
  req int;
begin
  req := coalesce(new.required_count, 1);
  if req < 1 then req := 1; end if;

  if new.current_count is null then new.current_count := 0; end if;

  if new.status = 'completed' or new.current_count >= req then
    new.status = 'completed';
    if new.completed_at is null then
      new.completed_at = now();
    end if;
  end if;

  return new;
end;
$$;

-- ---------- tables ----------
create table if not exists public.state_achievement_types (
  id uuid primary key default gen_random_uuid(),
  state_code text not null,
  name text not null,
  kind text not null default 'generic',
  requires_option boolean not null default false,
  required_count int not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (state_code, name)
);

create table if not exists public.state_achievement_options (
  id uuid primary key default gen_random_uuid(),
  achievement_type_id uuid not null references public.state_achievement_types(id) on delete cascade,
  label text not null,
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (achievement_type_id, label)
);

create table if not exists public.state_achievement_requests (
  id uuid primary key default gen_random_uuid(),
  state_code text not null,
  requester_user_id uuid,
  player_name text not null,
  alliance_name text not null,
  achievement_type_id uuid not null references public.state_achievement_types(id),
  option_id uuid references public.state_achievement_options(id),
  status text not null default 'submitted',
  current_count int not null default 0,
  required_count int not null default 1,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.state_achievement_access (
  id uuid primary key default gen_random_uuid(),
  state_code text not null,
  user_id uuid not null,
  can_view boolean not null default true,
  can_edit boolean not null default false,
  can_manage_types boolean not null default false,
  created_at timestamptz not null default now(),
  unique (state_code, user_id)
);

-- ---------- triggers (drop/recreate safely) ----------
do $$
begin
  if exists (select 1 from pg_trigger where tgname = 'tr_state_ach_types_updated_at') then
    drop trigger tr_state_ach_types_updated_at on public.state_achievement_types;
  end if;
  create trigger tr_state_ach_types_updated_at
  before update on public.state_achievement_types
  for each row execute function public.sad_set_updated_at();

  if exists (select 1 from pg_trigger where tgname = 'tr_state_ach_opts_updated_at') then
    drop trigger tr_state_ach_opts_updated_at on public.state_achievement_options;
  end if;
  create trigger tr_state_ach_opts_updated_at
  before update on public.state_achievement_options
  for each row execute function public.sad_set_updated_at();

  if exists (select 1 from pg_trigger where tgname = 'tr_state_ach_req_updated_at') then
    drop trigger tr_state_ach_req_updated_at on public.state_achievement_requests;
  end if;
  create trigger tr_state_ach_req_updated_at
  before update on public.state_achievement_requests
  for each row execute function public.sad_set_updated_at();

  if exists (select 1 from pg_trigger where tgname = 'tr_state_ach_req_defaults') then
    drop trigger tr_state_ach_req_defaults on public.state_achievement_requests;
  end if;
  create trigger tr_state_ach_req_defaults
  before insert on public.state_achievement_requests
  for each row execute function public.sad_state_ach_request_defaults();

  if exists (select 1 from pg_trigger where tgname = 'tr_state_ach_req_autocomplete') then
    drop trigger tr_state_ach_req_autocomplete on public.state_achievement_requests;
  end if;
  create trigger tr_state_ach_req_autocomplete
  before insert or update on public.state_achievement_requests
  for each row execute function public.sad_state_ach_request_autocomplete();
end $$;

-- ---------- RLS ----------
alter table public.state_achievement_types enable row level security;
alter table public.state_achievement_options enable row level security;
alter table public.state_achievement_requests enable row level security;
alter table public.state_achievement_access enable row level security;

-- NOTE: We assume these already exist in your DB:
--   public.is_app_admin() and public.is_dashboard_owner()
-- If they don't, RLS will error; we'll add them later only if needed.

-- Types: anyone authenticated can read; only owner/app_admin/access(can_manage_types) can write
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_types' and policyname='sat_select_auth') then
    create policy sat_select_auth on public.state_achievement_types
      for select to authenticated
      using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_types' and policyname='sat_write_managers') then
    create policy sat_write_managers on public.state_achievement_types
      for all to authenticated
      using (
        public.is_dashboard_owner() = true
        or public.is_app_admin() = true
        or exists (
          select 1 from public.state_achievement_access a
          where a.state_code = state_achievement_types.state_code
            and a.user_id = auth.uid()
            and a.can_manage_types = true
        )
      )
      with check (
        public.is_dashboard_owner() = true
        or public.is_app_admin() = true
        or exists (
          select 1 from public.state_achievement_access a
          where a.state_code = state_achievement_types.state_code
            and a.user_id = auth.uid()
            and a.can_manage_types = true
        )
      );
  end if;
end $$;

-- Options: same permissions as types (derived via achievement_type_id)
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_options' and policyname='sao_select_auth') then
    create policy sao_select_auth on public.state_achievement_options
      for select to authenticated
      using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_options' and policyname='sao_write_managers') then
    create policy sao_write_managers on public.state_achievement_options
      for all to authenticated
      using (
        public.is_dashboard_owner() = true
        or public.is_app_admin() = true
        or exists (
          select 1
          from public.state_achievement_types t
          join public.state_achievement_access a on a.state_code = t.state_code
          where t.id = state_achievement_options.achievement_type_id
            and a.user_id = auth.uid()
            and a.can_manage_types = true
        )
      )
      with check (
        public.is_dashboard_owner() = true
        or public.is_app_admin() = true
        or exists (
          select 1
          from public.state_achievement_types t
          join public.state_achievement_access a on a.state_code = t.state_code
          where t.id = state_achievement_options.achievement_type_id
            and a.user_id = auth.uid()
            and a.can_manage_types = true
        )
      );
  end if;
end $$;

-- Requests:
-- - insert: any authenticated (requester_user_id is set by trigger)
-- - select: requester OR owner/app_admin OR access(can_view)
-- - update: owner/app_admin OR access(can_edit)
-- - delete: owner/app_admin only
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_requests' and policyname='sar_insert_auth') then
    create policy sar_insert_auth on public.state_achievement_requests
      for insert to authenticated
      with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_requests' and policyname='sar_select_scoped') then
    create policy sar_select_scoped on public.state_achievement_requests
      for select to authenticated
      using (
        requester_user_id = auth.uid()
        or public.is_dashboard_owner() = true
        or public.is_app_admin() = true
        or exists (
          select 1 from public.state_achievement_access a
          where a.state_code = state_achievement_requests.state_code
            and a.user_id = auth.uid()
            and a.can_view = true
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_requests' and policyname='sar_update_editors') then
    create policy sar_update_editors on public.state_achievement_requests
      for update to authenticated
      using (
        public.is_dashboard_owner() = true
        or public.is_app_admin() = true
        or exists (
          select 1 from public.state_achievement_access a
          where a.state_code = state_achievement_requests.state_code
            and a.user_id = auth.uid()
            and a.can_edit = true
        )
      )
      with check (
        public.is_dashboard_owner() = true
        or public.is_app_admin() = true
        or exists (
          select 1 from public.state_achievement_access a
          where a.state_code = state_achievement_requests.state_code
            and a.user_id = auth.uid()
            and a.can_edit = true
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_requests' and policyname='sar_delete_owner') then
    create policy sar_delete_owner on public.state_achievement_requests
      for delete to authenticated
      using (public.is_dashboard_owner() = true or public.is_app_admin() = true);
  end if;
end $$;

-- Access table: owner/app_admin only
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_access' and policyname='saa_owner_all') then
    create policy saa_owner_all on public.state_achievement_access
      for all to authenticated
      using (public.is_dashboard_owner() = true or public.is_app_admin() = true)
      with check (public.is_dashboard_owner() = true or public.is_app_admin() = true);
  end if;
end $$;