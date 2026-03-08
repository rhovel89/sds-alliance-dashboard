-- ================================
-- State Discord Defaults: Reports Channel
-- Safe, idempotent, schema-cache friendly
-- ================================

-- 1) Add reports_channel_id (nullable)
ALTER TABLE IF EXISTS public.state_discord_defaults
  ADD COLUMN IF NOT EXISTS reports_channel_id text;

-- 2) Drop NOT NULL constraints that block "not configured yet"
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='state_discord_defaults' AND column_name='alerts_channel_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.state_discord_defaults ALTER COLUMN alerts_channel_id DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='state_discord_defaults' AND column_name='bulletin_channel_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.state_discord_defaults ALTER COLUMN bulletin_channel_id DROP NOT NULL';
  END IF;
END $$;

-- 3) Make state_discord_channels safer (some environments lack "active")
ALTER TABLE IF EXISTS public.state_discord_channels
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

ALTER TABLE IF EXISTS public.state_discord_channels
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- Done
