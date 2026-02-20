-- Guide entries inside a guide section.
-- Fixes 404 on /rest/v1/guide_section_entries by creating the table + RLS.

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

create index if not exists guide_section_entries_alliance_section_idx
  on public.guide_section_entries (alliance_code, section_id);

create index if not exists guide_section_entries_updated_idx
  on public.guide_section_entries (alliance_code, section_id, updated_at desc);

create or replace function public._touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists _touch_updated_at on public.guide_section_entries;
create trigger _touch_updated_at
before update on public.guide_section_entries
for each row execute function public._touch_updated_at();

grant select, insert, update, delete on table public.guide_section_entries to authenticated;
alter table public.guide_section_entries enable row level security;

-- Members can read entries in their alliance
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

-- Owner/R4/R5 can create/edit/delete entries in their alliance
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
