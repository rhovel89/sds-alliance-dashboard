-- SAFE RLS: allow members to READ; allow Owner/R4/R5 (and app admins) to WRITE
do $$
begin
  ----------------------------------------------------------------------
  -- guide_sections
  ----------------------------------------------------------------------
  if to_regclass('public.guide_sections') is not null then
    execute 'alter table public.guide_sections enable row level security';

    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='guide_sections' and policyname='gs_select_members'
    ) then
      execute $pol$
        create policy gs_select_members
        on public.guide_sections
        for select
        using (
          exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and pa.alliance_code = guide_sections.alliance_code
          )
          or (to_regprocedure('public.is_app_admin(uuid)') is not null and public.is_app_admin(auth.uid()))
        )
      $pol$;
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='guide_sections' and policyname='gs_manage_owner_r4_r5'
    ) then
      execute $pol$
        create policy gs_manage_owner_r4_r5
        on public.guide_sections
        for all
        using (
          (to_regprocedure('public.is_app_admin(uuid)') is not null and public.is_app_admin(auth.uid()))
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
          (to_regprocedure('public.is_app_admin(uuid)') is not null and public.is_app_admin(auth.uid()))
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and pa.alliance_code = guide_sections.alliance_code
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
      $pol$;
    end if;
  end if;

  ----------------------------------------------------------------------
  -- alliance_events (R4/R5 can insert/update/delete)
  ----------------------------------------------------------------------
  if to_regclass('public.alliance_events') is not null then
    execute 'alter table public.alliance_events enable row level security';

    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='alliance_events' and policyname='ae_manage_owner_r4_r5'
    ) then
      execute $pol$
        create policy ae_manage_owner_r4_r5
        on public.alliance_events
        for all
        using (
          (to_regprocedure('public.is_app_admin(uuid)') is not null and public.is_app_admin(auth.uid()))
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
          (to_regprocedure('public.is_app_admin(uuid)') is not null and public.is_app_admin(auth.uid()))
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and pa.alliance_code = alliance_events.alliance_id
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
      $pol$;
    end if;
  end if;

end $$;
