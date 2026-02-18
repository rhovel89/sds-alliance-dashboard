-- Allow signed-in users to read their own player + membership rows (and admins to manage)
do $$
declare
  has_admin_fn boolean := false;
  admin_prefix text := '';
begin
  has_admin_fn := to_regprocedure('public.is_app_admin(uuid)') is not null;
  if has_admin_fn then
    admin_prefix := 'public.is_app_admin(auth.uid()) OR ';
  end if;

  -- players
  if to_regclass('public.players') is not null then
    execute 'alter table public.players enable row level security';

    if not exists (select 1 from pg_policies where schemaname=''public'' and tablename=''players'' and policyname=''players_select_self'') then
      execute format('
        create policy players_select_self
        on public.players
        for select
        using (%s auth_user_id = auth.uid())
      ', admin_prefix);
    end if;

    if not exists (select 1 from pg_policies where schemaname=''public'' and tablename=''players'' and policyname=''players_insert_self'') then
      execute format('
        create policy players_insert_self
        on public.players
        for insert
        with check (%s auth_user_id = auth.uid())
      ', admin_prefix);
    end if;

    if not exists (select 1 from pg_policies where schemaname=''public'' and tablename=''players'' and policyname=''players_update_self'') then
      execute format('
        create policy players_update_self
        on public.players
        for update
        using (%s auth_user_id = auth.uid())
        with check (%s auth_user_id = auth.uid())
      ', admin_prefix, admin_prefix);
    end if;
  end if;

  -- player_alliances
  if to_regclass('public.player_alliances') is not null then
    execute 'alter table public.player_alliances enable row level security';

    if not exists (select 1 from pg_policies where schemaname=''public'' and tablename=''player_alliances'' and policyname=''pa_select_self'') then
      execute format('
        create policy pa_select_self
        on public.player_alliances
        for select
        using (
          %s exists (
            select 1 from public.players me
            where me.auth_user_id = auth.uid()
              and me.id = player_alliances.player_id
          )
        )
      ', admin_prefix);
    end if;

    -- only admins can write assignments
    if has_admin_fn and not exists (select 1 from pg_policies where schemaname=''public'' and tablename=''player_alliances'' and policyname=''pa_write_admin'') then
      execute '
        create policy pa_write_admin
        on public.player_alliances
        for all
        using (public.is_app_admin(auth.uid()))
        with check (public.is_app_admin(auth.uid()))
      ';
    end if;
  end if;

end $$;
