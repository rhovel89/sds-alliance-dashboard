-- ==========================================
-- Alliances + Players Roster (Owner-managed)
-- PATCHED: existing public.alliances had no "code" column
-- ==========================================

create extension if not exists pgcrypto;

-- Ensure admin helper exists
create or replace function public.is_app_admin(uid uuid)
returns boolean
stable
language sql
as $$
  select exists (select 1 from public.app_admins a where a.user_id = uid);
$$;

-- ------------------------------------------
-- 0) Normalize/upgrade existing public.alliances
-- ------------------------------------------

-- Add columns we need (safe if already present)
alter table public.alliances
  add column if not exists code text,
  add column if not exists name text,
  add column if not exists enabled boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Backfill "code" and "name" from whatever the table already has
do $$
declare
  src_code_col text := null;
  src_name_col text := null;
begin
  -- pick a likely existing column to derive code from
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='alliances' and column_name='alliance_id') then
    src_code_col := 'alliance_id';
  elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='alliances' and column_name='alliance_code') then
    src_code_col := 'alliance_code';
  elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='alliances' and column_name='tag') then
    src_code_col := 'tag';
  elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='alliances' and column_name='short_code') then
    src_code_col := 'short_code';
  end if;

  if src_code_col is not null then
    execute format(
      'update public.alliances set code = upper(btrim(%I::text)) where code is null or btrim(code) = '''' ',
      src_code_col
    );
  end if;

  -- derive name from an existing name column if present
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='alliances' and column_name='alliance_name') then
    src_name_col := 'alliance_name';
  elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='alliances' and column_name='display_name') then
    src_name_col := 'display_name';
  end if;

  if src_name_col is not null then
    execute format(
      'update public.alliances set name = btrim(%I::text) where name is null or btrim(name) = '''' ',
      src_name_col
    );
  end if;

  -- fallback: if name still empty, set name = code
  update public.alliances
  set name = code
  where (name is null or btrim(name) = '') and code is not null;

  -- hard stop if code still missing for any existing row
  if exists (select 1 from public.alliances where code is null or btrim(code) = '') then
    raise exception 'public.alliances has rows with no code. Fill public.alliances.code for existing rows, then re-run migration.';
  end if;
end $$;

-- enforce constraints now that code is populated
alter table public.alliances
  alter column code set not null;

-- unique index so other tables can FK to code
create unique index if not exists alliances_code_uniq on public.alliances(code);

-- updated_at trigger (safe)
create or replace function public.alliances_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_alliances_updated_at on public.alliances;
create trigger trg_alliances_updated_at
before update on public.alliances
for each row
execute procedure public.alliances_set_updated_at();

alter table public.alliances enable row level security;

-- Policies: authenticated can view, admins manage
drop policy if exists alliances_select_authenticated on public.alliances;
create policy alliances_select_authenticated
on public.alliances
for select
to authenticated
using (true);

drop policy if exists alliances_manage_admins on public.alliances;
create policy alliances_manage_admins
on public.alliances
for all
to authenticated
using (public.is_app_admin(auth.uid()))
with check (public.is_app_admin(auth.uid()));

-- Seed common alliances (safe upsert on code)
insert into public.alliances (code, name, enabled)
values ('WOC','WOC',true), ('SDS','SDS',true)
on conflict (code) do update
set name = excluded.name, enabled = excluded.enabled, updated_at = now();

-- ------------------------------------------
-- 1) Players roster
-- ------------------------------------------
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  game_name text not null,
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.players_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_players_updated_at on public.players;
create trigger trg_players_updated_at
before update on public.players
for each row
execute procedure public.players_set_updated_at();

alter table public.players enable row level security;

-- ------------------------------------------
-- 2) Player ↔ Alliance assignments
-- ------------------------------------------
create table if not exists public.player_alliances (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  alliance_code text not null references public.alliances(code) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_alliances_role_check
    check (role in ('owner','r5','r4','member','viewer')),
  constraint player_alliances_unique unique (player_id, alliance_code)
);

create index if not exists idx_player_alliances_player_id on public.player_alliances(player_id);
create index if not exists idx_player_alliances_alliance_code on public.player_alliances(alliance_code);

create or replace function public.player_alliances_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_player_alliances_updated_at on public.player_alliances;
create trigger trg_player_alliances_updated_at
before update on public.player_alliances
for each row
execute procedure public.player_alliances_set_updated_at();

alter table public.player_alliances enable row level security;

-- ------------------------------------------
-- 3) Link roster player -> auth user
-- ------------------------------------------
create table if not exists public.player_auth_links (
  player_id uuid primary key references public.players(id) on delete cascade,
  user_id uuid unique not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.player_auth_links enable row level security;

-- ------------------------------------------
-- 4) RLS for players + assignments + links
-- Admins manage everything. Linked user can read their own.
-- ------------------------------------------

drop policy if exists players_select_admin_or_self on public.players;
create policy players_select_admin_or_self
on public.players
for select
to authenticated
using (
  public.is_app_admin(auth.uid())
  or exists (
    select 1 from public.player_auth_links l
    where l.user_id = auth.uid() and l.player_id = players.id
  )
);

drop policy if exists players_manage_admins on public.players;
create policy players_manage_admins
on public.players
for all
to authenticated
using (public.is_app_admin(auth.uid()))
with check (public.is_app_admin(auth.uid()));

drop policy if exists player_alliances_select_admin_or_self on public.player_alliances;
create policy player_alliances_select_admin_or_self
on public.player_alliances
for select
to authenticated
using (
  public.is_app_admin(auth.uid())
  or exists (
    select 1
    from public.player_auth_links l
    where l.user_id = auth.uid() and l.player_id = player_alliances.player_id
  )
);

drop policy if exists player_alliances_manage_admins on public.player_alliances;
create policy player_alliances_manage_admins
on public.player_alliances
for all
to authenticated
using (public.is_app_admin(auth.uid()))
with check (public.is_app_admin(auth.uid()));

drop policy if exists player_auth_links_select_admin_or_self on public.player_auth_links;
create policy player_auth_links_select_admin_or_self
on public.player_auth_links
for select
to authenticated
using (public.is_app_admin(auth.uid()) or user_id = auth.uid());

drop policy if exists player_auth_links_manage_admins on public.player_auth_links;
create policy player_auth_links_manage_admins
on public.player_auth_links
for all
to authenticated
using (public.is_app_admin(auth.uid()))
with check (public.is_app_admin(auth.uid()));
