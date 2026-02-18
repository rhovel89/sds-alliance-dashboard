-- RLS fix for alliance_event_types (SAFE)
-- Replaces a corrupted migration that had PowerShell-expanded $p$ markers.
-- Creates policies only if missing.

do $$
begin
  if to_regclass('public.alliance_event_types') is not null then
    execute 'alter table public.alliance_event_types enable row level security';

    -- SELECT: alliance members + app admins
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='alliance_event_types' and policyname='aet_select_members'
    ) then
      execute $p$
        create policy aet_select_members
        on public.alliance_event_types
        for select
        using (
          public.is_app_admin(auth.uid())
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(alliance_event_types.alliance_code)
          )
        )
      $p$;
    end if;

    -- WRITE: Owner/R4/R5 + app admins
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='alliance_event_types' and policyname='aet_write_managers'
    ) then
      execute $p$
        create policy aet_write_managers
        on public.alliance_event_types
        for insert, update, delete
        using (
          public.is_app_admin(auth.uid())
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
          public.is_app_admin(auth.uid())
          or exists (
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
