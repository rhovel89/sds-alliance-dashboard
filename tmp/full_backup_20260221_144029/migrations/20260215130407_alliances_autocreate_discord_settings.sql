-- Auto-create a discord settings row for new alliances (only if table+columns exist)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='alliance_discord_settings'
  )
  and exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='alliance_discord_settings' and column_name='alliance_id'
  ) then

    create or replace function public._alliances_discord_settings_init()
    returns trigger
    language plpgsql
    as $fn$
    begin
      if exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='alliance_discord_settings' and column_name='enabled'
      ) then
        insert into public.alliance_discord_settings (alliance_id, enabled)
        values (new.code, true)
        on conflict (alliance_id) do nothing;
      else
        insert into public.alliance_discord_settings (alliance_id)
        values (new.code)
        on conflict (alliance_id) do nothing;
      end if;

      return new;
    end
    $fn$;

    if not exists (
      select 1 from pg_trigger
      where tgname = 'trg_alliances_discord_settings_init'
    ) then
      execute 'create trigger trg_alliances_discord_settings_init
               after insert on public.alliances
               for each row execute function public._alliances_discord_settings_init()';
    end if;

  end if;
end $$;
