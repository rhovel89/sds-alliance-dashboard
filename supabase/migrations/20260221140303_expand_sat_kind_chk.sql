-- Expand sat_kind_chk to include 'count' (and preserve existing allowed kinds)
-- Generated: 20260221140303

do \$\$
begin
  if to_regclass('public.state_achievement_types') is null then
    raise notice 'public.state_achievement_types missing; skipping.';
  else
    -- Ensure column exists (no-op if present)
    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='state_achievement_types' and column_name='kind'
    ) then
      alter table public.state_achievement_types add column kind text;
    end if;

    -- Ensure a safe default for new inserts
    alter table public.state_achievement_types alter column kind set default 'count';

    -- Normalize blanks to default (do not change valid existing values)
    update public.state_achievement_types
      set kind = 'count'
    where kind is null or btrim(kind) = '';

    -- Drop + recreate constraint (idempotent)
    alter table public.state_achievement_types drop constraint if exists sat_kind_chk;
    alter table public.state_achievement_types add constraint sat_kind_chk check (kind in ('count'));
  end if;
end
\$\$;
