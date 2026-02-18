-- SAFE RLS: allow signed-in users to read their own players + memberships.
-- SAFE RLS: allow alliance members to read alliance_event_types, and Owner/R4/R5 to write.
-- Creates policies only if missing. Uses admin_expr='false' if is_app_admin() doesn't exist.

do $$
declare
  admin_expr text := 'false';
begin
  if to_regprocedure('public.is_app_admin(uuid)') is not null then
    admin_expr := 'public.is_app_admin(auth.uid())';
  end if;

  --------------------------------------------------------------------
  -- players
  --------------------------------------------------------------------
  if to_regclass('public.players') is not null then
    execute 'alter table public.players enable row level security';

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='players' and policyname='players_select_self'
    ) then
      execute format($sql$
        create policy players_select_self
        on public.players
        for select
        using (auth_user_id = auth.uid() or %s)
      $sql$, admin_expr);
    end if;

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='players' and policyname='players_insert_self'
    ) then
      execute format($sql$
        create policy players_insert_self
        on public.players
        for insert
        with check (auth_user_id = auth.uid() or %s)
      $sql$, admin_expr);
    end if;

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='players' and policyname='players_update_self'
    ) then
      execute format($sql$
        create policy players_update_self
        on public.players
        for update
        using (auth_user_id = auth.uid() or %s)
        with check (auth_user_id = auth.uid() or %s)
      $sql$, admin_expr, admin_expr);
    end if;
  end if;

  --------------------------------------------------------------------
  -- player_alliances
  --------------------------------------------------------------------
  if to_regclass('public.player_alliances') is not null then
    execute 'alter table public.player_alliances enable row level security';

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='player_alliances' and policyname='pa_select_self'
    ) then
      execute format($sql$
        create policy pa_select_self
        on public.player_alliances
        for select
        using (
          %s
          or exists (
            select 1 from public.players me
            where me.auth_user_id = auth.uid()
              and me.id = player_alliances.player_id
          )
        )
      $sql$, admin_expr);
    end if;

    -- admin-only write (use FOR ALL to avoid syntax error at comma)
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='player_alliances' and policyname='pa_admin_write'
    ) then
      execute format($sql$
        create policy pa_admin_write
        on public.player_alliances
        for all
        using (%s)
        with check (%s)
      $sql$, admin_expr, admin_expr);
    end if;
  end if;

  --------------------------------------------------------------------
  -- alliance_event_types
  --------------------------------------------------------------------
  if to_regclass('public.alliance_event_types') is not null then
    execute 'alter table public.alliance_event_types enable row level security';

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='alliance_event_types' and policyname='aet_select_members'
    ) then
      execute format($sql$
        create policy aet_select_members
        on public.alliance_event_types
        for select
        using (
          %s
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(alliance_event_types.alliance_code)
          )
        )
      $sql$, admin_expr);
    end if;

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='alliance_event_types' and policyname='aet_write_managers'
    ) then
      execute format($sql$
        create policy aet_write_managers
        on public.alliance_event_types
        for all
        using (
          %s
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(alliance_event_types.alliance_code)
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
        with check (
          %s
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(alliance_event_types.alliance_code)
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
      $sql$, admin_expr, admin_expr);
    end if;
  end if;

end $$;
