-- Fix sat_kind_chk for state_achievement_types.kind
-- Goal: allow inserts from UI (default kind='count'), without breaking RLS.

do $$
begin
  if to_regclass('public.state_achievement_types') is null then
    raise notice 'public.state_achievement_types missing; skipping migration.';
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'state_achievement_types'
      and column_name = 'kind'
  ) then
    alter table public.state_achievement_types add column kind text;
  end if;
end $$;

-- Ensure safe default + existing data
alter table public.state_achievement_types alter column kind set default 'count';
alter table public.state_achievement_types drop constraint if exists sat_kind_chk;
update public.state_achievement_types
set kind = 'count'
where kind is null or btrim(kind) = '' or kind <> 'count';

alter table public.state_achievement_types alter column kind set not null;

-- Recreate constraint to allow current app kind
alter table public.state_achievement_types drop constraint if exists sat_kind_chk;
alter table public.state_achievement_types
  add constraint sat_kind_chk check (kind in ('count'));
