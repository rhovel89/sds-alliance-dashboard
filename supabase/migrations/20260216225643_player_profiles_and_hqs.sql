-- Player profiles + HQs (per alliance) — NEW TABLES
-- Safe: isolated tables + RLS.
-- Assumes existing:
--   public.players(id uuid, auth_user_id uuid)
--   functions: is_app_admin(uuid), sa_is_alliance_role(text, text[])

create table if not exists public.player_alliance_profiles (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  alliance_code text not null,
  game_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists player_alliance_profiles_unique
  on public.player_alliance_profiles(player_id, alliance_code);

create table if not exists public.player_hqs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.player_alliance_profiles(id) on delete cascade,
  hq_name text not null,
  hq_level integer,
  troop_type text,
  troop_tier text,
  march_size_no_heroes integer,
  rally_size integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists player_hqs_profile_idx
  on public.player_hqs(profile_id);

-- Simple checks (allow nulls)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'player_hqs_troop_type_check'
  ) then
    alter table public.player_hqs
      add constraint player_hqs_troop_type_check
      check (troop_type is null or troop_type in ('Shooter','Rider','Fighter'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'player_hqs_troop_tier_check'
  ) then
    alter table public.player_hqs
      add constraint player_hqs_troop_tier_check
      check (troop_tier is null or troop_tier in ('T5','T6','T7','T8','T9','T10','T11','T12','T13','T14'));
  end if;
end $$;

-- updated_at trigger helper
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

-- RLS
alter table public.player_alliance_profiles enable row level security;
alter table public.player_hqs enable row level security;

-- Helper predicates:
-- "is owner of this row" => players.auth_user_id = auth.uid()
-- "can manage alliance"  => is_app_admin OR owner/r4/r5 on that alliance_code

-- player_alliance_profiles policies
drop policy if exists player_alliance_profiles_select on public.player_alliance_profiles;
create policy player_alliance_profiles_select
on public.player_alliance_profiles
for select
using (
  exists (
    select 1 from public.players p
    where p.id = player_id and p.auth_user_id = auth.uid()
  )
  or is_app_admin(auth.uid())
  or sa_is_alliance_role(alliance_code, array['owner','r5','r4'])
);

drop policy if exists player_alliance_profiles_write on public.player_alliance_profiles;
create policy player_alliance_profiles_write
on public.player_alliance_profiles
for all
using (
  exists (
    select 1 from public.players p
    where p.id = player_id and p.auth_user_id = auth.uid()
  )
  or is_app_admin(auth.uid())
  or sa_is_alliance_role(alliance_code, array['owner','r5','r4'])
)
with check (
  exists (
    select 1 from public.players p
    where p.id = player_id and p.auth_user_id = auth.uid()
  )
  or is_app_admin(auth.uid())
  or sa_is_alliance_role(alliance_code, array['owner','r5','r4'])
);

-- player_hqs policies (through profile)
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
    select 1 from public.player_alliance_profiles pr
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
    select 1 from public.player_alliance_profiles pr
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
    select 1 from public.player_alliance_profiles pr
    where pr.id = profile_id
      and (is_app_admin(auth.uid()) or sa_is_alliance_role(pr.alliance_code, array['owner','r5','r4']))
  )
);
