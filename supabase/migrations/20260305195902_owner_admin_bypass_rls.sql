create or replace function public.is_app_admin()
returns boolean
language plpgsql
stable
as $$
declare ok boolean := false;
begin
  if auth.uid() is null then
    return false;
  end if;

  -- Try common admin tables if they exist (safe across environments)
  if to_regclass('public.app_admins') is not null then
    execute 'select exists (select 1 from public.app_admins where user_id = $1)' into ok using auth.uid();
    if ok then return true; end if;
  end if;

  if to_regclass('public.app_admin_users') is not null then
    execute 'select exists (select 1 from public.app_admin_users where user_id = $1)' into ok using auth.uid();
    if ok then return true; end if;
  end if;

  if to_regclass('public.dashboard_owners') is not null then
    execute 'select exists (select 1 from public.dashboard_owners where user_id = $1)' into ok using auth.uid();
    if ok then return true; end if;
  end if;

  -- Fallback: if state_achievement_access exists and you have ANY row, treat as staff (owner-level systems often use this)
  if to_regclass('public.state_achievement_access') is not null then
    execute 'select exists (select 1 from public.state_achievement_access where user_id = $1)' into ok using auth.uid();
    if ok then return true; end if;
  end if;

  return false;
end;
$$;

grant execute on function public.is_app_admin() to authenticated;

do $$
begin
  -- Admin-bypass policies are additive. They do NOT remove existing RLS logic.
  -- They simply grant full access when is_app_admin() is true.

  if to_regclass('public.ops_threads') is not null then
    execute 'drop policy if exists ops_threads_admin_all on public.ops_threads';
    execute 'create policy ops_threads_admin_all on public.ops_threads for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin())';
  end if;

  if to_regclass('public.ops_thread_posts') is not null then
    execute 'drop policy if exists ops_thread_posts_admin_all on public.ops_thread_posts';
    execute 'create policy ops_thread_posts_admin_all on public.ops_thread_posts for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin())';
  end if;

  if to_regclass('public.state_achievement_requests') is not null then
    execute 'drop policy if exists state_achievement_requests_admin_all on public.state_achievement_requests';
    execute 'create policy state_achievement_requests_admin_all on public.state_achievement_requests for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin())';
  end if;

  if to_regclass('public.state_player_achievements') is not null then
    execute 'drop policy if exists state_player_achievements_admin_all on public.state_player_achievements';
    execute 'create policy state_player_achievements_admin_all on public.state_player_achievements for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin())';
  end if;

  if to_regclass('public.player_alliances') is not null then
    execute 'drop policy if exists player_alliances_admin_all on public.player_alliances';
    execute 'create policy player_alliances_admin_all on public.player_alliances for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin())';
  end if;

  if to_regclass('public.alliances') is not null then
    execute 'drop policy if exists alliances_admin_all on public.alliances';
    execute 'create policy alliances_admin_all on public.alliances for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin())';
  end if;

  if to_regclass('public.states') is not null then
    execute 'drop policy if exists states_admin_all on public.states';
    execute 'create policy states_admin_all on public.states for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin())';
  end if;

  if to_regclass('public.state_discord_channels') is not null then
    execute 'drop policy if exists state_discord_channels_admin_all on public.state_discord_channels';
    execute 'create policy state_discord_channels_admin_all on public.state_discord_channels for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin())';
  end if;

  if to_regclass('public.state_discord_defaults') is not null then
    execute 'drop policy if exists state_discord_defaults_admin_all on public.state_discord_defaults';
    execute 'create policy state_discord_defaults_admin_all on public.state_discord_defaults for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin())';
  end if;
end $$;
