-- RBAC wiring (SAFE) + Owner hard-coded
-- Owner hard-coded rules:
--   1) is_app_admin(auth.uid()) => TRUE for everything (global superuser)
--   2) player_alliances.role = 'owner' => TRUE for everything in that alliance
--
-- This adds:
--   - rbac_has_permission(alliance_code, perm_key)
--   - rbac_my_permissions(alliance_code)
--   - RLS self-read on players + player_alliances
--   - RBAC-based RLS for announcements/guides/hq_map/calendar (if tables exist)

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- RBAC: permission check for current user (SECURITY DEFINER)
-- ------------------------------------------------------------
create or replace function public.rbac_has_permission(p_alliance_code text, p_perm_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_role text;
  v_role_key text;
  v_role_id uuid;
  v_perm_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  -- Global hard-coded owner/admin
  if to_regprocedure('public.is_app_admin(uuid)') is not null and public.is_app_admin(auth.uid()) then
    return true;
  end if;

  -- Resolve player id
  select p.id into v_player_id
  from public.players p
  where p.auth_user_id = auth.uid()
  limit 1;

  if v_player_id is null then
    return false;
  end if;

  -- Resolve alliance membership + role (default member if null)
  select pa.role into v_role
  from public.player_alliances pa
  where pa.player_id = v_player_id
    and upper(pa.alliance_code) = upper(p_alliance_code)
  limit 1;

  v_role_key := lower(trim(coalesce(v_role, 'member')));

  -- Alliance Owner hard-coded full control
  if v_role_key = 'owner' then
    return true;
  end if;

  -- If RBAC tables aren't present yet, fallback to legacy behavior:
  --   - any member can read
  --   - only owner/r4/r5 can write
  if to_regclass('public.app_roles') is null
     or to_regclass('public.app_permissions') is null
     or to_regclass('public.app_role_permissions') is null then
    if right(p_perm_key, 6) = '.write' then
      return v_role_key in ('owner','r4','r5');
    else
      return true;
    end if;
  end if;

  -- Map role key -> role id (fallback to member if unknown)
  select r.id into v_role_id
  from public.app_roles r
  where r.key = v_role_key
  limit 1;

  if v_role_id is null then
    select r.id into v_role_id
    from public.app_roles r
    where r.key = 'member'
    limit 1;
  end if;

  -- Map permission key -> id
  select p.id into v_perm_id
  from public.app_permissions p
  where p.key = p_perm_key
  limit 1;

  if v_role_id is null or v_perm_id is null then
    return false;
  end if;

  return exists(
    select 1
    from public.app_role_permissions rp
    where rp.role_id = v_role_id
      and rp.permission_id = v_perm_id
  );
end;
$$;

revoke all on function public.rbac_has_permission(text,text) from public;
grant execute on function public.rbac_has_permission(text,text) to authenticated;

-- ------------------------------------------------------------
-- Convenience: list permissions for current user in an alliance
-- ------------------------------------------------------------
create or replace function public.rbac_my_permissions(p_alliance_code text)
returns setof text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_role text;
  v_role_key text;
  v_role_id uuid;
begin
  if auth.uid() is null then
    return;
  end if;

  if to_regprocedure('public.is_app_admin(uuid)') is not null and public.is_app_admin(auth.uid()) then
    return query select key from public.app_permissions order by key;
    return;
  end if;

  select p.id into v_player_id
  from public.players p
  where p.auth_user_id = auth.uid()
  limit 1;

  if v_player_id is null then
    return;
  end if;

  select pa.role into v_role
  from public.player_alliances pa
  where pa.player_id = v_player_id
    and upper(pa.alliance_code) = upper(p_alliance_code)
  limit 1;

  v_role_key := lower(trim(coalesce(v_role,'member')));

  if v_role_key = 'owner' then
    return query select key from public.app_permissions order by key;
    return;
  end if;

  if to_regclass('public.app_roles') is null
     or to_regclass('public.app_permissions') is null
     or to_regclass('public.app_role_permissions') is null then
    -- Legacy fallback: treat member as read-all, r4/r5 as read+write
    return query
      select unnest(array[
        'announcements.read','guides.read','hq_map.read','calendar.read',
        case when v_role_key in ('r4','r5') then 'announcements.write' else null end,
        case when v_role_key in ('r4','r5') then 'guides.write' else null end,
        case when v_role_key in ('r4','r5') then 'hq_map.write' else null end,
        case when v_role_key in ('r4','r5') then 'calendar.write' else null end
      ]::text[])
      where unnest is not null;
    return;
  end if;

  select r.id into v_role_id
  from public.app_roles r
  where r.key = v_role_key
  limit 1;

  if v_role_id is null then
    select r.id into v_role_id
    from public.app_roles r
    where r.key = 'member'
    limit 1;
  end if;

  if v_role_id is null then
    return;
  end if;

  return query
    select p.key
    from public.app_role_permissions rp
    join public.app_permissions p on p.id = rp.permission_id
    where rp.role_id = v_role_id
    order by p.key;
end;
$$;

revoke all on function public.rbac_my_permissions(text) from public;
grant execute on function public.rbac_my_permissions(text) to authenticated;

-- ------------------------------------------------------------
-- RLS: players + player_alliances self-read (SAFE)
-- (Fixes membership reads that cause "missing alliance" / onboarding loops)
-- ------------------------------------------------------------
do $$
begin
  -- players
  if to_regclass('public.players') is not null then
    execute 'alter table public.players enable row level security';

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='players' and policyname='players_select_self') then
      execute $p$
        create policy players_select_self
        on public.players
        for select
        using (
          auth_user_id = auth.uid()
          or (to_regprocedure('public.is_app_admin(uuid)') is not null and public.is_app_admin(auth.uid()))
        )
      $p$;
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='players' and policyname='players_insert_self') then
      execute $p$
        create policy players_insert_self
        on public.players
        for insert
        with check (
          auth_user_id = auth.uid()
          or (to_regprocedure('public.is_app_admin(uuid)') is not null and public.is_app_admin(auth.uid()))
        )
      $p$;
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='players' and policyname='players_update_self') then
      execute $p$
        create policy players_update_self
        on public.players
        for update
        using (
          auth_user_id = auth.uid()
          or (to_regprocedure('public.is_app_admin(uuid)') is not null and public.is_app_admin(auth.uid()))
        )
        with check (
          auth_user_id = auth.uid()
          or (to_regprocedure('public.is_app_admin(uuid)') is not null and public.is_app_admin(auth.uid()))
        )
      $p$;
    end if;
  end if;

  -- player_alliances
  if to_regclass('public.player_alliances') is not null then
    execute 'alter table public.player_alliances enable row level security';

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='player_alliances' and policyname='pa_select_self') then
      execute $p$
        create policy pa_select_self
        on public.player_alliances
        for select
        using (
          exists (
            select 1 from public.players me
            where me.auth_user_id = auth.uid()
              and me.id = player_alliances.player_id
          )
          or (to_regprocedure('public.is_app_admin(uuid)') is not null and public.is_app_admin(auth.uid()))
        )
      $p$;
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='player_alliances' and policyname='pa_admin_all') then
      execute $p$
        create policy pa_admin_all
        on public.player_alliances
        for all
        using (to_regprocedure('public.is_app_admin(uuid)') is not null and public.is_app_admin(auth.uid()))
        with check (to_regprocedure('public.is_app_admin(uuid)') is not null and public.is_app_admin(auth.uid()))
      $p$;
    end if;
  end if;
end $$;

-- ------------------------------------------------------------
-- RLS: Alliance content tables wired to RBAC (SAFE; only if exist)
-- ------------------------------------------------------------
do $$
declare
  has_tbl boolean;
  is_uuid boolean;
begin
  -- alliance_announcements (alliance_code)
  has_tbl := to_regclass('public.alliance_announcements') is not null;
  if has_tbl then
    execute 'alter table public.alliance_announcements enable row level security';

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_announcements' and policyname='aa_read_rbac') then
      execute $p$
        create policy aa_read_rbac
        on public.alliance_announcements
        for select
        using (public.rbac_has_permission(alliance_code::text, 'announcements.read'))
      $p$;
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_announcements' and policyname='aa_insert_rbac') then
      execute $p$
        create policy aa_insert_rbac
        on public.alliance_announcements
        for insert
        with check (public.rbac_has_permission(alliance_code::text, 'announcements.write'))
      $p$;
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_announcements' and policyname='aa_update_rbac') then
      execute $p$
        create policy aa_update_rbac
        on public.alliance_announcements
        for update
        using (public.rbac_has_permission(alliance_code::text, 'announcements.write'))
        with check (public.rbac_has_permission(alliance_code::text, 'announcements.write'))
      $p$;
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_announcements' and policyname='aa_delete_rbac') then
      execute $p$
        create policy aa_delete_rbac
        on public.alliance_announcements
        for delete
        using (public.rbac_has_permission(alliance_code::text, 'announcements.write'))
      $p$;
    end if;
  end if;

  -- guide_sections (alliance_code)
  has_tbl := to_regclass('public.guide_sections') is not null;
  if has_tbl then
    execute 'alter table public.guide_sections enable row level security';

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='guide_sections' and policyname='gs_read_rbac') then
      execute $p$
        create policy gs_read_rbac
        on public.guide_sections
        for select
        using (public.rbac_has_permission(alliance_code::text, 'guides.read'))
      $p$;
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='guide_sections' and policyname='gs_insert_rbac') then
      execute $p$
        create policy gs_insert_rbac
        on public.guide_sections
        for insert
        with check (public.rbac_has_permission(alliance_code::text, 'guides.write'))
      $p$;
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='guide_sections' and policyname='gs_update_rbac') then
      execute $p$
        create policy gs_update_rbac
        on public.guide_sections
        for update
        using (public.rbac_has_permission(alliance_code::text, 'guides.write'))
        with check (public.rbac_has_permission(alliance_code::text, 'guides.write'))
      $p$;
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='guide_sections' and policyname='gs_delete_rbac') then
      execute $p$
        create policy gs_delete_rbac
        on public.guide_sections
        for delete
        using (public.rbac_has_permission(alliance_code::text, 'guides.write'))
      $p$;
    end if;
  end if;

  -- alliance_hq_map (alliance_id could be text OR uuid)
  has_tbl := to_regclass('public.alliance_hq_map') is not null;
  if has_tbl then
    execute 'alter table public.alliance_hq_map enable row level security';

    is_uuid := exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='alliance_hq_map' and column_name='alliance_id' and data_type='uuid'
    );

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_hq_map' and policyname='ahqm_read_rbac') then
      if is_uuid then
        execute $p$
          create policy ahqm_read_rbac
          on public.alliance_hq_map
          for select
          using (
            public.rbac_has_permission(
              (select a.code from public.alliances a where a.id = alliance_hq_map.alliance_id),
              'hq_map.read'
            )
          )
        $p$;
      else
        execute $p$
          create policy ahqm_read_rbac
          on public.alliance_hq_map
          for select
          using (public.rbac_has_permission(alliance_id::text, 'hq_map.read'))
        $p$;
      end if;
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_hq_map' and policyname='ahqm_write_rbac_ins') then
      if is_uuid then
        execute $p$
          create policy ahqm_write_rbac_ins
          on public.alliance_hq_map
          for insert
          with check (
            public.rbac_has_permission(
              (select a.code from public.alliances a where a.id = alliance_hq_map.alliance_id),
              'hq_map.write'
            )
          )
        $p$;
      else
        execute $p$
          create policy ahqm_write_rbac_ins
          on public.alliance_hq_map
          for insert
          with check (public.rbac_has_permission(alliance_id::text, 'hq_map.write'))
        $p$;
      end if;
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_hq_map' and policyname='ahqm_write_rbac_upd') then
      if is_uuid then
        execute $p$
          create policy ahqm_write_rbac_upd
          on public.alliance_hq_map
          for update
          using (
            public.rbac_has_permission(
              (select a.code from public.alliances a where a.id = alliance_hq_map.alliance_id),
              'hq_map.write'
            )
          )
          with check (
            public.rbac_has_permission(
              (select a.code from public.alliances a where a.id = alliance_hq_map.alliance_id),
              'hq_map.write'
            )
          )
        $p$;
      else
        execute $p$
          create policy ahqm_write_rbac_upd
          on public.alliance_hq_map
          for update
          using (public.rbac_has_permission(alliance_id::text, 'hq_map.write'))
          with check (public.rbac_has_permission(alliance_id::text, 'hq_map.write'))
        $p$;
      end if;
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_hq_map' and policyname='ahqm_write_rbac_del') then
      if is_uuid then
        execute $p$
          create policy ahqm_write_rbac_del
          on public.alliance_hq_map
          for delete
          using (
            public.rbac_has_permission(
              (select a.code from public.alliances a where a.id = alliance_hq_map.alliance_id),
              'hq_map.write'
            )
          )
        $p$;
      else
        execute $p$
          create policy ahqm_write_rbac_del
          on public.alliance_hq_map
          for delete
          using (public.rbac_has_permission(alliance_id::text, 'hq_map.write'))
        $p$;
      end if;
    end if;
  end if;

  -- alliance_events (calendar) supports alliance_code OR alliance_id
  has_tbl := to_regclass('public.alliance_events') is not null;
  if has_tbl then
    execute 'alter table public.alliance_events enable row level security';

    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='alliance_events' and column_name='alliance_code'
    ) then
      if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_events' and policyname='ae_read_rbac') then
        execute $p$
          create policy ae_read_rbac
          on public.alliance_events
          for select
          using (public.rbac_has_permission(alliance_code::text, 'calendar.read'))
        $p$;
      end if;

      if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_events' and policyname='ae_ins_rbac') then
        execute $p$
          create policy ae_ins_rbac
          on public.alliance_events
          for insert
          with check (public.rbac_has_permission(alliance_code::text, 'calendar.write'))
        $p$;
      end if;

      if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_events' and policyname='ae_upd_rbac') then
        execute $p$
          create policy ae_upd_rbac
          on public.alliance_events
          for update
          using (public.rbac_has_permission(alliance_code::text, 'calendar.write'))
          with check (public.rbac_has_permission(alliance_code::text, 'calendar.write'))
        $p$;
      end if;

      if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_events' and policyname='ae_del_rbac') then
        execute $p$
          create policy ae_del_rbac
          on public.alliance_events
          for delete
          using (public.rbac_has_permission(alliance_code::text, 'calendar.write'))
        $p$;
      end if;

    elsif exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='alliance_events' and column_name='alliance_id' and data_type='uuid'
    ) then
      if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_events' and policyname='ae_read_rbac') then
        execute $p$
          create policy ae_read_rbac
          on public.alliance_events
          for select
          using (
            public.rbac_has_permission(
              (select a.code from public.alliances a where a.id = alliance_events.alliance_id),
              'calendar.read'
            )
          )
        $p$;
      end if;

      if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_events' and policyname='ae_ins_rbac') then
        execute $p$
          create policy ae_ins_rbac
          on public.alliance_events
          for insert
          with check (
            public.rbac_has_permission(
              (select a.code from public.alliances a where a.id = alliance_events.alliance_id),
              'calendar.write'
            )
          )
        $p$;
      end if;

      if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_events' and policyname='ae_upd_rbac') then
        execute $p$
          create policy ae_upd_rbac
          on public.alliance_events
          for update
          using (
            public.rbac_has_permission(
              (select a.code from public.alliances a where a.id = alliance_events.alliance_id),
              'calendar.write'
            )
          )
          with check (
            public.rbac_has_permission(
              (select a.code from public.alliances a where a.id = alliance_events.alliance_id),
              'calendar.write'
            )
          )
        $p$;
      end if;

      if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_events' and policyname='ae_del_rbac') then
        execute $p$
          create policy ae_del_rbac
          on public.alliance_events
          for delete
          using (
            public.rbac_has_permission(
              (select a.code from public.alliances a where a.id = alliance_events.alliance_id),
              'calendar.write'
            )
          )
        $p$;
      end if;

    elsif exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='alliance_events' and column_name='alliance_id'
    ) then
      -- alliance_id treated as text code
      if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_events' and policyname='ae_read_rbac') then
        execute $p$
          create policy ae_read_rbac
          on public.alliance_events
          for select
          using (public.rbac_has_permission(alliance_id::text, 'calendar.read'))
        $p$;
      end if;

      if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_events' and policyname='ae_ins_rbac') then
        execute $p$
          create policy ae_ins_rbac
          on public.alliance_events
          for insert
          with check (public.rbac_has_permission(alliance_id::text, 'calendar.write'))
        $p$;
      end if;

      if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_events' and policyname='ae_upd_rbac') then
        execute $p$
          create policy ae_upd_rbac
          on public.alliance_events
          for update
          using (public.rbac_has_permission(alliance_id::text, 'calendar.write'))
          with check (public.rbac_has_permission(alliance_id::text, 'calendar.write'))
        $p$;
      end if;

      if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_events' and policyname='ae_del_rbac') then
        execute $p$
          create policy ae_del_rbac
          on public.alliance_events
          for delete
          using (public.rbac_has_permission(alliance_id::text, 'calendar.write'))
        $p$;
      end if;
    end if;
  end if;

end $$;
