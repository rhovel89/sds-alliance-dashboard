-- ============================================================
-- Fix guide_section_entries missing columns for trigger
-- ============================================================

create extension if not exists pgcrypto;

-- Ensure table exists (no-op if already there)
create table if not exists public.guide_section_entries (
  id uuid primary key default gen_random_uuid(),
  alliance_code text not null,
  section_id uuid not null references public.guide_sections(id) on delete cascade,
  title text not null,
  body text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add missing columns (idempotent)
alter table public.guide_section_entries
  add column if not exists created_by uuid;

alter table public.guide_section_entries
  add column if not exists updated_by uuid;

alter table public.guide_section_entries
  add column if not exists updated_at timestamptz not null default now();

-- Recreate trigger function (now safe because columns exist)
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

-- Ensure trigger exists
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