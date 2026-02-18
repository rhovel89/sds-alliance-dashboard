-- Option 1: Owner assignment RPCs
-- Option 3: View-only RLS for HQ Map + Calendar for non Owner/R4/R5
-- Safe/idempotent: creates only if missing.

create extension if not exists pgcrypto;

do $$
declare
  alliance_id_type text;
  ev_has_alliance_code boolean;
  ev_alliance_id_type text;
begin
  --------------------------------------------------------------------
  -- player_alliances: ensure uniqueness + RLS supports membership checks
  --------------------------------------------------------------------
  if to_regclass('public.player_alliances') is not null then
    execute 'create unique index if not exists player_alliances_uq on public.player_alliances(player_id, alliance_code)';
    execute 'alter table public.player_alliances enable row level security';

    -- users can SELECT their own memberships (needed for RLS EXISTS checks elsewhere)
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='player_alliances' and policyname='pa_select_own'
    ) then
      execute $p$
        create policy pa_select_own
        on public.player_alliances
        for select
        using (
          exists (
            select 1
            from public.players me
            where me.auth_user_id = auth.uid()
              and me.id = player_alliances.player_id
          )
        )
      $p$;
    end if;

    -- app admins can do anything
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='player_alliances' and policyname='pa_admin_all'
    ) then
      execute $p$
        create policy pa_admin_all
        on public.player_alliances
        for all
        using (public.is_app_admin())
        with check (public.is_app_admin())
      $p$;
    end if;
  end if;

  --------------------------------------------------------------------
  -- HQ MAP TABLES: VIEW-only unless Owner/R4/R5
  -- We support tables where alliance_id is TEXT (code) or UUID (alliances.id)
  --------------------------------------------------------------------

  -- alliance_hq_map
  if to_regclass('public.alliance_hq_map') is not null then
    execute 'alter table public.alliance_hq_map enable row level security';

    select c.data_type into alliance_id_type
    from information_schema.columns c
    where c.table_schema='public' and c.table_name='alliance_hq_map' and c.column_name='alliance_id'
    limit 1;

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='alliance_hq_map' and policyname='ahqm_select_members'
    ) then
      if alliance_id_type = 'uuid' then
        execute $p$
          create policy ahqm_select_members
          on public.alliance_hq_map
          for select
          using (
            public.is_app_admin()
            or exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              join public.alliances a on upper(a.code) = upper(pa.alliance_code)
              where me.auth_user_id = auth.uid()
                and a.id = alliance_hq_map.alliance_id
            )
          )
        $p$;
      else
        execute $p$
          create policy ahqm_select_members
          on public.alliance_hq_map
          for select
          using (
            public.is_app_admin()
            or exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(alliance_hq_map.alliance_id::text)
            )
          )
        $p$;
      end if;
    end if;

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='alliance_hq_map' and policyname='ahqm_write_managers'
    ) then
      if alliance_id_type = 'uuid' then
        execute $p$
          create policy ahqm_write_managers
          on public.alliance_hq_map
          for all
          using (
            public.is_app_admin()
            or exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              join public.alliances a on upper(a.code) = upper(pa.alliance_code)
              where me.auth_user_id = auth.uid()
                and a.id = alliance_hq_map.alliance_id
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
          with check (
            public.is_app_admin()
            or exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              join public.alliances a on upper(a.code) = upper(pa.alliance_code)
              where me.auth_user_id = auth.uid()
                and a.id = alliance_hq_map.alliance_id
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
        $p$;
      else
        execute $p$
          create policy ahqm_write_managers
          on public.alliance_hq_map
          for all
          using (
            public.is_app_admin()
            or exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(alliance_hq_map.alliance_id::text)
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
          with check (
            public.is_app_admin()
            or exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(alliance_hq_map.alliance_id::text)
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
        $p$;
      end if;
    end if;
  end if;

  -- hq_map (older table)
  if to_regclass('public.hq_map') is not null then
    execute 'alter table public.hq_map enable row level security';

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='hq_map' and policyname='hqmap_select_members'
    ) then
      execute $p$
        create policy hqmap_select_members
        on public.hq_map
        for select
        using (
          public.is_app_admin()
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(hq_map.alliance_id::text)
          )
        )
      $p$;
    end if;

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='hq_map' and policyname='hqmap_write_managers'
    ) then
      execute $p$
        create policy hqmap_write_managers
        on public.hq_map
        for all
        using (
          public.is_app_admin()
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(hq_map.alliance_id::text)
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
        with check (
          public.is_app_admin()
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(hq_map.alliance_id::text)
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
      $p$;
    end if;
  end if;

  --------------------------------------------------------------------
  -- Calendar: alliance_events (supports alliance_code OR alliance_id)
  --------------------------------------------------------------------
  if to_regclass('public.alliance_events') is not null then
    execute 'alter table public.alliance_events enable row level security';

    select exists(
      select 1 from information_schema.columns
      where table_schema='public' and table_name='alliance_events' and column_name='alliance_code'
    ) into ev_has_alliance_code;

    select c.data_type into ev_alliance_id_type
    from information_schema.columns c
    where c.table_schema='public' and c.table_name='alliance_events' and c.column_name='alliance_id'
    limit 1;

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='alliance_events' and policyname='ae_select_members'
    ) then
      if ev_has_alliance_code then
        execute $p$
          create policy ae_select_members
          on public.alliance_events
          for select
          using (
            public.is_app_admin()
            or exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(alliance_events.alliance_code::text)
            )
          )
        $p$;
      elsif ev_alliance_id_type = 'uuid' then
        execute $p$
          create policy ae_select_members
          on public.alliance_events
          for select
          using (
            public.is_app_admin()
            or exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              join public.alliances a on upper(a.code) = upper(pa.alliance_code)
              where me.auth_user_id = auth.uid()
                and a.id = alliance_events.alliance_id
            )
          )
        $p$;
      else
        execute $p$
          create policy ae_select_members
          on public.alliance_events
          for select
          using (
            public.is_app_admin()
            or exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(alliance_events.alliance_id::text)
            )
          )
        $p$;
      end if;
    end if;

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='alliance_events' and policyname='ae_write_managers'
    ) then
      if ev_has_alliance_code then
        execute $p$
          create policy ae_write_managers
          on public.alliance_events
          for all
          using (
            public.is_app_admin()
            or exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(alliance_events.alliance_code::text)
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
          with check (
            public.is_app_admin()
            or exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(alliance_events.alliance_code::text)
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
        $p$;
      elsif ev_alliance_id_type = 'uuid' then
        execute $p$
          create policy ae_write_managers
          on public.alliance_events
          for all
          using (
            public.is_app_admin()
            or exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              join public.alliances a on upper(a.code) = upper(pa.alliance_code)
              where me.auth_user_id = auth.uid()
                and a.id = alliance_events.alliance_id
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
          with check (
            public.is_app_admin()
            or exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              join public.alliances a on upper(a.code) = upper(pa.alliance_code)
              where me.auth_user_id = auth.uid()
                and a.id = alliance_events.alliance_id
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
        $p$;
      else
        execute $p$
          create policy ae_write_managers
          on public.alliance_events
          for all
          using (
            public.is_app_admin()
            or exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(alliance_events.alliance_id::text)
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
          with check (
            public.is_app_admin()
            or exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(alliance_events.alliance_id::text)
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
        $p$;
      end if;
    end if;
  end if;

end $$;

--------------------------------------------------------------------
-- Option 1 RPCs (SECURITY DEFINER)
--------------------------------------------------------------------

create or replace function public.owner_assign_player_to_alliance(
  p_auth_user_id uuid,
  p_alliance_code text,
  p_role text default 'Member'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_code text;
  v_role text;
begin
  if not public.is_app_admin() then
    raise exception 'not authorized';
  end if;

  v_code := upper(trim(coalesce(p_alliance_code,'')));
  if v_code = '' then
    raise exception 'alliance code required';
  end if;

  if not exists (select 1 from public.alliances a where upper(a.code) = v_code) then
    raise exception 'alliance % not found', v_code;
  end if;

  if p_auth_user_id is null then
    raise exception 'auth user id required';
  end if;

  select id into v_player_id from public.players where auth_user_id = p_auth_user_id limit 1;

  if v_player_id is null then
    -- best-effort create player row
    insert into public.players(auth_user_id) values (p_auth_user_id);
    select id into v_player_id from public.players where auth_user_id = p_auth_user_id limit 1;
  end if;

  if v_player_id is null then
    raise exception 'could not resolve/create player row for auth user id';
  end if;

  v_role := coalesce(nullif(trim(p_role),''), 'Member');

  insert into public.player_alliances(player_id, alliance_code, role)
  values (v_player_id, v_code, v_role)
  on conflict (player_id, alliance_code) do update
    set role = excluded.role;
end;
$$;

create or replace function public.owner_remove_player_from_alliance(
  p_auth_user_id uuid,
  p_alliance_code text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_code text;
begin
  if not public.is_app_admin() then
    raise exception 'not authorized';
  end if;

  v_code := upper(trim(coalesce(p_alliance_code,'')));
  if v_code = '' then
    raise exception 'alliance code required';
  end if;

  if p_auth_user_id is null then
    raise exception 'auth user id required';
  end if;

  select id into v_player_id from public.players where auth_user_id = p_auth_user_id limit 1;
  if v_player_id is null then
    -- nothing to do
    return;
  end if;

  delete from public.player_alliances
  where player_id = v_player_id
    and upper(alliance_code) = v_code;
end;
$$;

create or replace function public.owner_list_player_alliances(
  p_auth_user_id uuid
)
returns table(alliance_code text, role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
begin
  if not public.is_app_admin() then
    raise exception 'not authorized';
  end if;

  select id into v_player_id from public.players where auth_user_id = p_auth_user_id limit 1;

  return query
  select pa.alliance_code, pa.role
  from public.player_alliances pa
  where pa.player_id = v_player_id
  order by pa.alliance_code asc;
end;
$$;
