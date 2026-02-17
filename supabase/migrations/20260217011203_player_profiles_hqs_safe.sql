-- SAFE: ensure player profiles + HQs tables exist with expected columns
-- Does NOT enable RLS (keeps behavior stable).
-- Supports per-alliance profiles + unlimited HQ rows per profile.

create extension if not exists pgcrypto;

do $$
begin
  -- player_alliance_profiles
  if to_regclass('public.player_alliance_profiles') is null then
    execute $c$
      create table public.player_alliance_profiles (
        id uuid primary key default gen_random_uuid(),
        player_id uuid not null,
        alliance_code text not null,
        game_name text not null,
        troop_type text null,
        troop_tier text null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    $c$;
  else
    -- add missing columns (if table existed from earlier attempts)
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_alliance_profiles' and column_name='id') then
      execute 'alter table public.player_alliance_profiles add column id uuid';
    end if;

    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_alliance_profiles' and column_name='player_id') then
      execute 'alter table public.player_alliance_profiles add column player_id uuid';
    end if;

    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_alliance_profiles' and column_name='alliance_code') then
      execute 'alter table public.player_alliance_profiles add column alliance_code text';
    end if;

    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_alliance_profiles' and column_name='game_name') then
      execute 'alter table public.player_alliance_profiles add column game_name text';
    end if;

    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_alliance_profiles' and column_name='troop_type') then
      execute 'alter table public.player_alliance_profiles add column troop_type text';
    end if;

    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_alliance_profiles' and column_name='troop_tier') then
      execute 'alter table public.player_alliance_profiles add column troop_tier text';
    end if;

    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_alliance_profiles' and column_name='created_at') then
      execute 'alter table public.player_alliance_profiles add column created_at timestamptz not null default now()';
    end if;

    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_alliance_profiles' and column_name='updated_at') then
      execute 'alter table public.player_alliance_profiles add column updated_at timestamptz not null default now()';
    end if;
  end if;

  -- player_hqs
  if to_regclass('public.player_hqs') is null then
    execute $c$
      create table public.player_hqs (
        id uuid primary key default gen_random_uuid(),
        profile_id uuid not null,
        hq_name text not null,
        hq_level integer null,
        march_size integer null,
        rally_size integer null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    $c$;
  else
    -- if a different column name was used previously, normalize to profile_id
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_hqs' and column_name='profile_id') then
      if exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_hqs' and column_name='player_profile_id') then
        execute 'alter table public.player_hqs rename column player_profile_id to profile_id';
      else
        execute 'alter table public.player_hqs add column profile_id uuid';
      end if;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_hqs' and column_name='hq_name') then
      execute 'alter table public.player_hqs add column hq_name text';
    end if;

    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_hqs' and column_name='hq_level') then
      execute 'alter table public.player_hqs add column hq_level integer';
    end if;

    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_hqs' and column_name='march_size') then
      execute 'alter table public.player_hqs add column march_size integer';
    end if;

    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_hqs' and column_name='rally_size') then
      execute 'alter table public.player_hqs add column rally_size integer';
    end if;

    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_hqs' and column_name='created_at') then
      execute 'alter table public.player_hqs add column created_at timestamptz not null default now()';
    end if;

    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_hqs' and column_name='updated_at') then
      execute 'alter table public.player_hqs add column updated_at timestamptz not null default now()';
    end if;
  end if;

  -- helpful index (non-unique, safe even if existing data)
  execute 'create index if not exists player_hqs_profile_idx on public.player_hqs(profile_id)';
end
$$;
