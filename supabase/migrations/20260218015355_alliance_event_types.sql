-- Add per-alliance event type catalog + optional event_category on alliance_events
-- SAFE: creates only if missing, policies only if missing.

create extension if not exists pgcrypto;

-- 1) Table
create table if not exists public.alliance_event_types (
  id uuid primary key default gen_random_uuid(),
  alliance_code text not null,
  category text not null, -- 'Alliance' or 'State'
  name text not null,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists alliance_event_types_uq
  on public.alliance_event_types(alliance_code, category, name);

-- 2) Optional column on events (won't break selects)
do $$
begin
  if to_regclass('public.alliance_events') is not null then
    begin
      alter table public.alliance_events add column if not exists event_category text null;
    exception when others then
      -- ignore if permissions/schema variations
      null;
    end;
  end if;
end $$;

-- 3) RLS policies (select for members, write for managers)
do $$
begin
  if to_regclass('public.alliance_event_types') is not null then
    execute 'alter table public.alliance_event_types enable row level security';

    -- SELECT: any member of the alliance can view
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='alliance_event_types' and policyname='aet_select_members'
    ) then
      execute $p$
        create policy aet_select_members
        on public.alliance_event_types
        for select
        using (
          -- App admin (if function exists)
          (to_regprocedure('public.is_app_admin(uuid)') is not null and public.is_app_admin(auth.uid()))
          OR
          exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(alliance_event_types.alliance_code)
          )
        )
      $p$;
    end if;

    -- WRITE: only Owner/R4/R5 (and app admin) can insert/update/delete
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='alliance_event_types' and policyname='aet_write_managers'
    ) then
      execute $p$
        create policy aet_write_managers
        on public.alliance_event_types
        for all
        using (
          (to_regprocedure('public.is_app_admin(uuid)') is not null and public.is_app_admin(auth.uid()))
          OR
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
          (to_regprocedure('public.is_app_admin(uuid)') is not null and public.is_app_admin(auth.uid()))
          OR
          exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and upper(pa.alliance_code) = upper(alliance_event_types.alliance_code)
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
      $p$;
    end if;

  end if;
end $$;
