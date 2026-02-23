-- Ensure guide_section_entries exists (fixes PostgREST 404 on /rest/v1/guide_section_entries)
create extension if not exists pgcrypto;

create table if not exists public.guide_section_entries (
  id uuid primary key default gen_random_uuid(),
  alliance_code text not null,
  section_id uuid not null references public.guide_sections(id) on delete cascade,
  title text not null,
  body text not null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guide_section_entries_alliance_idx
  on public.guide_section_entries(alliance_code);

create index if not exists guide_section_entries_section_idx
  on public.guide_section_entries(section_id);

alter table public.guide_section_entries enable row level security;

grant select, insert, update, delete on table public.guide_section_entries to authenticated;

do $$
begin
  -- Members can read entries in their alliance
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='guide_section_entries' and policyname='gse_select_members'
  ) then
    create policy gse_select_members
    on public.guide_section_entries
    for select
    using (
      exists (select 1 from public.app_admins aa where aa.user_id = auth.uid())
      or exists (
        select 1
        from public.players me
        join public.player_alliances pa on pa.player_id = me.id
        where me.auth_user_id = auth.uid()
          and pa.alliance_code = guide_section_entries.alliance_code
      )
    );
  end if;

  -- Owner/R4/R5 (and app admins) can manage entries
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='guide_section_entries' and policyname='gse_manage_r4r5'
  ) then
    create policy gse_manage_r4r5
    on public.guide_section_entries
    for all
    using (
      exists (select 1 from public.app_admins aa where aa.user_id = auth.uid())
      or exists (
        select 1
        from public.players me
        join public.player_alliances pa on pa.player_id = me.id
        where me.auth_user_id = auth.uid()
          and pa.alliance_code = guide_section_entries.alliance_code
          and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
      )
    )
    with check (
      exists (select 1 from public.app_admins aa where aa.user_id = auth.uid())
      or exists (
        select 1
        from public.players me
        join public.player_alliances pa on pa.player_id = me.id
        where me.auth_user_id = auth.uid()
          and pa.alliance_code = guide_section_entries.alliance_code
          and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
      )
    );
  end if;
end $$;
