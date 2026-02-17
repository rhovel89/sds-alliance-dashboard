-- Player ME Dashboard: Profiles + HQs + View-only HQ map/calendar unless Owner/R4/R5
-- Safe: policies created only if missing; works with mixed alliance_id column types.

create extension if not exists pgcrypto;

do $$
declare
  has_admin_fn boolean := false;
  admin_prefix text := '';
begin
  has_admin_fn := to_regprocedure('public.is_app_admin(uuid)') is not null;
  if has_admin_fn then
    admin_prefix := 'public.is_app_admin(auth.uid()) OR ';
  end if;

  --------------------------------------------------------------------
  -- player_alliance_profiles (only the owner player can CRUD)
  --------------------------------------------------------------------
  if to_regclass('public.player_alliance_profiles') is not null then
    execute 'create unique index if not exists player_alliance_profiles_uq on public.player_alliance_profiles(player_id, alliance_code)';
    execute 'alter table public.player_alliance_profiles enable row level security';

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='player_alliance_profiles' and policyname='pap_select_own') then
      execute $p$
        create policy pap_select_own
        on public.player_alliance_profiles
        for select
        using (
          exists (
            select 1 from public.players me
            where me.auth_user_id = auth.uid()
              and me.id = player_alliance_profiles.player_id
          )
        )
      $p$;
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='player_alliance_profiles' and policyname='pap_write_own') then
      execute $p$
        create policy pap_write_own
        on public.player_alliance_profiles
        for all
        using (
          exists (
            select 1 from public.players me
            where me.auth_user_id = auth.uid()
              and me.id = player_alliance_profiles.player_id
          )
        )
        with check (
          exists (
            select 1 from public.players me
            where me.auth_user_id = auth.uid()
              and me.id = player_alliance_profiles.player_id
          )
        )
      $p$;
    end if;
  end if;

  --------------------------------------------------------------------
  -- player_hqs (only the auth user can CRUD their HQ rows)
  --------------------------------------------------------------------
  if to_regclass('public.player_hqs') is not null then
    execute 'create index if not exists player_hqs_user_alliance_idx on public.player_hqs(user_id, alliance_id)';
    execute 'alter table public.player_hqs enable row level security';

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='player_hqs' and policyname='phq_select_own') then
      execute $p$
        create policy phq_select_own
        on public.player_hqs
        for select
        using (user_id = auth.uid())
      $p$;
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='player_hqs' and policyname='phq_write_own') then
      execute $p$
        create policy phq_write_own
        on public.player_hqs
        for all
        using (user_id = auth.uid())
        with check (user_id = auth.uid())
      $p$;
    end if;
  end if;

  --------------------------------------------------------------------
  -- Helper to build membership predicates (inline)
  --------------------------------------------------------------------
  -- For text code columns: compare upper(pa.alliance_code) = upper(table.col)
  -- For uuid alliance columns: compare via alliances table code:
  --   upper(pa.alliance_code) = upper((select a.code from alliances a where a.id = table.col))
  --------------------------------------------------------------------

  --------------------------------------------------------------------
  -- alliance_hq_map (alliance_id can be text OR uuid depending on schema)
  --------------------------------------------------------------------
  if to_regclass('public.alliance_hq_map') is not null then
    execute 'alter table public.alliance_hq_map enable row level security';

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_hq_map' and policyname='ahqm_select_members') then
      if exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='alliance_hq_map' and column_name='alliance_id' and data_type='uuid'
      ) then
        execute format($p$
          create policy ahqm_select_members
          on public.alliance_hq_map
          for select
          using (
            %s
            exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper((select a.code from public.alliances a where a.id = alliance_hq_map.alliance_id))
            )
          )
        $p$, admin_prefix);
      else
        execute format($p$
          create policy ahqm_select_members
          on public.alliance_hq_map
          for select
          using (
            %s
            exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(alliance_hq_map.alliance_id::text)
            )
          )
        $p$, admin_prefix);
      end if;
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_hq_map' and policyname='ahqm_write_managers') then
      if exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='alliance_hq_map' and column_name='alliance_id' and data_type='uuid'
      ) then
        execute format($p$
          create policy ahqm_write_managers
          on public.alliance_hq_map
          for all
          using (
            %s
            exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper((select a.code from public.alliances a where a.id = alliance_hq_map.alliance_id))
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
          with check (
            %s
            exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper((select a.code from public.alliances a where a.id = alliance_hq_map.alliance_id))
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
        $p$, admin_prefix, admin_prefix);
      else
        execute format($p$
          create policy ahqm_write_managers
          on public.alliance_hq_map
          for all
          using (
            %s
            exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(alliance_hq_map.alliance_id::text)
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
          with check (
            %s
            exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(alliance_hq_map.alliance_id::text)
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
        $p$, admin_prefix, admin_prefix);
      end if;
    end if;
  end if;

  --------------------------------------------------------------------
  -- alliance_events (Calendar) supports alliance_code OR alliance_id (uuid/text)
  --------------------------------------------------------------------
  if to_regclass('public.alliance_events') is not null then
    execute 'alter table public.alliance_events enable row level security';

    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='alliance_events' and column_name='alliance_code'
    ) then
      if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_events' and policyname='ae_select_members') then
        execute format($p$
          create policy ae_select_members
          on public.alliance_events
          for select
          using (
            %s
            exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(alliance_events.alliance_code::text)
            )
          )
        $p$, admin_prefix);
      end if;

      if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_events' and policyname='ae_write_managers') then
        execute format($p$
          create policy ae_write_managers
          on public.alliance_events
          for all
          using (
            %s
            exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(alliance_events.alliance_code::text)
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
          with check (
            %s
            exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(alliance_events.alliance_code::text)
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
        $p$, admin_prefix, admin_prefix);
      end if;

    elsif exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='alliance_events' and column_name='alliance_id' and data_type='uuid'
    ) then
      if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_events' and policyname='ae_select_members') then
        execute format($p$
          create policy ae_select_members
          on public.alliance_events
          for select
          using (
            %s
            exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper((select a.code from public.alliances a where a.id = alliance_events.alliance_id))
            )
          )
        $p$, admin_prefix);
      end if;

      if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_events' and policyname='ae_write_managers') then
        execute format($p$
          create policy ae_write_managers
          on public.alliance_events
          for all
          using (
            %s
            exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper((select a.code from public.alliances a where a.id = alliance_events.alliance_id))
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
          with check (
            %s
            exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper((select a.code from public.alliances a where a.id = alliance_events.alliance_id))
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
        $p$, admin_prefix, admin_prefix);
      end if;

    elsif exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='alliance_events' and column_name='alliance_id'
    ) then
      -- alliance_id treated as text code
      if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_events' and policyname='ae_select_members') then
        execute format($p$
          create policy ae_select_members
          on public.alliance_events
          for select
          using (
            %s
            exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(alliance_events.alliance_id::text)
            )
          )
        $p$, admin_prefix);
      end if;

      if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_events' and policyname='ae_write_managers') then
        execute format($p$
          create policy ae_write_managers
          on public.alliance_events
          for all
          using (
            %s
            exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(alliance_events.alliance_id::text)
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
          with check (
            %s
            exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(alliance_events.alliance_id::text)
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
        $p$, admin_prefix, admin_prefix);
      end if;
    end if;
  end if;

end $$;

