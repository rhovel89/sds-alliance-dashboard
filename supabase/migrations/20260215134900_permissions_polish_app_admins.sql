-- Global app admins (Owner + future admins)
create table if not exists public.app_admins (
  user_id uuid primary key,
  role text not null default 'owner',
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

-- Helper: are you an app admin?
create or replace function public.is_app_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.app_admins a
    where a.user_id = auth.uid()
  );
$$;

grant execute on function public.is_app_admin() to authenticated;

-- app_admins policies:
-- 1) allow a user to see their own row (so the UI can check admin status safely)
do $$
begin
  create policy app_admins_select_self
  on public.app_admins
  for select
  to authenticated
  using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- 2) admins can manage admins
do $$
begin
  create policy app_admins_manage_admins
  on public.app_admins
  for all
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());
exception when duplicate_object then null;
end $$;

-- =========================
-- Admin policies (additive)
-- =========================

-- Alliances: everyone can view; only admins can write
alter table public.alliances enable row level security;

do $$
begin
  create policy alliances_select_authenticated
  on public.alliances
  for select
  to authenticated
  using (true);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy alliances_admin_write
  on public.alliances
  for all
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());
exception when duplicate_object then null;
end $$;

-- Players: users can view their own player row; admins can view/write all
alter table public.players enable row level security;

do $$
begin
  create policy players_select_self
  on public.players
  for select
  to authenticated
  using (auth_user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy players_admin_select
  on public.players
  for select
  to authenticated
  using (public.is_app_admin());
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy players_admin_write
  on public.players
  for all
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());
exception when duplicate_object then null;
end $$;

-- Player ↔ Alliances memberships: users can see their own memberships; admins can manage all
alter table public.player_alliances enable row level security;

do $$
begin
  create policy player_alliances_select_self
  on public.player_alliances
  for select
  to authenticated
  using (
    public.is_app_admin()
    or exists (
      select 1
      from public.players p
      where p.id = player_alliances.player_id
        and p.auth_user_id = auth.uid()
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy player_alliances_admin_write
  on public.player_alliances
  for all
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());
exception when duplicate_object then null;
end $$;

-- Discord settings: admin only (owner dashboard)
alter table public.alliance_discord_settings enable row level security;

do $$
begin
  create policy alliance_discord_settings_admin_all
  on public.alliance_discord_settings
  for all
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());
exception when duplicate_object then null;
end $$;

-- Access requests: keep existing user submit policies (don’t touch),
-- just add admin visibility + admin updates
alter table public.access_requests enable row level security;

do $$
begin
  create policy access_requests_admin_select
  on public.access_requests
  for select
  to authenticated
  using (public.is_app_admin());
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy access_requests_admin_update
  on public.access_requests
  for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());
exception when duplicate_object then null;
end $$;


