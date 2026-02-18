-- Allow signed-in users to read their own player + membership rows (and admins to manage)
-- FIXED: proper quoting + valid policy syntax

do $$
declare
  has_admin_fn boolean := false;
begin
  has_admin_fn := to_regprocedure('public.is_app_admin(uuid)') is not null;

  --------------------------------------------------------------------
  -- players
  --------------------------------------------------------------------
  if to_regclass('public.players') is not null then
    execute 'alter table public.players enable row level security';

    -- SELECT self (and admin)
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'players' and policyname = 'players_select_self'
    ) then
      if has_admin_fn then
        execute $p$
          create policy players_select_self
          on public.players
          for select
          using ( public.is_app_admin(auth.uid()) OR auth_user_id = auth.uid() )
        $p$;
      else
        execute $p$
          create policy players_select_self
          on public.players
          for select
          using ( auth_user_id = auth.uid() )
        $p$;
      end if;
    end if;

    -- INSERT self (and admin)
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'players' and policyname = 'players_insert_self'
    ) then
      if has_admin_fn then
        execute $p$
          create policy players_insert_self
          on public.players
          for insert
          with check ( public.is_app_admin(auth.uid()) OR auth_user_id = auth.uid() )
        $p$;
      else
        execute $p$
          create policy players_insert_self
          on public.players
          for insert
          with check ( auth_user_id = auth.uid() )
        $p$;
      end if;
    end if;

    -- UPDATE self (and admin)
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'players' and policyname = 'players_update_self'
    ) then
      if has_admin_fn then
        execute $p$
          create policy players_update_self
          on public.players
          for update
          using ( public.is_app_admin(auth.uid()) OR auth_user_id = auth.uid() )
          with check ( public.is_app_admin(auth.uid()) OR auth_user_id = auth.uid() )
        $p$;
      else
        execute $p$
          create policy players_update_self
          on public.players
          for update
          using ( auth_user_id = auth.uid() )
          with check ( auth_user_id = auth.uid() )
        $p$;
      end if;
    end if;
  end if;

  --------------------------------------------------------------------
  -- player_alliances (read own rows; admin can manage)
  --------------------------------------------------------------------
  if to_regclass('public.player_alliances') is not null then
    execute 'alter table public.player_alliances enable row level security';

    -- SELECT memberships for current auth user (and admin)
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'player_alliances' and policyname = 'player_alliances_select_self'
    ) then
      if has_admin_fn then
        execute $p$
          create policy player_alliances_select_self
          on public.player_alliances
          for select
          using (
            public.is_app_admin(auth.uid())
            OR exists (
              select 1 from public.players me
              where me.auth_user_id = auth.uid()
                and me.id = player_alliances.player_id
            )
          )
        $p$;
      else
        execute $p$
          create policy player_alliances_select_self
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

    -- INSERT/UPDATE/DELETE: admin only (so owners manage assignments safely)
    if has_admin_fn then
      if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'player_alliances' and policyname = 'player_alliances_admin_write'
      ) then
        execute $p$
          create policy player_alliances_admin_write
          on public.player_alliances
          for all
          using ( public.is_app_admin(auth.uid()) )
          with check ( public.is_app_admin(auth.uid()) )
        $p$;
      end if;
    end if;
  end if;

end $$;
