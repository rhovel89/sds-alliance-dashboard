-- Player Profiles + HQs per Alliance
-- - One profile per (player_id, alliance_code)
-- - Unlimited HQs per profile
-- - RLS: players can only manage their own profile/HQs; admins can manage all
-- Safe: does not alter existing tables.

create extension if not exists pgcrypto;

-- updated_at helper
create or replace function public.sa_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- =========================
-- Profiles table
-- =========================
create table if not exists public.player_alliance_profiles (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  alliance_code text not null references public.alliances(code) on delete cascade,

  game_name text null,

  troop_type text null check (troop_type in ('Shooter','Rider','Fighter')),
  troop_tier text null check (troop_tier in ('T5','T6','T7','T8','T9','T10','T11','T12','T13','T14')),

  march_size_no_heroes integer null check (march_size_no_heroes is null or march_size_no_heroes >= 0),
  rally_size integer null check (rally_size is null or rally_size >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (player_id, alliance_code)
);

drop trigger if exists trg_player_alliance_profiles_updated_at on public.player_alliance_profiles;
create trigger trg_player_alliance_profiles_updated_at
before update on public.player_alliance_profiles
for each row execute function public.sa_touch_updated_at();

alter table public.player_alliance_profiles enable row level security;

-- SELECT: own profiles OR app admin
drop policy if exists player_alliance_profiles_select on public.player_alliance_profiles;
create policy player_alliance_profiles_select
on public.player_alliance_profiles
for select
using (
  is_app_admin(auth.uid())
  or exists (
    select 1 from public.players p
    where p.id = player_alliance_profiles.player_id
      and p.auth_user_id = auth.uid()
  )
);

-- WRITE: own profiles OR app admin
drop policy if exists player_alliance_profiles_write on public.player_alliance_profiles;
create policy player_alliance_profiles_write
on public.player_alliance_profiles
for all
using (
  is_app_admin(auth.uid())
  or exists (
    select 1 from public.players p
    where p.id = player_alliance_profiles.player_id
      and p.auth_user_id = auth.uid()
  )
)
with check (
  is_app_admin(auth.uid())
  or exists (
    select 1 from public.players p
    where p.id = player_alliance_profiles.player_id
      and p.auth_user_id = auth.uid()
  )
);

-- =========================
-- HQs table
-- =========================
create table if not exists public.player_alliance_hqs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.player_alliance_profiles(id) on delete cascade,

  hq_name text not null,
  hq_level integer null check (hq_level is null or hq_level >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_player_alliance_hqs_profile_id on public.player_alliance_hqs(profile_id);

drop trigger if exists trg_player_alliance_hqs_updated_at on public.player_alliance_hqs;
create trigger trg_player_alliance_hqs_updated_at
before update on public.player_alliance_hqs
for each row execute function public.sa_touch_updated_at();

alter table public.player_alliance_hqs enable row level security;

-- SELECT: own HQs via profile OR app admin
drop policy if exists player_alliance_hqs_select on public.player_alliance_hqs;
create policy player_alliance_hqs_select
on public.player_alliance_hqs
for select
using (
  is_app_admin(auth.uid())
  or exists (
    select 1
    from public.player_alliance_profiles pr
    join public.players p on p.id = pr.player_id
    where pr.id = player_alliance_hqs.profile_id
      and p.auth_user_id = auth.uid()
  )
);

-- WRITE: own HQs via profile OR app admin
drop policy if exists player_alliance_hqs_write on public.player_alliance_hqs;
create policy player_alliance_hqs_write
on public.player_alliance_hqs
for all
using (
  is_app_admin(auth.uid())
  or exists (
    select 1
    from public.player_alliance_profiles pr
    join public.players p on p.id = pr.player_id
    where pr.id = player_alliance_hqs.profile_id
      and p.auth_user_id = auth.uid()
  )
)
with check (
  is_app_admin(auth.uid())
  or exists (
    select 1
    from public.player_alliance_profiles pr
    join public.players p on p.id = pr.player_id
    where pr.id = player_alliance_hqs.profile_id
      and p.auth_user_id = auth.uid()
  )
);
