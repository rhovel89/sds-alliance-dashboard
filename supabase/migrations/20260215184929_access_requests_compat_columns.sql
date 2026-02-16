-- Compatibility columns so frontend queries don't 400
alter table public.access_requests
  add column if not exists user_id uuid;

alter table public.access_requests
  add column if not exists requested_alliances text[] not null default '{}'::text[];

alter table public.access_requests
  add column if not exists decision_reason text;

-- Backfill user_id from auth_user_id if that column exists
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='access_requests' and column_name='auth_user_id'
  ) then
    update public.access_requests
    set user_id = auth_user_id
    where user_id is null and auth_user_id is not null;
  end if;
end $$;

-- Backfill requested_alliances from requested_alliance_codes if that column exists
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='access_requests' and column_name='requested_alliance_codes'
  ) then
    update public.access_requests
    set requested_alliances = requested_alliance_codes
    where (requested_alliances is null or array_length(requested_alliances,1) is null)
      and requested_alliance_codes is not null;
  end if;
end $$;

-- Backfill decision_reason from any existing reason column if present
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='access_requests' and column_name='denial_reason'
  ) then
    update public.access_requests
    set decision_reason = denial_reason
    where decision_reason is null and denial_reason is not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='access_requests' and column_name='reason'
  ) then
    update public.access_requests
    set decision_reason = reason
    where decision_reason is null and reason is not null;
  end if;
end $$;

-- Keep compat columns in sync going forward
create or replace function public.access_requests_sync_compat()
returns trigger
language plpgsql
as $$
begin
  -- user_id <-> auth_user_id (if auth_user_id exists)
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='access_requests' and column_name='auth_user_id'
  ) then
    if new.user_id is null and new.auth_user_id is not null then
      new.user_id := new.auth_user_id;
    end if;

    if new.auth_user_id is null and new.user_id is not null then
      new.auth_user_id := new.user_id;
    end if;
  end if;

  -- requested_alliances <-> requested_alliance_codes (if requested_alliance_codes exists)
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='access_requests' and column_name='requested_alliance_codes'
  ) then
    if (new.requested_alliances is null) then
      new.requested_alliances := '{}'::text[];
    end if;

    if (new.requested_alliance_codes is null) then
      new.requested_alliance_codes := '{}'::text[];
    end if;

    -- prefer explicit changes
    if new.requested_alliances <> new.requested_alliance_codes then
      -- if one is empty, copy the other; otherwise copy requested_alliances into requested_alliance_codes
      if array_length(new.requested_alliances,1) is null and array_length(new.requested_alliance_codes,1) is not null then
        new.requested_alliances := new.requested_alliance_codes;
      else
        new.requested_alliance_codes := new.requested_alliances;
      end if;
    end if;
  end if;

  return new;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname='trg_access_requests_sync_compat') then
    create trigger trg_access_requests_sync_compat
    before insert or update on public.access_requests
    for each row
    execute function public.access_requests_sync_compat();
  end if;
end $$;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
