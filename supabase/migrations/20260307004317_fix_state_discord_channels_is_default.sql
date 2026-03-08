-- Add is_default if missing (safe)
alter table if exists public.state_discord_channels
  add column if not exists is_default boolean not null default false;

-- Add active if missing (safe, optional)
alter table if exists public.state_discord_channels
  add column if not exists active boolean not null default true;

-- Unique default per state (safe now because column exists)
create unique index if not exists state_discord_channels_one_default_per_state
  on public.state_discord_channels (state_code)
  where is_default;
