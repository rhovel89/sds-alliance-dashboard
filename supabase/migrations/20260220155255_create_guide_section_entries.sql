-- ============================================================
-- guide_section_entries: create table + RLS (idempotent)
-- Goal: fix PostgREST 404 on /rest/v1/guide_section_entries
-- ============================================================

-- Ensure UUID generator exists
create extension if not exists pgcrypto;

-- Table
create table if not exists public.guide_section_entries (
  id uuid primary key default gen_random_uuid(),
  alliance_code text not null,
  section_id uuid not null references public.guide_sections(id) on delete cascade,
  title text not null,
  body text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null,
  updated_by uuid null
);

create index if not exists guide_section_entries_alliance_code_idx
  on public.guide_section_entries (alliance_code);

create index if not exists guide_section_entries_section_id_idx
  on public.guide_section_entries (section_id);

-- updated_at trigger (idempotent)
create or replace function public.gse_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if new.created_by is null then
    new.created_by = auth.uid();
  end if;
  new.updated_by = auth.uid();
  return new;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_gse_touch_updated_at'
  ) then
    execute 'create trigger trg_gse_touch_updated_at
             before insert or update on public.guide_section_entries
             for each row execute function public.gse_touch_updated_at()';
  end if;
end $$;

-- -------------------------------------------------------------------
-- Robust access helpers (security definer) so RLS can work across
-- inconsistent schemas (alliance_code vs alliance_id etc).
-- -------------------------------------------------------------------

create or replace function public.is_app_admin_current()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when to_regclass('public.app_admins') is null then false
    else exists(select 1 from public.app_admins a where a.user_id = auth.uid())
  end
$$;

create or replace function public.is_dashboard_owner_current()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare v boolean;
begin
  -- prefer 0-arg function if present
  if to_regprocedure('public.is_dashboard_owner()') is not null then
    execute 'select public.is_dashboard_owner()' into v;
    return coalesce(v, false);
  end if;

  -- fallback 1-arg form if present
  if to_regprocedure('public.is_dashboard_owner(uuid)') is not null then
    execute 'select public.is_dashboard_owner(auth.uid())' into v;
    return coalesce(v, false);
  end if;

  return false;
end $$;

create or replace function public.user_has_alliance_access(p_alliance text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare uid uuid;
declare t text;
declare ucol text;
declare acol text;
declare v boolean;
declare sql text;

declare tables text[] := array[
  'alliance_memberships',
  'alliance_members',
  'memberships',
  'alliance_users',
  'player_alliance_roles',
  'player_alliances'
];

declare user_cols text[] := array[
  'user_id',
  'auth_user_id',
  'profile_id',
  'player_id',
  'member_id'
];

declare alliance_cols text[] := array[
  'alliance_code',
  'alliance_id',
  'alliance'
];
begin
  uid := auth.uid();
  if uid is null then return false; end if;

  if public.is_dashboard_owner_current() or public.is_app_admin_current() then
    return true;
  end if;

  foreach t in array tables loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    foreach ucol in array user_cols loop
      if not exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name=t and column_name=ucol
      ) then
        continue;
      end if;

      foreach acol in array alliance_cols loop
        if not exists (
          select 1 from information_schema.columns
          where table_schema='public' and table_name=t and column_name=acol
        ) then
          continue;
        end if;

        sql := format(
          'select exists(select 1 from public.%I where %I = $1 and upper(%I::text) = upper($2))',
          t, ucol, acol
        );

        execute sql using uid, p_alliance into v;
        if v then return true; end if;
      end loop;
    end loop;
  end loop;

  return false;
end $$;

create or replace function public.user_can_edit_guides(p_alliance text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare uid uuid;
declare t text;
declare ucol text;
declare acol text;
declare rcol text;
declare v boolean;
declare sql text;

declare tables text[] := array[
  'alliance_memberships',
  'alliance_members',
  'memberships',
  'alliance_users',
  'player_alliance_roles',
  'player_alliances'
];

declare user_cols text[] := array[
  'user_id',
  'auth_user_id',
  'profile_id',
  'player_id',
  'member_id'
];

declare alliance_cols text[] := array[
  'alliance_code',
  'alliance_id',
  'alliance'
];

declare role_cols text[] := array[
  'role',
  'rank',
  'role_key'
];
begin
  uid := auth.uid();
  if uid is null then return false; end if;

  if public.is_dashboard_owner_current() or public.is_app_admin_current() then
    return true;
  end if;

  foreach t in array tables loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    foreach ucol in array user_cols loop
      if not exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name=t and column_name=ucol
      ) then
        continue;
      end if;

      foreach acol in array alliance_cols loop
        if not exists (
          select 1 from information_schema.columns
          where table_schema='public' and table_name=t and column_name=acol
        ) then
          continue;
        end if;

        foreach rcol in array role_cols loop
          if not exists (
            select 1 from information_schema.columns
            where table_schema='public' and table_name=t and column_name=rcol
          ) then
            continue;
          end if;

          sql := format(
            'select exists(
               select 1
               from public.%I
               where %I = $1
                 and upper(%I::text) = upper($2)
                 and lower(coalesce(%I::text, '''')) in (
                   ''owner'',''r5'',''r4'',
                   ''5'',''4'',
                   ''rank5'',''rank4'',
                   ''dashboard_assist'',''dashboard assist''
                 )
             )',
            t, ucol, acol, rcol
          );

          execute sql using uid, p_alliance into v;
          if v then return true; end if;
        end loop;

      end loop;
    end loop;
  end loop;

  return false;
end $$;

-- -------------------------------------------------------------------
-- RLS policies (idempotent)
-- -------------------------------------------------------------------
alter table public.guide_section_entries enable row level security;

do $$
begin
  -- SELECT for alliance members
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='guide_section_entries'
      and policyname='gse_select_members'
  ) then
    execute 'create policy gse_select_members
             on public.guide_section_entries
             for select
             using (public.user_has_alliance_access(alliance_code))';
  end if;

  -- INSERT for editors
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='guide_section_entries'
      and policyname='gse_insert_editors'
  ) then
    execute 'create policy gse_insert_editors
             on public.guide_section_entries
             for insert
             with check (public.user_can_edit_guides(alliance_code))';
  end if;

  -- UPDATE for editors
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='guide_section_entries'
      and policyname='gse_update_editors'
  ) then
    execute 'create policy gse_update_editors
             on public.guide_section_entries
             for update
             using (public.user_can_edit_guides(alliance_code))
             with check (public.user_can_edit_guides(alliance_code))';
  end if;

  -- DELETE for editors
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='guide_section_entries'
      and policyname='gse_delete_editors'
  ) then
    execute 'create policy gse_delete_editors
             on public.guide_section_entries
             for delete
             using (public.user_can_edit_guides(alliance_code))';
  end if;
end $$;

-- Grants for PostgREST (Supabase typically handles, but safe)
grant select, insert, update, delete on public.guide_section_entries to authenticated;
grant select on public.guide_section_entries to anon;