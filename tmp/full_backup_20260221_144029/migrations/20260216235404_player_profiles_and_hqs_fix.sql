-- Player profiles + HQs (safe create/fix)
-- Ensures player_alliance_profiles exists
-- Ensures player_hqs has profile_id (fixes earlier "profile_id does not exist" error)
-- RLS: player can edit own; alliance owner/r4/r5 + app admin can view.

create extension if not exists pgcrypto;

-- updated_at helper (only if missing)
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'sa_set_updated_at') then
    execute $fn$
      create function public.sa_set_updated_at()
      returns trigger
      language plpgsql
      as $body$
      begin
        new.updated_at = now();
        return new;
      end;
      $body$;
    $fn$;
  end if;
end $$;

create table if not exists public.player_alliance_profiles (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  alliance_code text not null,
  game_name text not null,
  alliance_name text null,
  troop_type text null,
  troop_tier text null,
  march_size integer null,
  rally_size integer null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(player_id, alliance_code)
);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_player_alliance_profiles_updated_at') then
    create trigger trg_player_alliance_profiles_updated_at
    before update on public.player_alliance_profiles
    for each row execute function public.sa_set_updated_at();
  end if;
end $$;

create table if not exists public.player_hqs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid null,
  hq_name text not null,
  hq_level integer null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure profile_id exists; try renames for older column names
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='player_hqs' and column_name='profile_id'
  ) then
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='player_hqs' and column_name='player_profile_id'
    ) then
      alter table public.player_hqs rename column player_profile_id to profile_id;
    elsif exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='player_hqs' and column_name='alliance_profile_id'
    ) then
      alter table public.player_hqs rename column alliance_profile_id to profile_id;
    else
      alter table public.player_hqs add column profile_id uuid;
    end if;
  end if;
end $$;

-- FK guarded
do $$
begin
  if not exists (select 1 from pg_constraint where conname='player_hqs_profile_id_fkey') then
    alter table public.player_hqs
      add constraint player_hqs_profile_id_fkey
      foreign key (profile_id) references public.player_alliance_profiles(id)
      on delete cascade;
  end if;
end $$;

create index if not exists player_hqs_profile_idx on public.player_hqs(profile_id);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_player_hqs_updated_at') then
    create trigger trg_player_hqs_updated_at
    before update on public.player_hqs
    for each row execute function public.sa_set_updated_at();
  end if;
end $$;

-- RLS
alter table public.player_alliance_profiles enable row level security;
alter table public.player_hqs enable row level security;

-- Policies (create if missing)
do $$
begin
  -- SELECT profiles: app admin OR self OR owner/r4/r5 in that alliance
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='player_alliance_profiles' and policyname='player_profiles_select') then
    create policy player_profiles_select
      on public.player_alliance_profiles
      for select
      using (
        is_app_admin(auth.uid())
        or exists (
          select 1 from public.players p
          where p.id = player_id and p.auth_user_id = auth.uid()
        )
        or exists (
          select 1
          from public.players me
          join public.player_alliances pa on pa.player_id = me.id
          where me.auth_user_id = auth.uid()
            and pa.alliance_code = player_alliance_profiles.alliance_code
            and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
        )
      );
  end if;

  -- WRITE profiles: app admin OR self
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='player_alliance_profiles' and policyname='player_profiles_write') then
    create policy player_profiles_write
      on public.player_alliance_profiles
      for all
      using (
        is_app_admin(auth.uid())
        or exists (
          select 1 from public.players p
          where p.id = player_id and p.auth_user_id = auth.uid()
        )
      )
      with check (
        is_app_admin(auth.uid())
        or exists (
          select 1 from public.players p
          where p.id = player_id and p.auth_user_id = auth.uid()
        )
      );
  end if;

  -- SELECT HQs: app admin OR self OR owner/r4/r5 (through profile's alliance)
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='player_hqs' and policyname='player_hqs_select') then
    create policy player_hqs_select
      on public.player_hqs
      for select
      using (
        is_app_admin(auth.uid())
        or exists (
          select 1
          from public.player_alliance_profiles ap
          join public.players p on p.id = ap.player_id
          where ap.id = player_hqs.profile_id
            and p.auth_user_id = auth.uid()
        )
        or exists (
          select 1
          from public.player_alliance_profiles ap
          join public.players me on me.auth_user_id = auth.uid()
          join public.player_alliances pa on pa.player_id = me.id and pa.alliance_code = ap.alliance_code
          where ap.id = player_hqs.profile_id
            and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
        )
      );
  end if;

  -- WRITE HQs: app admin OR self (through profile)
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='player_hqs' and policyname='player_hqs_write') then
    create policy player_hqs_write
      on public.player_hqs
      for all
      using (
        is_app_admin(auth.uid())
        or exists (
          select 1
          from public.player_alliance_profiles ap
          join public.players p on p.id = ap.player_id
          where ap.id = player_hqs.profile_id
            and p.auth_user_id = auth.uid()
        )
      )
      with check (
        is_app_admin(auth.uid())
        or exists (
          select 1
          from public.player_alliance_profiles ap
          join public.players p on p.id = ap.player_id
          where ap.id = player_hqs.profile_id
            and p.auth_user_id = auth.uid()
        )
      );
  end if;
end $$;
