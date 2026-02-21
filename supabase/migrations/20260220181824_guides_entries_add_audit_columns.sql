-- ============================================================
-- Guides: add audit columns for triggers (idempotent)
-- Fixes: record "new" has no field "updated_by"
-- ============================================================

-- Entries
alter table if exists public.guide_section_entries
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid;

-- Sections (safe to add too; helps future triggers)
alter table if exists public.guide_sections
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid;