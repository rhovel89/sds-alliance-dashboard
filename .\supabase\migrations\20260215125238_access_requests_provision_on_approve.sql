-- Onboarding approval autosync:
-- When access_requests.status becomes 'approved', auto-create/update player + memberships.

-- Ensure access_requests columns exist (safe, additive)
alter table public.access_requests
  add column if not exists game_name text;

alter table public.access_requests
  add column if not exists requested_alliance_codes text[] not null default '{}'::text[];

alter table public.access_requests
  add column if not exists status text not null default 'pending';

alter table public.access_requests
  add column if not exists approved_at timestamptz;

alter table public.access_requests
  add column if not exists approved_by uuid;

alter table public.access_requests
  add column if not exists processed_at timestamptz;

-- Provision function: creates/updates player + memberships when request is approved
create or replace function public.provision_access_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_user_id uuid;
  v_game_name text;
  v_codes text[];
  v_player_id uuid;
  has_user_id boolean := false;
  has_auth_user_id boolean := false;
begin
  -- Determine requester user id column (user_id preferred; fallback auth_user_id)
  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='access_requests' and column_name='user_id'
  ) into has_user_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='access_requests' and column_name='auth_user_id'
  ) into has_auth_user_id;

  if has_user_id then
    execute 'select user_id from public.access_requests where id=$1' into v_user_id using p_request_id;
  elsif has_auth_user_id then
    execute 'select auth_user_id from public.access_requests where id=$1' into v_user_id using p_request_id;
  else
    return;
  end if;

  execute 'select status from public.access_requests where id=$1' into v_status using p_request_id;
  if coalesce(v_status,'') <> 'approved' then
    return;
  end if;

  execute 'select game_name from public.access_requests where id=$1' into v_game_name using p_request_id;
  execute 'select requested_alliance_codes from public.access_requests where id=$1' into v_codes using p_request_id;

  -- Fallback: if requested_alliance_codes empty, try join table access_request_alliances(request_id, alliance_code)
  if (v_codes is null) or (array_length(v_codes,1) is null) then
    if exists (
      select 1 from information_schema.tables
      where table_schema='public' and table_name='access_request_alliances'
    ) then
      select coalesce(array_agg(alliance_code order by alliance_code), '{}'::text[])
      into v_codes
      from public.access_request_alliances
      where request_id = p_request_id;
    end if;
  end if;

  -- Find existing player by auth_user_id
  select id into v_player_id
  from public.players
  where auth_user_id = v_user_id
  limit 1;

  if v_player_id is null then
    -- Insert new player; prefer game_name if column exists, else name
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='players' and column_name='game_name'
    ) then
      insert into public.players (game_name, auth_user_id)
      values (nullif(btrim(coalesce(v_game_name,'')),''), v_user_id)
      returning id into v_player_id;
    else
      insert into public.players (name, auth_user_id)
      values (nullif(btrim(coalesce(v_game_name,'')),''), v_user_id)
      returning id into v_player_id;
    end if;
  else
    update public.players
    set auth_user_id = v_user_id
    where id = v_player_id and auth_user_id is null;
  end if;

  -- Create memberships (default role: member)
  if v_codes is not null and array_length(v_codes,1) is not null then
    insert into public.player_alliances (player_id, alliance_code, role)
    select v_player_id, upper(btrim(code)), 'member'
    from unnest(v_codes) as code
    where btrim(code) <> ''
    on conflict (player_id, alliance_code) do nothing;
  end if;

  update public.access_requests
  set processed_at = now()
  where id = p_request_id and processed_at is null;
end $$;

grant execute on function public.provision_access_request(uuid) to authenticated;

-- Trigger wrapper function (must exist BEFORE we create trigger)
create or replace function public._access_requests_provision_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.provision_access_request(new.id);
  return new;
end $$;

-- Create trigger once (runs on status change to approved)
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_access_requests_provision_on_approve') then
    execute '
      create trigger trg_access_requests_provision_on_approve
      after update on public.access_requests
      for each row
      when (new.status = ''approved'' and (old.status is distinct from new.status))
      execute function public._access_requests_provision_trigger()
    ';
  end if;
end $$;
