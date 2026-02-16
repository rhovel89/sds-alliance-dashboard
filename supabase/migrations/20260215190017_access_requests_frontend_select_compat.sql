-- Make access_requests compatible with frontend selects:
-- select=id,user_id,game_name,requested_alliances,status,decision_reason,created_at

alter table public.access_requests
  add column if not exists user_id uuid;

alter table public.access_requests
  add column if not exists game_name text;

alter table public.access_requests
  add column if not exists requested_alliances text[] not null default '{}'::text[];

alter table public.access_requests
  add column if not exists decision_reason text;

-- Backfill user_id from auth_user_id if present
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='access_requests' and column_name='auth_user_id'
  ) then
    update public.access_requests
    set user_id = auth_user_id
    where user_id is null and auth_user_id is not null;
  end if;
end $$;

-- Backfill requested_alliances from requested_alliance_codes if present
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='access_requests' and column_name='requested_alliance_codes'
  ) then
    update public.access_requests
    set requested_alliances = requested_alliance_codes
    where (array_length(requested_alliances,1) is null)
      and requested_alliance_codes is not null;
  end if;
end $$;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
