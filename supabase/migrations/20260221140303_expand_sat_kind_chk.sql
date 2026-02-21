-- Expand sat_kind_chk to include 'count' (fix broken $$ quoting)
-- Generated: 20260221140303 (patched)

DO $$
BEGIN
  IF to_regclass('public.state_achievement_types') IS NULL THEN
    RAISE NOTICE 'public.state_achievement_types missing; skipping.';
    RETURN;
  END IF;

  -- Ensure column exists (no-op if present)
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='state_achievement_types'
      AND column_name='kind'
  ) THEN
    ALTER TABLE public.state_achievement_types ADD COLUMN kind text;
  END IF;

  -- Safe default for new inserts
  ALTER TABLE public.state_achievement_types
    ALTER COLUMN kind SET DEFAULT 'count';

  -- Normalize blanks only
  UPDATE public.state_achievement_types
     SET kind = 'count'
   WHERE kind IS NULL OR btrim(kind) = '';

  -- Drop + recreate constraint (idempotent)
  ALTER TABLE public.state_achievement_types
    DROP CONSTRAINT IF EXISTS sat_kind_chk;

  ALTER TABLE public.state_achievement_types
    ADD CONSTRAINT sat_kind_chk CHECK (kind IN ('count'));
END
$$;