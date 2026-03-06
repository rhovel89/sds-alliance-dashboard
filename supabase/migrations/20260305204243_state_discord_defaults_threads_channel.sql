do $$
begin
  if to_regclass('public.state_discord_defaults') is not null then
    alter table public.state_discord_defaults
      add column if not exists threads_channel_id text;
  end if;
end $$;
