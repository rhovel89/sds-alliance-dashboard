-- RLS fix: allow signed-in users to read their own players + player_alliances rows
-- and allow admins to manage player_alliances.
-- SAFE: policies created only if missing. Avoids referencing is_app_admin() if not present.

do $$
declare
  has_admin_fn boolean := false;
  admin_pred text := 'false';
begin
  has_admin_fn := to_regprocedure('public.is_app_admin(uuid)') is not null;
  if has_admin_fn then
    admin_pred := 'public.is_app_admin(auth.uid())';
  end if;

  --------------------------------------------------------------------
  -- players
  --------------------------------------------------------------------
  if to_regclass('public.players') is not null then
    execute 'alter table public.players enable row level security';

    -- SELECT self (or admin)
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='players' and policyname='players_select_self'
    ) then
      execute format($p$
        create policy players_select_self
        on public.players
        for select
        using (
          auth_user_id = auth.uid()
          or %s
        )
      $p$, admin_pred);
    end if;

    -- INSERT self (or admin)
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='players' and policyname='players_insert_self'
    ) then
      execute format($p$
        create policy players_insert_self
        on public.players
        for insert
        with check (
          auth_user_id = auth.uid()
          or %s
        )
      $p$, admin_pred);
    end if;

    -- UPDATE self (or admin)
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='players' and policyname='players_update_self'
    ) then
      execute format($p$
        create policy players_update_self
        on public.players
        for update
        using (
          auth_user_id = auth.uid()
          or %s
        )
        with check (
          auth_user_id = auth.uid()
          or %s
        )
      $p$, admin_pred, admin_pred);
    end if;
  end if;

  --------------------------------------------------------------------
  -- player_alliances
  --------------------------------------------------------------------
  if to_regclass('public.player_alliances') is not null then
    execute 'alter table public.player_alliances enable row level security';

    -- SELECT: a user can read their own memberships (or admin)
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='player_alliances' and policyname='pa_select_self'
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
      $p$, admin_pred);
    end if;

    -- WRITE: admin only (FOR ALL is valid; commas are NOT)
    if has_admin_fn then
      if not exists (
        select 1 from pg_policies
        where schemaname='public' and tablename='player_alliances' and policyname='pa_admin_write'
      ) then
        execute $p$
          create policy pa_admin_write
          on public.player_alliances
          for all
          using (public.is_app_admin(auth.uid()))
          with check (public.is_app_admin(auth.uid()))
        $p$;
      end if;
    end if;
  end if;

end $$;
