-- Fix onboarding UI error: access_requests.game_name does not exist
alter table public.access_requests
  add column if not exists game_name text;
