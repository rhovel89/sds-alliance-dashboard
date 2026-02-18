-- Owner Event Types (per alliance) + SAFE RLS
-- Table: public.alliance_event_types
-- Used by: Alliance Calendar "Event Type" dropdown
-- Safe: create-if-not-exists + policies only if missing

create extension if not exists pgcrypto;

create table if not exists public.alliance_event_types (
  id uuid primary key default gen_random_uuid(),
  alliance_code text not null,
  category text not null default 'Alliance Event',
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists alliance_event_types_uq
  on public.alliance_event_types(alliance_code, category, name);

create index if not exists alliance_event_types_alliance_idx
  on public.alliance_event_types(alliance_code);

do $$
declare
  admin_prefix text := '';
begin
  -- If is_app_admin exists, allow it in policies (dynamic SQL so we don't error if missing)
  if to_regprocedure('public.is_app_admin(uuid)') is not null then
    admin_prefix := 'public.is_app_admin(auth.uid()) OR ';
  end if;

  if to_regclass('public.alliance_event_types') is not null then
    execute 'alter table public.alliance_event_types enable row level security';

    -- SELECT: alliance members can read, plus admins
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='alliance_event_types' and policyname='aet_select_members'
    ) then
      execute format(\/Users/raymondhovel/Documents/State Alliance Dashboard/src/pages/owner/OwnerMembershipsPage.tsx$
        create policy aet_select_members
        on public.alliance_event_types
        for select
        using (
          %s
          exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(alliance_event_types.alliance_code)
          )
        )
      \/Users/raymondhovel/Documents/State Alliance Dashboard/src/pages/owner/OwnerMembershipsPage.tsx$, admin_prefix);
    end if;

    -- WRITE: Owner/R4/R5 of that alliance (or admin)
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='alliance_event_types' and policyname='aet_write_managers'
    ) then
      execute format(\/Users/raymondhovel/Documents/State Alliance Dashboard/src/pages/owner/OwnerMembershipsPage.tsx$
        create policy aet_write_managers
        on public.alliance_event_types
        for insert, update, delete
        using (
          %s
          exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(alliance_event_types.alliance_code)
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
        with check (
          %s
          exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(alliance_event_types.alliance_code)
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
      \/Users/raymondhovel/Documents/State Alliance Dashboard/src/pages/owner/OwnerMembershipsPage.tsx$, admin_prefix, admin_prefix);
    end if;
  end if;
end $$;

