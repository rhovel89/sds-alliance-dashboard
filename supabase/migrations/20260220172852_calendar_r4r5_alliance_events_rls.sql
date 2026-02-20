-- ============================================================
-- Calendar: alliance_events RLS (idempotent)
-- Uses alliance_events.alliance_id (since alliance_code is missing)
-- Editors: Owner/R5/R4 + app admins (via existing helper functions)
-- ============================================================

-- helper: user_can_edit_calendar(text)
create or replace function public.user_can_edit_calendar(p_alliance text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare v boolean;
begin
  -- Prefer existing role-based helper if present
  if to_regprocedure('public.user_can_edit_guides(text)') is not null then
    execute 'select public.user_can_edit_guides($1)' into v using p_alliance;
    return coalesce(v, false);
  end if;

  -- Owner override (either function name might exist)
  if to_regprocedure('public.is_dashboard_owner_current()') is not null then
    execute 'select public.is_dashboard_owner_current()' into v;
    if coalesce(v,false) then return true; end if;
  end if;
  if to_regprocedure('public.is_dashboard_owner()') is not null then
    execute 'select public.is_dashboard_owner()' into v;
    if coalesce(v,false) then return true; end if;
  end if;

  -- App admin
  if to_regprocedure('public.is_app_admin_current()') is not null then
    execute 'select public.is_app_admin_current()' into v;
    if coalesce(v,false) then return true; end if;
  end if;
  if to_regprocedure('public.is_app_admin()') is not null then
    execute 'select public.is_app_admin()' into v;
    if coalesce(v,false) then return true; end if;
  end if;

  return false;
end $$;

-- RLS policies on alliance_events
alter table public.alliance_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='alliance_events'
      and policyname='ae_select_members'
  ) then
    execute 'create policy ae_select_members
             on public.alliance_events
             for select
             using (public.user_has_alliance_access(alliance_id::text))';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='alliance_events'
      and policyname='ae_insert_editors'
  ) then
    execute 'create policy ae_insert_editors
             on public.alliance_events
             for insert
             with check (public.user_can_edit_calendar(alliance_id::text))';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='alliance_events'
      and policyname='ae_update_editors'
  ) then
    execute 'create policy ae_update_editors
             on public.alliance_events
             for update
             using (public.user_can_edit_calendar(alliance_id::text))
             with check (public.user_can_edit_calendar(alliance_id::text))';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='alliance_events'
      and policyname='ae_delete_editors'
  ) then
    execute 'create policy ae_delete_editors
             on public.alliance_events
             for delete
             using (public.user_can_edit_calendar(alliance_id::text))';
  end if;
end $$;

grant select, insert, update, delete on public.alliance_events to authenticated;