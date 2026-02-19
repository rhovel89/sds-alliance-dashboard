-- RLS: alliance_event_types
-- SAFE: creates policies only if missing.

do $$
begin
  if to_regclass('public.alliance_event_types') is not null then
    execute 'alter table public.alliance_event_types enable row level security';

    -- SELECT: any member of that alliance (via player_alliances) OR app admin
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='alliance_event_types' and policyname='aet_select_members'
    ) then
      execute $p$
        create policy aet_select_members
        on public.alliance_event_types
        for select
        using (
          (
            to_regprocedure('public.is_app_admin(uuid)') is not null
            and public.is_app_admin(auth.uid())
          )
          OR exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(alliance_event_types.alliance_code)
          )
        )
      $p$;
    end if;

    -- INSERT: Owner/R4/R5 of that alliance OR app admin
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='alliance_event_types' and policyname='aet_insert_managers'
    ) then
      execute $p$
        create policy aet_insert_managers
        on public.alliance_event_types
        for insert
        with check (
          (
            to_regprocedure('public.is_app_admin(uuid)') is not null
            and public.is_app_admin(auth.uid())
          )
          OR exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(alliance_event_types.alliance_code)
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
      $p$;
    end if;

    -- UPDATE: Owner/R4/R5 OR app admin
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='alliance_event_types' and policyname='aet_update_managers'
    ) then
      execute $p$
        create policy aet_update_managers
        on public.alliance_event_types
        for update
        using (
          (
            to_regprocedure('public.is_app_admin(uuid)') is not null
            and public.is_app_admin(auth.uid())
          )
          OR exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(alliance_event_types.alliance_code)
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
        with check (
          (
            to_regprocedure('public.is_app_admin(uuid)') is not null
            and public.is_app_admin(auth.uid())
          )
          OR exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(alliance_event_types.alliance_code)
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
      $p$;
    end if;

    -- DELETE: Owner/R4/R5 OR app admin
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='alliance_event_types' and policyname='aet_delete_managers'
    ) then
      execute $p$
        create policy aet_delete_managers
        on public.alliance_event_types
        for delete
        using (
          (
            to_regprocedure('public.is_app_admin(uuid)') is not null
            and public.is_app_admin(auth.uid())
          )
          OR exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(alliance_event_types.alliance_code)
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
      $p$;
    end if;
  end if;
end $$;
