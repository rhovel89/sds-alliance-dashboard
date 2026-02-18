-- RLS FIX (SAFE): allow signed-in users to read/create/update their own players row
-- and read their own player_alliances memberships.
-- Admins (is_app_admin) can manage player_alliances.
-- Policies created only if missing.

do $$
declare
  has_admin_fn boolean := false;
begin
  has_admin_fn := to_regprocedure('public.is_app_admin(uuid)') is not null;

  -- players
  if to_regclass('public.players') is not null then
    execute 'alter table public.players enable row level security';

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='players' and policyname='players_select_self') then
      if has_admin_fn then
        execute $p$
          create policy players_select_self
          on public.players
          for select
          using (auth_user_id = auth.uid() or public.is_app_admin(auth.uid()))
        $p$;
      else
        execute $p$
          create policy players_select_self
          on public.players
          for select
          using (auth_user_id = auth.uid())
        $p$;
      end if;
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='players' and policyname='players_insert_self') then
      if has_admin_fn then
        execute $p$
          create policy players_insert_self
          on public.players
          for insert
          with check (auth_user_id = auth.uid() or public.is_app_admin(auth.uid()))
        $p$;
      else
        execute $p$
          create policy players_insert_self
          on public.players
          for insert
          with check (auth_user_id = auth.uid())
        $p$;
      end if;
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='players' and policyname='players_update_self') then
      if has_admin_fn then
        execute $p$
          create policy players_update_self
          on public.players
          for update
          using (auth_user_id = auth.uid() or public.is_app_admin(auth.uid()))
          with check (auth_user_id = auth.uid() or public.is_app_admin(auth.uid()))
        $p$;
      else
        execute $p$
          create policy players_update_self
          on public.players
          for update
          using (auth_user_id = auth.uid())
          with check (auth_user_id = auth.uid())
        $p$;
      end if;
    end if;
  end if;

  -- player_alliances
  if to_regclass('public.player_alliances') is not null then
    execute 'alter table public.player_alliances enable row level security';

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='player_alliances' and policyname='pa_select_self') then
      if has_admin_fn then
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
            or public.is_app_admin(auth.uid())
          )
        $p$;
      else
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
    end if;

    -- admin writes only (if admin fn exists)
    if has_admin_fn then
      if not exists (select 1 from pg_policies where schemaname='public' and tablename='player_alliances' and policyname='pa_admin_write') then
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
