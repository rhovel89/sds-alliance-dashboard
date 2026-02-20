-- Owner override (Discord ID based): 775966588200943616
-- Adds:
--   - public.is_dashboard_owner() RPC (security definer)
--   - RLS policies allowing owner full access to:
--       * public.guide_sections
--       * public.guide_section_entries
--       * public.alliance_events

create or replace function public.is_dashboard_owner()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $func$
  select exists (
    select 1
    from auth.identities i
    where i.user_id = auth.uid()
      and lower(i.provider) = 'discord'
      and (
        i.provider_id = '775966588200943616'
        or (i.identity_data ->> 'sub') = '775966588200943616'
        or (i.identity_data ->> 'id') = '775966588200943616'
        or (i.identity_data ->> 'user_id') = '775966588200943616'
      )
  );
$func$;

alter table if exists public.guide_sections enable row level security;
alter table if exists public.guide_section_entries enable row level security;
alter table if exists public.alliance_events enable row level security;

-- GUIDE SECTIONS owner policy
do $do$
begin
  if to_regclass('public.guide_sections') is not null then
    if not exists (
      select 1 from pg_policies
      where schemaname='public'
        and tablename='guide_sections'
        and policyname='gs_owner_all'
    ) then
      execute $p$
        create policy gs_owner_all
        on public.guide_sections
        for all
        using (public.is_dashboard_owner())
        with check (public.is_dashboard_owner())
      $p$;
    end if;
  end if;
end
$do$;

-- GUIDE SECTION ENTRIES owner policy
do $do$
begin
  if to_regclass('public.guide_section_entries') is not null then
    if not exists (
      select 1 from pg_policies
      where schemaname='public'
        and tablename='guide_section_entries'
        and policyname='gse_owner_all'
    ) then
      execute $p$
        create policy gse_owner_all
        on public.guide_section_entries
        for all
        using (public.is_dashboard_owner())
        with check (public.is_dashboard_owner())
      $p$;
    end if;
  end if;
end
$do$;

-- ALLIANCE EVENTS owner policy
do $do$
begin
  if to_regclass('public.alliance_events') is not null then
    if not exists (
      select 1 from pg_policies
      where schemaname='public'
        and tablename='alliance_events'
        and policyname='ae_owner_all'
    ) then
      execute $p$
        create policy ae_owner_all
        on public.alliance_events
        for all
        using (public.is_dashboard_owner())
        with check (public.is_dashboard_owner())
      $p$;
    end if;
  end if;
end
$do$;