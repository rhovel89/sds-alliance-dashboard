-- REPAIR / IDPOTENT migration: player profiles + HQs
-- Fixes existing installs where player_hqs exists but profile_id is missing.
-- Safe to re-run.

create extension if not exists pgcrypto;

-- 1) Ensure base tables exist
create table if not exists public.player_alliance_profiles (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  alliance_code text not null,
  game_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_hqs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid,
  hq_name text,
  hq_level integer,
  troop_type text,
  troop_tier text,
  march_size_no_heroes integer,
  rally_size integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Ensure required columns exist (for older tables)
do $$
begin
  -- player_alliance_profiles columns
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_alliance_profiles' and column_name='player_id') then
    alter table public.player_alliance_profiles add column player_id uuid;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_alliance_profiles' and column_name='alliance_code') then
    alter table public.player_alliance_profiles add column alliance_code text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_alliance_profiles' and column_name='game_name') then
    alter table public.player_alliance_profiles add column game_name text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_alliance_profiles' and column_name='created_at') then
    alter table public.player_alliance_profiles add column created_at timestamptz not null default now();
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_alliance_profiles' and column_name='updated_at') then
    alter table public.player_alliance_profiles add column updated_at timestamptz not null default now();
  end if;

  -- player_hqs columns
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_hqs' and column_name='profile_id') then
    alter table public.player_hqs add column profile_id uuid;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_hqs' and column_name='hq_name') then
    alter table public.player_hqs add column hq_name text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_hqs' and column_name='hq_level') then
    alter table public.player_hqs add column hq_level integer;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_hqs' and column_name='troop_type') then
    alter table public.player_hqs add column troop_type text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_hqs' and column_name='troop_tier') then
    alter table public.player_hqs add column troop_tier text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_hqs' and column_name='march_size_no_heroes') then
    alter table public.player_hqs add column march_size_no_heroes integer;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_hqs' and column_name='rally_size') then
    alter table public.player_hqs add column rally_size integer;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_hqs' and column_name='created_at') then
    alter table public.player_hqs add column created_at timestamptz not null default now();
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_hqs' and column_name='updated_at') then
    alter table public.player_hqs add column updated_at timestamptz not null default now();
  end if;
end $$;

-- 3) Unique index for profiles
create unique index if not exists player_alliance_profiles_unique
  on public.player_alliance_profiles(player_id, alliance_code);

-- 4) Best-effort backfill profile_id if older player_hqs had player_id + alliance_code
do $$
declare
  has_player_id boolean;
  has_alliance_code boolean;
begin
  select exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='player_hqs' and column_name='player_id'
  ) into has_player_id;

  select exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='player_hqs' and column_name='alliance_code'
  ) into has_alliance_code;

  if has_player_id and has_alliance_code then
    execute $q$
      insert into public.player_alliance_profiles(player_id, alliance_code)
      select distinct player_id, alliance_code
      from public.player_hqs
      where player_id is not null and alliance_code is not null
      on conflict (player_id, alliance_code) do nothing
    $q$;

    execute $q$
      update public.player_hqs h
      set profile_id = p.id
      from public.player_alliance_profiles p
      where h.profile_id is null
        and p.player_id = h.player_id
        and p.alliance_code = h.alliance_code
    $q$;
  end if;
end $$;

-- 5) FK (create if missing)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'player_hqs_profile_fk') then
    alter table public.player_hqs
      add constraint player_hqs_profile_fk
      foreign key (profile_id) references public.player_alliance_profiles(id) on delete cascade;
  end if;
end $$;

-- 6) Checks
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'player_hqs_troop_type_check') then
    alter table public.player_hqs
      add constraint player_hqs_troop_type_check
      check (troop_type is null or troop_type in ('Shooter','Rider','Fighter'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'player_hqs_troop_tier_check') then
    alter table public.player_hqs
      add constraint player_hqs_troop_tier_check
      check (troop_tier is null or troop_tier in ('T5','T6','T7','T8','T9','T10','T11','T12','T13','T14'));
  end if;
end $$;

-- 7) Index (NOW safe because profile_id exists)
create index if not exists player_hqs_profile_idx
  on public.player_hqs(profile_id);

-- 8) updated_at helper + triggers
create or replace function public._sa_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_player_alliance_profiles_updated_at on public.player_alliance_profiles;
create trigger trg_player_alliance_profiles_updated_at
before update on public.player_alliance_profiles
for each row execute function public._sa_touch_updated_at();

drop trigger if exists trg_player_hqs_updated_at on public.player_hqs;
create trigger trg_player_hqs_updated_at
before update on public.player_hqs
for each row execute function public._sa_touch_updated_at();

-- 9) RLS + policies (requires is_app_admin + sa_is_alliance_role)
alter table public.player_alliance_profiles enable row level security;
alter table public.player_hqs enable row level security;

drop policy if exists player_alliance_profiles_select on public.player_alliance_profiles;
create policy player_alliance_profiles_select
on public.player_alliance_profiles
for select
using (
  exists (select 1 from public.players p where p.id = player_id and p.auth_user_id = auth.uid())
  or is_app_admin(auth.uid())
  or sa_is_alliance_role(alliance_code, array['owner','r5','r4'])
);

drop policy if exists player_alliance_profiles_write on public.player_alliance_profiles;
create policy player_alliance_profiles_write
on public.player_alliance_profiles
for all
using (
  exists (select 1 from public.players p where p.id = player_id and p.auth_user_id = auth.uid())
  or is_app_admin(auth.uid())
  or sa_is_alliance_role(alliance_code, array['owner','r5','r4'])
)
with check (
  exists (select 1 from public.players p where p.id = player_id and p.auth_user_id = auth.uid())
  or is_app_admin(auth.uid())
  or sa_is_alliance_role(alliance_code, array['owner','r5','r4'])
);

drop policy if exists player_hqs_select on public.player_hqs;
create policy player_hqs_select
on public.player_hqs
for select
using (
  exists (
    select 1
    from public.player_alliance_profiles pr
    join public.players p on p.id = pr.player_id
    where pr.id = profile_id and p.auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.player_alliance_profiles pr
    where pr.id = profile_id
      and (is_app_admin(auth.uid()) or sa_is_alliance_role(pr.alliance_code, array['owner','r5','r4']))
  )
);

drop policy if exists player_hqs_write on public.player_hqs;
create policy player_hqs_write
on public.player_hqs
for all
using (
  exists (
    select 1
    from public.player_alliance_profiles pr
    join public.players p on p.id = pr.player_id
    where pr.id = profile_id and p.auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.player_alliance_profiles pr
    where pr.id = profile_id
      and (is_app_admin(auth.uid()) or sa_is_alliance_role(pr.alliance_code, array['owner','r5','r4']))
  )
)
with check (
  exists (
    select 1
    from public.player_alliance_profiles pr
    join public.players p on p.id = pr.player_id
    where pr.id = profile_id and p.auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.player_alliance_profiles pr
    where pr.id = profile_id
      and (is_app_admin(auth.uid()) or sa_is_alliance_role(pr.alliance_code, array['owner','r5','r4']))
  )
);
