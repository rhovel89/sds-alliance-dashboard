-- ============================================================
-- MINIMAL State Achievements: Types, Options, Requests, Access
-- State 789:
--   - SWP Weapon (requires weapon option)
--   - Governor (3x) (count-based)
-- RLS enforced via is_app_admin / is_dashboard_owner + access table.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.state_achievement_types (
  id uuid primary key default gen_random_uuid(),
  state_code text not null default '789',
  name text not null,
  kind text not null default 'generic', -- generic | swp_weapon | governor_count
  requires_option boolean not null default false,
  required_count integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.state_achievement_options (
  id uuid primary key default gen_random_uuid(),
  achievement_type_id uuid not null references public.state_achievement_types(id) on delete cascade,
  label text not null,
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.state_achievement_requests (
  id uuid primary key default gen_random_uuid(),
  state_code text not null default '789',
  player_name text not null,
  alliance_name text not null,
  achievement_type_id uuid not null references public.state_achievement_types(id),
  option_id uuid references public.state_achievement_options(id),
  status text not null default 'submitted', -- submitted | in_progress | completed | denied
  current_count integer not null default 0,
  required_count integer not null default 1,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.state_achievement_access (
  id uuid primary key default gen_random_uuid(),
  state_code text not null default '789',
  user_id uuid not null,
  can_view boolean not null default true,
  can_edit boolean not null default false,
  can_manage_types boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sat_state_name_uniq') then
    alter table public.state_achievement_types
      add constraint sat_state_name_uniq unique (state_code, name);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sat_kind_chk') then
    alter table public.state_achievement_types
      add constraint sat_kind_chk check (kind in ('generic','swp_weapon','governor_count'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sareq_status_chk') then
    alter table public.state_achievement_requests
      add constraint sareq_status_chk check (status in ('submitted','in_progress','completed','denied'));
  end if;
end $$;

create or replace function public.tg_state_achievements_touch()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  req_count integer;
begin
  new.updated_at := now();
  new.updated_by := auth.uid();

  if tg_table_name = 'state_achievement_requests' then
    select required_count into req_count
      from public.state_achievement_types
      where id = new.achievement_type_id;

    if req_count is not null then
      new.required_count := req_count;
    end if;

    if new.current_count is null then
      new.current_count := 0;
    end if;

    if new.current_count >= coalesce(new.required_count, 1) then
      new.status := 'completed';
      if new.completed_at is null then
        new.completed_at := now();
      end if;
    else
      if new.status <> 'denied' and new.current_count > 0 then
        new.status := 'in_progress';
      end if;
      if new.status <> 'completed' then
        new.completed_at := null;
      end if;
    end if;
  end if;

  return new;
end $$;

drop trigger if exists trg_state_achievement_types_touch on public.state_achievement_types;
create trigger trg_state_achievement_types_touch
before update on public.state_achievement_types
for each row execute function public.tg_state_achievements_touch();

drop trigger if exists trg_state_achievement_options_touch on public.state_achievement_options;
create trigger trg_state_achievement_options_touch
before update on public.state_achievement_options
for each row execute function public.tg_state_achievements_touch();

drop trigger if exists trg_state_achievement_requests_touch on public.state_achievement_requests;
create trigger trg_state_achievement_requests_touch
before insert or update on public.state_achievement_requests
for each row execute function public.tg_state_achievements_touch();

alter table public.state_achievement_types enable row level security;
alter table public.state_achievement_options enable row level security;
alter table public.state_achievement_requests enable row level security;
alter table public.state_achievement_access enable row level security;

-- Access table
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_access' and policyname='saa_select_self_or_owner') then
    create policy saa_select_self_or_owner on public.state_achievement_access
      for select to authenticated
      using (public.is_dashboard_owner() or public.is_app_admin() or user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_access' and policyname='saa_modify_owner_only') then
    create policy saa_modify_owner_only on public.state_achievement_access
      for all to authenticated
      using (public.is_dashboard_owner() or public.is_app_admin())
      with check (public.is_dashboard_owner() or public.is_app_admin());
  end if;
end $$;

-- Types
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_types' and policyname='sat_select_auth') then
    create policy sat_select_auth on public.state_achievement_types
      for select to authenticated
      using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_types' and policyname='sat_modify_owner_or_mgr') then
    create policy sat_modify_owner_or_mgr on public.state_achievement_types
      for all to authenticated
      using (
        public.is_dashboard_owner()
        or public.is_app_admin()
        or exists (
          select 1 from public.state_achievement_access a
          where a.user_id = auth.uid()
            and a.state_code = state_achievement_types.state_code
            and a.can_manage_types = true
        )
      )
      with check (
        public.is_dashboard_owner()
        or public.is_app_admin()
        or exists (
          select 1 from public.state_achievement_access a
          where a.user_id = auth.uid()
            and a.state_code = state_achievement_types.state_code
            and a.can_manage_types = true
        )
      );
  end if;
end $$;

-- Options
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_options' and policyname='sao_select_auth') then
    create policy sao_select_auth on public.state_achievement_options
      for select to authenticated
      using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_options' and policyname='sao_modify_owner_or_mgr') then
    create policy sao_modify_owner_or_mgr on public.state_achievement_options
      for all to authenticated
      using (
        public.is_dashboard_owner()
        or public.is_app_admin()
        or exists (
          select 1 from public.state_achievement_access a
          join public.state_achievement_types t on t.id = state_achievement_options.achievement_type_id
          where a.user_id = auth.uid()
            and a.state_code = t.state_code
            and a.can_manage_types = true
        )
      )
      with check (
        public.is_dashboard_owner()
        or public.is_app_admin()
        or exists (
          select 1 from public.state_achievement_access a
          join public.state_achievement_types t on t.id = state_achievement_options.achievement_type_id
          where a.user_id = auth.uid()
            and a.state_code = t.state_code
            and a.can_manage_types = true
        )
      );
  end if;
end $$;

-- Requests
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_requests' and policyname='sareq_insert_auth') then
    create policy sareq_insert_auth on public.state_achievement_requests
      for insert to authenticated
      with check (auth.uid() is not null);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_requests' and policyname='sareq_select_owner_access_or_self') then
    create policy sareq_select_owner_access_or_self on public.state_achievement_requests
      for select to authenticated
      using (
        public.is_dashboard_owner()
        or public.is_app_admin()
        or created_by = auth.uid()
        or exists (
          select 1 from public.state_achievement_access a
          where a.user_id = auth.uid()
            and a.state_code = state_achievement_requests.state_code
            and a.can_view = true
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_requests' and policyname='sareq_update_owner_or_editor') then
    create policy sareq_update_owner_or_editor on public.state_achievement_requests
      for update to authenticated
      using (
        public.is_dashboard_owner()
        or public.is_app_admin()
        or exists (
          select 1 from public.state_achievement_access a
          where a.user_id = auth.uid()
            and a.state_code = state_achievement_requests.state_code
            and a.can_edit = true
        )
      )
      with check (
        public.is_dashboard_owner()
        or public.is_app_admin()
        or exists (
          select 1 from public.state_achievement_access a
          where a.user_id = auth.uid()
            and a.state_code = state_achievement_requests.state_code
            and a.can_edit = true
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_achievement_requests' and policyname='sareq_delete_owner_or_editor') then
    create policy sareq_delete_owner_or_editor on public.state_achievement_requests
      for delete to authenticated
      using (
        public.is_dashboard_owner()
        or public.is_app_admin()
        or exists (
          select 1 from public.state_achievement_access a
          where a.user_id = auth.uid()
            and a.state_code = state_achievement_requests.state_code
            and a.can_edit = true
        )
      );
  end if;
end $$;

-- Seed: SWP Weapon + Governor (3x) + Rail Gun
insert into public.state_achievement_types (state_code, name, kind, requires_option, required_count, active)
select '789', 'SWP Weapon', 'swp_weapon', true, 1, true
where not exists (select 1 from public.state_achievement_types where state_code='789' and name='SWP Weapon');

insert into public.state_achievement_types (state_code, name, kind, requires_option, required_count, active)
select '789', 'Governor (3x)', 'governor_count', false, 3, true
where not exists (select 1 from public.state_achievement_types where state_code='789' and name='Governor (3x)');

insert into public.state_achievement_options (achievement_type_id, label, sort, active)
select t.id, 'Rail Gun', 1, true
from public.state_achievement_types t
where t.state_code='789' and t.name='SWP Weapon'
and not exists (
  select 1 from public.state_achievement_options o
  where o.achievement_type_id=t.id and o.label='Rail Gun'
);