-- Ensure both columns exist (frontend expects name; we prefer game_name)
alter table public.players
  add column if not exists game_name text;

alter table public.players
  add column if not exists name text;

-- Backfill game_name from name if needed
update public.players
set game_name = coalesce(nullif(btrim(game_name),''), nullif(btrim(name),''), game_name)
where game_name is null or btrim(game_name) = '';

-- Backfill name from game_name if needed
update public.players
set name = coalesce(nullif(btrim(name),''), nullif(btrim(game_name),''), name)
where name is null or btrim(name) = '';

-- Keep them in sync going forward (idempotent)
create or replace function public.players_sync_names()
returns trigger
language plpgsql
as $$
begin
  if (new.game_name is null or btrim(new.game_name) = '')
     and (new.name is not null and btrim(new.name) <> '') then
    new.game_name := new.name;
  end if;

  if (new.name is null or btrim(new.name) = '')
     and (new.game_name is not null and btrim(new.game_name) <> '') then
    new.name := new.game_name;
  end if;

  return new;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_players_sync_names') then
    create trigger trg_players_sync_names
    before insert or update on public.players
    for each row
    execute function public.players_sync_names();
  end if;
end $$;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
