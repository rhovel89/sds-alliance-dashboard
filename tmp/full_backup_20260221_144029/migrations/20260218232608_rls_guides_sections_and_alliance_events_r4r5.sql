-- SAFE RLS: Guide Sections + Alliance Events
-- Members can READ. Owner/R4/R5 can WRITE. (Optional app-admin bypass if public.is_app_admin(uuid) exists)
-- Creates policies only if missing. Does NOT drop/replace existing policies.

do $$
declare
  admin_expr text := 'false';
begin
  if to_regprocedure('public.is_app_admin(uuid)') is not null then
    admin_expr := 'public.is_app_admin(auth.uid())';
  end if;

  --------------------------------------------------------------------
  -- guide_sections (your client is posting to /rest/v1/guide_sections)
  --------------------------------------------------------------------
  if to_regclass('public.guide_sections') is not null then
    execute 'alter table public.guide_sections enable row level security';

    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='guide_sections' and policyname='gs_select_members'
    ) then
      execute format($p$
        create policy gs_select_members
        on public.guide_sections
        for select
        using (
          (%s)
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and pa.alliance_code = guide_sections.alliance_code
          )
        )
      $p$, admin_expr);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='guide_sections' and policyname='gs_manage_r4r5'
    ) then
      execute format($p$
        create policy gs_manage_r4r5
        on public.guide_sections
        for all
        using (
          (%s)
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and pa.alliance_code = guide_sections.alliance_code
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
        with check (
          (%s)
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and pa.alliance_code = guide_sections.alliance_code
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
      $p$, admin_expr, admin_expr);
    end if;
  end if;

  --------------------------------------------------------------------
  -- alliance_events (so R4/R5 can create/edit events)
  --------------------------------------------------------------------
  if to_regclass('public.alliance_events') is not null then
    execute 'alter table public.alliance_events enable row level security';

    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='alliance_events' and policyname='ae_select_members'
    ) then
      execute format($p$
        create policy ae_select_members
        on public.alliance_events
        for select
        using (
          (%s)
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and pa.alliance_code = alliance_events.alliance_id
          )
        )
      $p$, admin_expr);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='alliance_events' and policyname='ae_manage_r4r5'
    ) then
      execute format($p$
        create policy ae_manage_r4r5
        on public.alliance_events
        for all
        using (
          (%s)
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and pa.alliance_code = alliance_events.alliance_id
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
        with check (
          (%s)
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and pa.alliance_code = alliance_events.alliance_id
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
      $p$, admin_expr, admin_expr);
    end if;
  end if;
end $$;