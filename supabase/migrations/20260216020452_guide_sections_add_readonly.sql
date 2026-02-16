-- Add readonly flag for guide sections (supports read-only vs discussion sections)
alter table if exists public.guide_sections
  add column if not exists readonly boolean not null default false;

comment on column public.guide_sections.readonly is
  'If true, section is read-only (no discussion posts).';

-- Best-effort: tell PostgREST to reload schema cache
notify pgrst, 'reload schema';
