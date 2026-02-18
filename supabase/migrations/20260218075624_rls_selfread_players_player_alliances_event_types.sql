-- RLS: allow signed-in users to read their own players + memberships
-- and allow app admins to manage memberships / event types.
-- SAFE: creates policies only if missing. Avoids referencing is_app_admin if it doesn't exist.

do $$
declare
  admin_cond text := 'false';
  has_col boolean := false;
begin
  if to_regprocedure('public.is_app_admin(uuid)') is not null then
    admin_cond := 'public.is_app_admin(auth.uid())';
  end if;

  --------------------------------------------------------------------
  -- players: self read + self write (admins too)
  --------------------------------------------------------------------
  if to_regclass('public.players') is not null then
    execute 'alter table public.players enable row level security';

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='players' and policyname='players_select_self'
    ) then
      execute format($p$
        create policy players_select_self
        on public.players
        for select
        using (auth_user_id = auth.uid() or %s)
      $p$, admin_cond);
    end if;

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='players' and policyname='players_insert_self'
    ) then
      execute format($p$
        create policy players_insert_self
        on public.players
        for insert
        with check (auth_user_id = auth.uid() or %s)
      $p$, admin_cond);
    end if;

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='players' and policyname='players_update_self'
    ) then
      execute format($p$
        create policy players_update_self
        on public.players
        for update
        using (auth_user_id = auth.uid() or %s)
        with check (auth_user_id = auth.uid() or %s)
      $p$, admin_cond, admin_cond);
    end if;
  end if;

  --------------------------------------------------------------------
  -- player_alliances: user can read own memberships; admins manage
  --------------------------------------------------------------------
  if to_regclass('public.player_alliances') is not null then
    execute 'alter table public.player_alliances enable row level security';

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='player_alliances' and policyname='pa_select_self'
    ) then
      execute format($p$
        create policy pa_select_self
        on public.player_alliances
        for select
        using (
          exists (
            select 1 from public.players me
            where me.auth_user_id = auth.uid()
              and me.id = player_alliances.player_id
          )
          or %s
        )
      $p$, admin_cond);
    end if;

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='player_alliances' and policyname='pa_admin_all'
    ) then
      execute format($p$
        create policy pa_admin_all
        on public.player_alliances
        for all
        using (%s)
        with check (%s)
      $p$, admin_cond, admin_cond);
    end if;
  end if;

  --------------------------------------------------------------------
  -- alliance_event_types: members can read; admins can write
  -- Supports alliance_code OR alliance_id (text/uuid)
  --------------------------------------------------------------------
  if to_regclass('public.alliance_event_types') is not null then
    execute 'alter table public.alliance_event_types enable row level security';

    -- SELECT policy (members + admins)
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='alliance_event_types' and policyname='aet_select_members'
    ) then

      -- Prefer alliance_code if present
      has_col := exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='alliance_event_types' and column_name='alliance_code'
      );

      if has_col then
        execute format($p$
          create policy aet_select_members
          on public.alliance_event_types
          for select
          using (
            %s
            exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(alliance_event_types.alliance_code)
            )
          )
        $p$, admin_cond);
      else
        -- otherwise use alliance_id; detect uuid vs text
        if exists (
          select 1 from information_schema.columns
          where table_schema='public' and table_name='alliance_event_types'
            and column_name='alliance_id' and data_type='uuid'
        ) then
          execute format($p$
            create policy aet_select_members
            on public.alliance_event_types
            for select
            using (
              %s
              exists (
                select 1
                from public.players me
                join public.player_alliances pa on pa.player_id = me.id
                where me.auth_user_id = auth.uid()
                  and upper(pa.alliance_code) = upper((select a.code from public.alliances a where a.id = alliance_event_types.alliance_id))
              )
            )
          $p$, admin_cond);
        else
          execute format($p$
            create policy aet_select_members
            on public.alliance_event_types
            for select
            using (
              %s
              exists (
                select 1
                from public.players me
                join public.player_alliances pa on pa.player_id = me.id
                where me.auth_user_id = auth.uid()
                  and upper(pa.alliance_code) = upper(alliance_event_types.alliance_id::text)
              )
            )
          $p$, admin_cond);
        end if;
      end if;
    end if;

    -- ADMIN write policy
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='alliance_event_types' and policyname='aet_admin_all'
    ) then
      execute format($p$
        create policy aet_admin_all
        on public.alliance_event_types
        for all
        using (%s)
        with check (%s)
      $p$, admin_cond, admin_cond);
    end if;
  end if;

end $$;
