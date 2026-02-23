-- SAFE: Owner/admin management helpers
-- Does NOT enable RLS. Only adds admin policies if RLS is already enabled on the table.

do $$
declare
  admin_pred text := 'false';
  has_admin_uuid boolean := false;
  has_admin_noarg boolean := false;
  rls_on boolean;
begin
  has_admin_uuid := to_regprocedure('public.is_app_admin(uuid)') is not null;
  has_admin_noarg := to_regprocedure('public.is_app_admin()') is not null;

  if has_admin_uuid then
    admin_pred := 'public.is_app_admin(auth.uid())';
  elsif has_admin_noarg then
    admin_pred := 'public.is_app_admin()';
  else
    admin_pred := 'false';
  end if;

  --------------------------------------------------------------------
  -- players
  --------------------------------------------------------------------
  if to_regclass('public.players') is not null then
    select c.relrowsecurity into rls_on
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='players';

    if coalesce(rls_on,false) then
      if not exists (select 1 from pg_policies where schemaname='public' and tablename='players' and policyname='players_admin_all') then
        execute format($p$
          create policy players_admin_all
          on public.players
          for all
          using (%s)
          with check (%s)
        $p$, admin_pred, admin_pred);
      end if;
    end if;
  end if;

  --------------------------------------------------------------------
  -- player_alliances
  --------------------------------------------------------------------
  if to_regclass('public.player_alliances') is not null then
    select c.relrowsecurity into rls_on
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='player_alliances';

    if coalesce(rls_on,false) then
      if not exists (select 1 from pg_policies where schemaname='public' and tablename='player_alliances' and policyname='player_alliances_admin_all') then
        execute format($p$
          create policy player_alliances_admin_all
          on public.player_alliances
          for all
          using (%s)
          with check (%s)
        $p$, admin_pred, admin_pred);
      end if;
    end if;
  end if;

  --------------------------------------------------------------------
  -- user_state_roles (if you use it)
  --------------------------------------------------------------------
  if to_regclass('public.user_state_roles') is not null then
    select c.relrowsecurity into rls_on
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='user_state_roles';

    if coalesce(rls_on,false) then
      if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_state_roles' and policyname='user_state_roles_admin_all') then
        execute format($p$
          create policy user_state_roles_admin_all
          on public.user_state_roles
          for all
          using (%s)
          with check (%s)
        $p$, admin_pred, admin_pred);
      end if;
    end if;
  end if;
end $$;
