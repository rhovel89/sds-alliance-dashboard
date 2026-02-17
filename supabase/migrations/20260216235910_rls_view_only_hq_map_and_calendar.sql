-- Enforce: HQ Map + Calendar are VIEW-only unless role is Owner/R4/R5 (or app admin)
-- Uses: players(auth_user_id) + player_alliances(alliance_code, role)
-- Allows SELECT to alliance members; allows INSERT/UPDATE/DELETE only to Owner/R4/R5.
-- Safe: only applies if tables exist; policies created only if missing.

do $$
declare
  has_table boolean;
begin

  -- Helper predicates inlined in policies (no new functions required)

  --------------------------------------------------------------------
  -- alliance_hq_map (alliance_id is TEXT - assumed to be alliance code)
  --------------------------------------------------------------------
  has_table := to_regclass('public.alliance_hq_map') is not null;
  if has_table then
    execute 'alter table public.alliance_hq_map enable row level security';

    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='alliance_hq_map' and policyname='alliance_hq_map_select_members'
    ) then
      execute $p$
        create policy alliance_hq_map_select_members
        on public.alliance_hq_map
        for select
        using (
          is_app_admin(auth.uid())
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(alliance_hq_map.alliance_id)
          )
        )
      $p$;
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='alliance_hq_map' and policyname='alliance_hq_map_write_managers'
    ) then
      execute $p$
        create policy alliance_hq_map_write_managers
        on public.alliance_hq_map
        for all
        using (
          is_app_admin(auth.uid())
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(alliance_hq_map.alliance_id)
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
        with check (
          is_app_admin(auth.uid())
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(alliance_hq_map.alliance_id)
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
      $p$;
    end if;
  end if;

  --------------------------------------------------------------------
  -- alliance_hq_positions (alliance_id is TEXT - assumed to be alliance code)
  --------------------------------------------------------------------
  has_table := to_regclass('public.alliance_hq_positions') is not null;
  if has_table then
    execute 'alter table public.alliance_hq_positions enable row level security';

    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='alliance_hq_positions' and policyname='alliance_hq_positions_select_members'
    ) then
      execute $p$
        create policy alliance_hq_positions_select_members
        on public.alliance_hq_positions
        for select
        using (
          is_app_admin(auth.uid())
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(alliance_hq_positions.alliance_id)
          )
        )
      $p$;
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='alliance_hq_positions' and policyname='alliance_hq_positions_write_managers'
    ) then
      execute $p$
        create policy alliance_hq_positions_write_managers
        on public.alliance_hq_positions
        for all
        using (
          is_app_admin(auth.uid())
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(alliance_hq_positions.alliance_id)
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
        with check (
          is_app_admin(auth.uid())
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(alliance_hq_positions.alliance_id)
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
      $p$;
    end if;
  end if;

  --------------------------------------------------------------------
  -- alliance_buildings (alliance_id is UUID -> join to alliances.id)
  --------------------------------------------------------------------
  has_table := to_regclass('public.alliance_buildings') is not null;
  if has_table then
    execute 'alter table public.alliance_buildings enable row level security';

    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='alliance_buildings' and policyname='alliance_buildings_select_members'
    ) then
      execute $p$
        create policy alliance_buildings_select_members
        on public.alliance_buildings
        for select
        using (
          is_app_admin(auth.uid())
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            join public.alliances a on upper(a.code) = upper(pa.alliance_code)
            where me.auth_user_id = auth.uid()
              and a.id::text = alliance_buildings.alliance_id::text
          )
        )
      $p$;
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='alliance_buildings' and policyname='alliance_buildings_write_managers'
    ) then
      execute $p$
        create policy alliance_buildings_write_managers
        on public.alliance_buildings
        for all
        using (
          is_app_admin(auth.uid())
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            join public.alliances a on upper(a.code) = upper(pa.alliance_code)
            where me.auth_user_id = auth.uid()
              and a.id::text = alliance_buildings.alliance_id::text
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
        with check (
          is_app_admin(auth.uid())
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            join public.alliances a on upper(a.code) = upper(pa.alliance_code)
            where me.auth_user_id = auth.uid()
              and a.id::text = alliance_buildings.alliance_id::text
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
      $p$;
    end if;
  end if;

  --------------------------------------------------------------------
  -- alliance_hq_cells (alliance_id is UUID -> join to alliances.id)
  --------------------------------------------------------------------
  has_table := to_regclass('public.alliance_hq_cells') is not null;
  if has_table then
    execute 'alter table public.alliance_hq_cells enable row level security';

    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='alliance_hq_cells' and policyname='alliance_hq_cells_select_members'
    ) then
      execute $p$
        create policy alliance_hq_cells_select_members
        on public.alliance_hq_cells
        for select
        using (
          is_app_admin(auth.uid())
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            join public.alliances a on upper(a.code) = upper(pa.alliance_code)
            where me.auth_user_id = auth.uid()
              and a.id::text = alliance_hq_cells.alliance_id::text
          )
        )
      $p$;
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='alliance_hq_cells' and policyname='alliance_hq_cells_write_managers'
    ) then
      execute $p$
        create policy alliance_hq_cells_write_managers
        on public.alliance_hq_cells
        for all
        using (
          is_app_admin(auth.uid())
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            join public.alliances a on upper(a.code) = upper(pa.alliance_code)
            where me.auth_user_id = auth.uid()
              and a.id::text = alliance_hq_cells.alliance_id::text
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
        with check (
          is_app_admin(auth.uid())
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            join public.alliances a on upper(a.code) = upper(pa.alliance_code)
            where me.auth_user_id = auth.uid()
              and a.id::text = alliance_hq_cells.alliance_id::text
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
      $p$;
    end if;
  end if;

  --------------------------------------------------------------------
  -- alliance_events (Calendar) - try alliance_code first, then alliance_id(text)
  --------------------------------------------------------------------
  has_table := to_regclass('public.alliance_events') is not null;
  if has_table then
    execute 'alter table public.alliance_events enable row level security';

    -- If column alliance_code exists
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='alliance_events' and column_name='alliance_code'
    ) then

      if not exists (
        select 1 from pg_policies
        where schemaname='public' and tablename='alliance_events' and policyname='alliance_events_select_members'
      ) then
        execute $p$
          create policy alliance_events_select_members
          on public.alliance_events
          for select
          using (
            is_app_admin(auth.uid())
            or exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(alliance_events.alliance_code)
            )
          )
        $p$;
      end if;

      if not exists (
        select 1 from pg_policies
        where schemaname='public' and tablename='alliance_events' and policyname='alliance_events_write_managers'
      ) then
        execute $p$
          create policy alliance_events_write_managers
          on public.alliance_events
          for all
          using (
            is_app_admin(auth.uid())
            or exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(alliance_events.alliance_code)
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
          with check (
            is_app_admin(auth.uid())
            or exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(alliance_events.alliance_code)
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
        $p$;
      end if;

    -- Else if alliance_id exists and is text-like (we assume it's code)
    elsif exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='alliance_events' and column_name='alliance_id'
    ) then

      if not exists (
        select 1 from pg_policies
        where schemaname='public' and tablename='alliance_events' and policyname='alliance_events_select_members'
      ) then
        execute $p$
          create policy alliance_events_select_members
          on public.alliance_events
          for select
          using (
            is_app_admin(auth.uid())
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

      if not exists (
        select 1 from pg_policies
        where schemaname='public' and tablename='alliance_events' and policyname='alliance_events_write_managers'
      ) then
        execute $p$
          create policy alliance_events_write_managers
          on public.alliance_events
          for all
          using (
            is_app_admin(auth.uid())
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
            is_app_admin(auth.uid())
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

