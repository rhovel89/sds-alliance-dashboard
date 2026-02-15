-- ============================
-- Owner/Admin support via RLS
-- ============================

-- 1) Admins table
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

create or replace function public.is_app_admin(uid uuid)
returns boolean
stable
language sql
as $$
  select exists (
    select 1 from public.app_admins a where a.user_id = uid
  );
$$;

-- app_admins policies
drop policy if exists "app_admins_select_self_or_admin" on public.app_admins;
create policy "app_admins_select_self_or_admin"
on public.app_admins
for select
to authenticated
using (auth.uid() = user_id or public.is_app_admin(auth.uid()));

drop policy if exists "app_admins_manage_admins" on public.app_admins;
create policy "app_admins_manage_admins"
on public.app_admins
for all
to authenticated
using (public.is_app_admin(auth.uid()))
with check (public.is_app_admin(auth.uid()));

-- 2) Ensure discord settings table has timestamps (fixes updated_at trigger expectations)
alter table public.alliance_discord_settings
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.alliance_discord_settings_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_alliance_discord_settings_updated_at on public.alliance_discord_settings;
create trigger trg_alliance_discord_settings_updated_at
before update on public.alliance_discord_settings
for each row
execute procedure public.alliance_discord_settings_set_updated_at();

alter table public.alliance_discord_settings enable row level security;

-- Replace any older policies with admin-driven policies
drop policy if exists "service role access" on public.alliance_discord_settings;
drop policy if exists "alliance_discord_settings_manage_admins" on public.alliance_discord_settings;
drop policy if exists "alliance_discord_settings_select_admins" on public.alliance_discord_settings;

create policy "alliance_discord_settings_select_admins"
on public.alliance_discord_settings
for select
to authenticated
using (public.is_app_admin(auth.uid()));

create policy "alliance_discord_settings_manage_admins"
on public.alliance_discord_settings
for all
to authenticated
using (public.is_app_admin(auth.uid()))
with check (public.is_app_admin(auth.uid()));
