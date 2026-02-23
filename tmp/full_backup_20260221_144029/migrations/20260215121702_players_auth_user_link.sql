-- Add canonical auth user link column for players
alter table public.players
  add column if not exists auth_user_id uuid;

-- Backfill from older columns if they exist (safe)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='players' and column_name='user_id'
  ) then
    execute 'update public.players set auth_user_id = user_id where auth_user_id is null and user_id is not null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='players' and column_name='linked_user_id'
  ) then
    execute 'update public.players set auth_user_id = linked_user_id where auth_user_id is null and linked_user_id is not null';
  end if;
end $$;

-- Ensure one auth user maps to at most one player (but allow nulls)
create unique index if not exists players_auth_user_id_unique
  on public.players (auth_user_id)
  where auth_user_id is not null;
