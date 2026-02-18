-- SAFE: RLS self-read for players + player_alliances.
-- Goal: signed-in users can read their own players row + their memberships (prevents "missing alliance").
-- Admin (is_app_admin) can manage memberships.

do $$
declare
  has_admin_fn boolean := false;
  admin_or text := '';
begin
  has_admin_fn := to_regprocedure('public.is_app_admin(uuid)') is not null;
  if has_admin_fn then
    admin_or := ' OR public.is_app_admin(auth.uid())';
  end if;

  --------------------------------------------------------------------
  -- players
  --------------------------------------------------------------------
  if to_regclass('public.players') is not null then
    execute 'alter table public.players enable row level security';

    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='players' and policyname='players_select_self'
    ) then
      execute format($p$
        create policy players_select_self
        on public.players
        for select
        using (auth_user_id = auth.uid()%s)
      $p$, admin_or);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='players' and policyname='players_insert_self'
    ) then
      execute format($p$
        create policy players_insert_self
        on public.players
        for insert
        with check (auth_user_id = auth.uid()%s)
      $p$, admin_or);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='players' and policyname='players_update_self'
    ) then
      execute format($p$
        create policy players_update_self
        on public.players
        for update
        using (auth_user_id = auth.uid()%s)
        with check (auth_user_id = auth.uid()%s)
      $p$, admin_or, admin_or);
    end if;
  end if;

  --------------------------------------------------------------------
  -- player_alliances
  --------------------------------------------------------------------
  if to_regclass('public.player_alliances') is not null then
    execute 'alter table public.player_alliances enable row level security';

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
          )%s
        )
      $p$, admin_or);
    end if;

    -- Admin can write memberships (insert/update/delete). Create only if admin fn exists.
    if has_admin_fn then
      if not exists (
        select 1 from pg_policies
        where schemaname='public' and tablename='player_alliances' and policyname='pa_admin_insert'
      ) then
        execute $p$
          create policy pa_admin_insert
          on public.player_alliances
          for insert
          with check (public.is_app_admin(auth.uid()))
        $p$;
      end if;

      if not exists (
        select 1 from pg_policies
        where schemaname='public' and tablename='player_alliances' and policyname='pa_admin_update'
      ) then
        execute $p$
          create policy pa_admin_update
          on public.player_alliances
          for update
          using (public.is_app_admin(auth.uid()))
          with check (public.is_app_admin(auth.uid()))
        $p$;
      end if;

      if not exists (
        select 1 from pg_policies
        where schemaname='public' and tablename='player_alliances' and policyname='pa_admin_delete'
      ) then
        execute $p$
          create policy pa_admin_delete
          on public.player_alliances
          for delete
          using (public.is_app_admin(auth.uid()))
        $p$;
      end if;
    end if;
  end if;

end $$;
