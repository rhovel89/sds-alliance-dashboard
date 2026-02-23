-- Add missing column access_requests.game_name (safe, handles existing tables)

do $$
declare
  src_col text := null;
begin
  -- 1) Add column if missing (nullable first)
  if not exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='access_requests'
      and column_name='game_name'
  ) then
    alter table public.access_requests add column game_name text;
  end if;

  -- 2) Try to backfill from a likely existing column if present
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='access_requests'
      and column_name='player_name'
  ) then
    src_col := 'player_name';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='access_requests'
      and column_name='ingame_name'
  ) then
    src_col := 'ingame_name';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='access_requests'
      and column_name='name'
  ) then
    src_col := 'name';
  end if;

  if src_col is not null then
    execute format(
      'update public.access_requests
       set game_name = btrim(%I::text)
       where (game_name is null or btrim(game_name) = '''')
         and %I is not null
         and btrim(%I::text) <> '''' ',
      src_col, src_col, src_col
    );
  end if;

  -- 3) Fill anything still blank so we can enforce NOT NULL safely
  update public.access_requests
  set game_name = 'UNKNOWN'
  where game_name is null or btrim(game_name) = '';

  -- 4) Enforce not null (matches what the app expects)
  begin
    alter table public.access_requests alter column game_name set not null;
  exception when others then
    -- If some weird edge-case prevents it, keep it nullable rather than breaking everything
    raise notice 'Could not set game_name NOT NULL. Leaving as nullable.';
  end;
end $$;
