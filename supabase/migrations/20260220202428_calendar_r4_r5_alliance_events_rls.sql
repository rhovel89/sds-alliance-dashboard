-- Calendar edit permissions (R4/R5/Owner/Admin) for public.alliance_events
-- Safe: additive policies, does NOT disable RLS.
-- Idempotent: uses DO blocks + pg_policies checks.

begin;

-- Helper: return true if current user can edit events for this alliance id/code
create or replace function public.can_edit_alliance_events(p_alliance text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as \$\$
declare
  uid uuid := auth.uid();
  r text := null;
begin
  if uid is null then
    return false;
  end if;

  -- Owner / app admin shortcuts (if these RPCs exist)
  begin
    if public.is_dashboard_owner() then return true; end if;
  exception when undefined_function then null;
  end;

  begin
    if public.is_app_admin() then return true; end if;
  exception when undefined_function then null;
  end;

  -- Try membership tables (best-effort; safe if columns differ)
  if to_regclass('public.alliance_memberships') is not null then
    begin
      execute 'select lower(coalesce(role::text, role_key::text, rank::text, '''')) from public.alliance_memberships
               where user_id = \ and (alliance_id::text = \ or alliance_code::text = \) limit 1'
        into r using uid, p_alliance;
    exception when undefined_column then
      begin
        execute 'select lower(coalesce(role::text, role_key::text, rank::text, '''')) from public.alliance_memberships
                 where auth_user_id = \ and (alliance_id::text = \ or alliance_code::text = \) limit 1'
          into r using uid, p_alliance;
      exception when undefined_column then null;
      end;
    end;

    if r in ('owner','r5','r4','5','4','rank5','rank4') then return true; end if;
    r := null;
  end if;

  if to_regclass('public.alliance_members') is not null then
    begin
      execute 'select lower(coalesce(role::text, role_key::text, rank::text, '''')) from public.alliance_members
               where user_id = \ and (alliance_id::text = \ or alliance_code::text = \) limit 1'
        into r using uid, p_alliance;
    exception when undefined_column then
      begin
        execute 'select lower(coalesce(role::text, role_key::text, rank::text, '''')) from public.alliance_members
                 where auth_user_id = \ and (alliance_id::text = \ or alliance_code::text = \) limit 1'
          into r using uid, p_alliance;
      exception when undefined_column then null;
      end;
    end;

    if r in ('owner','r5','r4','5','4','rank5','rank4') then return true; end if;
    r := null;
  end if;

  if to_regclass('public.memberships') is not null then
    begin
      execute 'select lower(coalesce(role::text, role_key::text, rank::text, '''')) from public.memberships
               where user_id = \ and (alliance_id::text = \ or alliance_code::text = \) limit 1'
        into r using uid, p_alliance;
    exception when undefined_column then
      begin
        execute 'select lower(coalesce(role::text, role_key::text, rank::text, '''')) from public.memberships
                 where auth_user_id = \ and (alliance_id::text = \ or alliance_code::text = \) limit 1'
          into r using uid, p_alliance;
      exception when undefined_column then null;
      end;
    end;

    if r in ('owner','r5','r4','5','4','rank5','rank4') then return true; end if;
    r := null;
  end if;

  if to_regclass('public.alliance_users') is not null then
    begin
      execute 'select lower(coalesce(role::text, role_key::text, rank::text, '''')) from public.alliance_users
               where user_id = \ and (alliance_id::text = \ or alliance_code::text = \) limit 1'
        into r using uid, p_alliance;
    exception when undefined_column then
      begin
        execute 'select lower(coalesce(role::text, role_key::text, rank::text, '''')) from public.alliance_users
                 where auth_user_id = \ and (alliance_id::text = \ or alliance_code::text = \) limit 1'
          into r using uid, p_alliance;
      exception when undefined_column then null;
      end;
    end;

    if r in ('owner','r5','r4','5','4','rank5','rank4') then return true; end if;
  end if;

  return false;
end
\$\$;

-- Policies on alliance_events (only if table exists)
do \$\$
begin
  if to_regclass('public.alliance_events') is null then
    raise notice 'Skipping policies: public.alliance_events table not found.';
    return;
  end if;

  -- INSERT
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='alliance_events' and policyname='ae_ins_r4_r5'
  ) then
    execute 'create policy ae_ins_r4_r5 on public.alliance_events
             for insert to authenticated
             with check (public.can_edit_alliance_events(alliance_id::text))';
  end if;

  -- UPDATE
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='alliance_events' and policyname='ae_upd_r4_r5'
  ) then
    execute 'create policy ae_upd_r4_r5 on public.alliance_events
             for update to authenticated
             using (public.can_edit_alliance_events(alliance_id::text))
             with check (public.can_edit_alliance_events(alliance_id::text))';
  end if;

  -- DELETE
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='alliance_events' and policyname='ae_del_r4_r5'
  ) then
    execute 'create policy ae_del_r4_r5 on public.alliance_events
             for delete to authenticated
             using (public.can_edit_alliance_events(alliance_id::text))';
  end if;

end
\$\$;

commit;
