-- SAFE RLS: allow signed-in users to read what they need for /me + alliance pages.
-- Adds policies only if missing. Handles is_app_admin() OR is_app_admin(uuid) if present.

do $$
declare
  has_admin0 boolean := false;
  has_admin1 boolean := false;
begin
  has_admin0 := to_regprocedure('public.is_app_admin()') is not null;
  has_admin1 := to_regprocedure('public.is_app_admin(uuid)') is not null;

  --------------------------------------------------------------------
  -- players: self read + self insert/update (needed by /me bootstrap)
  --------------------------------------------------------------------
  if to_regclass('public.players') is not null then
    execute 'alter table public.players enable row level security';

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='players' and policyname='players_select_self') then
      execute $p$
        create policy players_select_self
        on public.players
        for select
        using (auth_user_id = auth.uid())
      $p$;
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='players' and policyname='players_insert_self') then
      execute $p$
        create policy players_insert_self
        on public.players
        for insert
        with check (auth_user_id = auth.uid())
      $p$;
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='players' and policyname='players_update_self') then
      execute $p$
        create policy players_update_self
        on public.players
        for update
        using (auth_user_id = auth.uid())
        with check (auth_user_id = auth.uid())
      $p$;
    end if;
  end if;

  --------------------------------------------------------------------
  -- player_alliances: user can read their memberships; admins can manage
  --------------------------------------------------------------------
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
        )
      $p$;
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='player_alliances' and policyname='pa_admin_manage') then
      if has_admin0 then
        execute $p$
          create policy pa_admin_manage
          on public.player_alliances
          for all
          using (public.is_app_admin())
          with check (public.is_app_admin())
        $p$;
      elsif has_admin1 then
        execute $p$
          create policy pa_admin_manage
          on public.player_alliances
          for all
          using (public.is_app_admin(auth.uid()))
          with check (public.is_app_admin(auth.uid()))
        $p$;
      end if;
    end if;
  end if;

  --------------------------------------------------------------------
  -- alliance_announcements: members can read; managers can write
  --------------------------------------------------------------------
  if to_regclass('public.alliance_announcements') is not null then
    execute 'alter table public.alliance_announcements enable row level security';

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_announcements' and policyname='aa_select_members') then
      if has_admin0 then
        execute $p$
          create policy aa_select_members
          on public.alliance_announcements
          for select
          using (
            public.is_app_admin()
            or exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(alliance_announcements.alliance_code)
            )
          )
        $p$;
      elsif has_admin1 then
        execute $p$
          create policy aa_select_members
          on public.alliance_announcements
          for select
          using (
            public.is_app_admin(auth.uid())
            or exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(alliance_announcements.alliance_code)
            )
          )
        $p$;
      else
        execute $p$
          create policy aa_select_members
          on public.alliance_announcements
          for select
          using (
            exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(alliance_announcements.alliance_code)
            )
          )
        $p$;
      end if;
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='alliance_announcements' and policyname='aa_write_managers') then
      execute $p$
        create policy aa_write_managers
        on public.alliance_announcements
        for all
        using (
          exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(alliance_announcements.alliance_code)
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
        with check (
          exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(alliance_announcements.alliance_code)
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
      $p$;
    end if;
  end if;

  --------------------------------------------------------------------
  -- guide_sections: members can read; managers can write
  --------------------------------------------------------------------
  if to_regclass('public.guide_sections') is not null then
    execute 'alter table public.guide_sections enable row level security';

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='guide_sections' and policyname='gs_select_members') then
      if has_admin0 then
        execute $p$
          create policy gs_select_members
          on public.guide_sections
          for select
          using (
            public.is_app_admin()
            or exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(guide_sections.alliance_code)
            )
          )
        $p$;
      elsif has_admin1 then
        execute $p$
          create policy gs_select_members
          on public.guide_sections
          for select
          using (
            public.is_app_admin(auth.uid())
            or exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(guide_sections.alliance_code)
            )
          )
        $p$;
      else
        execute $p$
          create policy gs_select_members
          on public.guide_sections
          for select
          using (
            exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and upper(pa.alliance_code) = upper(guide_sections.alliance_code)
            )
          )
        $p$;
      end if;
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='guide_sections' and policyname='gs_write_managers') then
      execute $p$
        create policy gs_write_managers
        on public.guide_sections
        for all
        using (
          exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(guide_sections.alliance_code)
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
        with check (
          exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(guide_sections.alliance_code)
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
      $p$;
    end if;
  end if;

end $$;
