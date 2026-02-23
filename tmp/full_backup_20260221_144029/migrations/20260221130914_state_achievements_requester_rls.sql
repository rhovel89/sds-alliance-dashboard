-- ============================================================
-- State achievements: requester_user_id + RLS (idempotent)
-- Fixes frontend query expecting requester_user_id
-- ============================================================

-- Ensure column exists
alter table if exists public.state_achievement_requests
  add column if not exists requester_user_id uuid;

-- Keep updated_at in sync if column exists (optional, safe)
alter table if exists public.state_achievement_requests
  add column if not exists updated_at timestamptz;

-- Default requester_user_id to auth.uid() on insert/update
create or replace function public._sar_defaults()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.requester_user_id is null then
    new.requester_user_id := auth.uid();
  end if;

  -- updated_at best-effort
  begin
    new.updated_at := now();
  exception when others then
    null;
  end;

  return new;
end;
$$;

drop trigger if exists trg_sar_defaults on public.state_achievement_requests;
create trigger trg_sar_defaults
before insert or update on public.state_achievement_requests
for each row execute function public._sar_defaults();

-- Helper functions for RLS (view/edit)
create or replace function public.can_view_state_achievements(p_state text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    coalesce(public.is_app_admin(), false)
    or coalesce(public.is_dashboard_owner(), false)
    or exists (
      select 1
      from public.state_achievement_access a
      where a.state_code = p_state
        and a.user_id = auth.uid()
        and a.can_view = true
    );
$$;

create or replace function public.can_edit_state_achievements(p_state text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    coalesce(public.is_app_admin(), false)
    or coalesce(public.is_dashboard_owner(), false)
    or exists (
      select 1
      from public.state_achievement_access a
      where a.state_code = p_state
        and a.user_id = auth.uid()
        and a.can_edit = true
    );
$$;

-- Enable RLS
alter table if exists public.state_achievement_requests enable row level security;
alter table if exists public.state_achievement_types enable row level security;
alter table if exists public.state_achievement_options enable row level security;
alter table if exists public.state_achievement_access enable row level security;

-- ---------------------------
-- RLS: state_achievement_requests
-- ---------------------------
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='state_achievement_requests' and policyname='sar_select_own_or_helpers'
  ) then
    create policy sar_select_own_or_helpers
    on public.state_achievement_requests
    for select
    using (
      requester_user_id = auth.uid()
      or public.can_view_state_achievements(state_code)
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='state_achievement_requests' and policyname='sar_insert_own_or_helpers'
  ) then
    create policy sar_insert_own_or_helpers
    on public.state_achievement_requests
    for insert
    with check (
      requester_user_id = auth.uid()
      or public.can_edit_state_achievements(state_code)
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='state_achievement_requests' and policyname='sar_update_helpers'
  ) then
    create policy sar_update_helpers
    on public.state_achievement_requests
    for update
    using (
      requester_user_id = auth.uid()
      or public.can_edit_state_achievements(state_code)
    )
    with check (
      requester_user_id = auth.uid()
      or public.can_edit_state_achievements(state_code)
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='state_achievement_requests' and policyname='sar_delete_helpers'
  ) then
    create policy sar_delete_helpers
    on public.state_achievement_requests
    for delete
    using (
      public.can_edit_state_achievements(state_code)
    );
  end if;
end $$;

-- ---------------------------
-- RLS: types/options (read for all, write for editors)
-- ---------------------------
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='state_achievement_types' and policyname='sat_select_all'
  ) then
    create policy sat_select_all
    on public.state_achievement_types
    for select
    using ( true );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='state_achievement_types' and policyname='sat_write_editors'
  ) then
    create policy sat_write_editors
    on public.state_achievement_types
    for all
    using ( public.can_edit_state_achievements(state_code) )
    with check ( public.can_edit_state_achievements(state_code) );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='state_achievement_options' and policyname='sao_select_all'
  ) then
    create policy sao_select_all
    on public.state_achievement_options
    for select
    using ( true );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='state_achievement_options' and policyname='sao_write_editors'
  ) then
    create policy sao_write_editors
    on public.state_achievement_options
    for all
    using (
      exists (
        select 1 from public.state_achievement_types t
        where t.id = state_achievement_options.achievement_type_id
          and public.can_edit_state_achievements(t.state_code)
      )
    )
    with check (
      exists (
        select 1 from public.state_achievement_types t
        where t.id = state_achievement_options.achievement_type_id
          and public.can_edit_state_achievements(t.state_code)
      )
    );
  end if;
end $$;

-- ---------------------------
-- RLS: access table (owner/admin only via can_edit on that state)
-- ---------------------------
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='state_achievement_access' and policyname='saa_owner_select'
  ) then
    create policy saa_owner_select
    on public.state_achievement_access
    for select
    using ( public.can_edit_state_achievements(state_code) );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='state_achievement_access' and policyname='saa_owner_write'
  ) then
    create policy saa_owner_write
    on public.state_achievement_access
    for all
    using ( public.can_edit_state_achievements(state_code) )
    with check ( public.can_edit_state_achievements(state_code) );
  end if;
end $$;
