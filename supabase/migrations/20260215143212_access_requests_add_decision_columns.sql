-- Add columns expected by approve_access_request + Owner Requests UI (safe/additive)
alter table public.access_requests
  add column if not exists decided_by uuid;

alter table public.access_requests
  add column if not exists decided_at timestamptz;

-- Optional backfill from approved_* if your table already has those columns
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='access_requests' and column_name='approved_by'
  ) then
    execute '
      update public.access_requests
      set decided_by = coalesce(decided_by, approved_by)
      where decided_by is null and approved_by is not null
    ';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='access_requests' and column_name='approved_at'
  ) then
    execute '
      update public.access_requests
      set decided_at = coalesce(decided_at, approved_at)
      where decided_at is null and approved_at is not null
    ';
  end if;
end $$;
