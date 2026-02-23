-- Fix common approval break: updated_at triggers require updated_at column
alter table public.access_requests
  add column if not exists updated_at timestamptz not null default now();

-- Keep decided columns too (safe)
alter table public.access_requests
  add column if not exists decided_by uuid;

alter table public.access_requests
  add column if not exists decided_at timestamptz;

-- Ensure trigger function exists (safe)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Ensure trigger exists only once (safe)
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_access_requests_updated_at'
  ) then
    create trigger trg_access_requests_updated_at
    before update on public.access_requests
    for each row
    execute function public.set_updated_at();
  end if;
end $$;

-- Backfill
update public.access_requests
set updated_at = coalesce(updated_at, now())
where updated_at is null;
