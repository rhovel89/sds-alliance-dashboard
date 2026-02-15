-- Ensure players has an auth_user_id column we can link to Supabase auth users
alter table public.players
  add column if not exists auth_user_id uuid;

-- Helpful index (no uniqueness enforced to avoid breaking legacy data)
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and tablename='players' and indexname='idx_players_auth_user_id'
  ) then
    execute 'create index idx_players_auth_user_id on public.players(auth_user_id)';
  end if;
end $$;
