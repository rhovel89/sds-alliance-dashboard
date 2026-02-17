-- Player profile + HQ persistence (SAFE)
-- Creates indexes + RLS policies if missing. Does not overwrite existing ones.

create extension if not exists pgcrypto;

do $$
begin
  --------------------------------------------------------------------
  -- player_alliance_profiles
  --------------------------------------------------------------------
  if to_regclass('public.player_alliance_profiles') is not null then
    execute 'create unique index if not exists player_alliance_profiles_uq on public.player_alliance_profiles(player_id, alliance_code)';
    execute 'alter table public.player_alliance_profiles enable row level security';

    -- SELECT own
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='player_alliance_profiles' and policyname='pap_select_own'
    ) then
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

    -- INSERT own
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='player_alliance_profiles' and policyname='pap_insert_own'
    ) then
      execute $p$
        create policy pap_insert_own
        on public.player_alliance_profiles
        for insert
        with check (
          exists (
            select 1 from public.players me
            where me.auth_user_id = auth.uid()
              and me.id = player_alliance_profiles.player_id
          )
        )
      $p$;
    end if;

    -- UPDATE own
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='player_alliance_profiles' and policyname='pap_update_own'
    ) then
      execute $p$
        create policy pap_update_own
        on public.player_alliance_profiles
        for update
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

    -- DELETE own
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='player_alliance_profiles' and policyname='pap_delete_own'
    ) then
      execute $p$
        create policy pap_delete_own
        on public.player_alliance_profiles
        for delete
        using (
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
  -- player_hqs
  --------------------------------------------------------------------
  if to_regclass('public.player_hqs') is not null then
    execute 'create index if not exists player_hqs_user_alliance_idx on public.player_hqs(user_id, alliance_id)';
    execute 'alter table public.player_hqs enable row level security';

    -- SELECT own
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='player_hqs' and policyname='phq_select_own'
    ) then
      execute $p$
        create policy phq_select_own
        on public.player_hqs
        for select
        using (user_id = auth.uid())
      $p$;
    end if;

    -- INSERT own
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='player_hqs' and policyname='phq_insert_own'
    ) then
      execute $p$
        create policy phq_insert_own
        on public.player_hqs
        for insert
        with check (user_id = auth.uid())
      $p$;
    end if;

    -- UPDATE own
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='player_hqs' and policyname='phq_update_own'
    ) then
      execute $p$
        create policy phq_update_own
        on public.player_hqs
        for update
        using (user_id = auth.uid())
        with check (user_id = auth.uid())
      $p$;
    end if;

    -- DELETE own
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='player_hqs' and policyname='phq_delete_own'
    ) then
      execute $p$
        create policy phq_delete_own
        on public.player_hqs
        for delete
        using (user_id = auth.uid())
      $p$;
    end if;
  end if;

end $$;
