-- Fix: allow signed-in users to read their own players + membership rows,
-- so approved users can load memberships and stop getting sent to /onboarding.
-- SAFE: only creates policies if missing. Does not drop anything.

do $$
declare
  has_admin_fn boolean := false;
  admin_prefix text := '';
begin
  has_admin_fn := to_regprocedure('public.is_app_admin(uuid)') is not null;
  if has_admin_fn then
    admin_prefix := 'public.is_app_admin(auth.uid()) OR ';
  end if;

  --------------------------------------------------------------------
  -- players
  --------------------------------------------------------------------
  if to_regclass('public.players') is not null then
    execute 'alter table public.players enable row level security';

    -- SELECT self
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='players' and policyname='players_select_self'
    ) then
      execute format($p$
        create policy players_select_self
        on public.players
        for select
        using (%s auth_user_id = auth.uid())
      $p$, admin_prefix);
    end if;

    -- INSERT self (needed because app creates players row on first login)
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='players' and policyname='players_insert_self'
    ) then
      execute format($p$
        create policy players_insert_self
        on public.players
        for insert
        with check (%s auth_user_id = auth.uid())
      $p$, admin_prefix);
    end if;

    -- UPDATE self (optional but safe)
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='players' and policyname='players_update_self'
    ) then
      execute format($p$
        create policy players_update_self
        on public.players
        for update
        using (%s auth_user_id = auth.uid())
        with check (%s auth_user_id = auth.uid())
      $p$, admin_prefix, admin_prefix);
    end if;
  end if;

  --------------------------------------------------------------------
  -- player_alliances (memberships)
  --------------------------------------------------------------------
  if to_regclass('public.player_alliances') is not null then
    execute 'alter table public.player_alliances enable row level security';

    -- SELECT memberships for the current auth user (via players table)
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='player_alliances' and policyname='player_alliances_select_self'
    ) then
      execute format($p$
        create policy player_alliances_select_self
        on public.player_alliances
        for select
        using (
          %s
          exists (
            select 1
            from public.players me
            where me.auth_user_id = auth.uid()
              and me.id = player_alliances.player_id
          )
        )
      $p$, admin_prefix);
    end if;

    -- Writes: admin only (Owner pages are RequireAdmin)
    if has_admin_fn then
      if not exists (
        select 1 from pg_policies
        where schemaname='public' and tablename='player_alliances' and policyname='player_alliances_admin_write'
      ) then
        execute $p$
          create policy player_alliances_admin_write
          on public.player_alliances
          for all
          using (public.is_app_admin(auth.uid()))
          with check (public.is_app_admin(auth.uid()))
        $p$;
      end if;
    end if;
  end if;

end $$;
