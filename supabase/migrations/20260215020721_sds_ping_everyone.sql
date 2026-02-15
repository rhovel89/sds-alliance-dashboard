-- FIX: ensure columns exist (your trigger expects updated_at)
alter table public.alliance_discord_settings
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Table-specific updated_at trigger (no dependency on any other tables)
create or replace function public.alliance_discord_settings_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_alliance_discord_settings_updated_at on public.alliance_discord_settings;
create trigger trg_alliance_discord_settings_updated_at
before update on public.alliance_discord_settings
for each row
execute procedure public.alliance_discord_settings_set_updated_at();

-- SDS: set role id to the @everyone role id you gave
update public.alliance_discord_settings
set role_id = '1438414858574889073'
where alliance_id = 'SDS';
