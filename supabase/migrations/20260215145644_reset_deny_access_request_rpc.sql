-- Ensure columns exist for denial tracking (safe/additive)
alter table public.access_requests
  add column if not exists status text not null default 'pending';

alter table public.access_requests
  add column if not exists decision text;

alter table public.access_requests
  add column if not exists decided_at timestamptz;

alter table public.access_requests
  add column if not exists decided_by uuid;

alter table public.access_requests
  add column if not exists processed_at timestamptz;

alter table public.access_requests
  add column if not exists updated_at timestamptz not null default now();

-- Store denial reason
alter table public.access_requests
  add column if not exists denied_reason text;

alter table public.access_requests
  add column if not exists denied_at timestamptz;

alter table public.access_requests
  add column if not exists denied_by uuid;

-- Ensure updated_at trigger function exists (safe)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Ensure trigger exists only once (safe)
do $$
begin
  if not exists (select 1 from pg_trigger where tgname='trg_access_requests_updated_at') then
    create trigger trg_access_requests_updated_at
    before update on public.access_requests
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- 🔥 Remove ALL deny_access_request overloads to avoid ambiguity
do $$
declare r record;
begin
  for r in
    select format(
      '%I.%I(%s)',
      n.nspname,
      p.proname,
      pg_get_function_identity_arguments(p.oid)
    ) as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public' and p.proname='deny_access_request'
  loop
    execute 'drop function if exists ' || r.sig || ' cascade';
  end loop;
end $$;

-- ✅ Create the EXACT signature your UI calls:
-- rpc("deny_access_request", { p_reason, request_id })
create or replace function public.deny_access_request(p_reason text, request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Owner/app-admin only
  if not public.is_app_admin() then
    raise exception 'not authorized';
  end if;

  update public.access_requests
  set
    status       = 'denied',
    decision     = 'denied',
    denied_reason= nullif(btrim(coalesce(p_reason,'')), ''),
    denied_at    = coalesce(denied_at, now()),
    denied_by    = coalesce(denied_by, auth.uid()),
    decided_at   = coalesce(decided_at, now()),
    decided_by   = coalesce(decided_by, auth.uid()),
    processed_at = coalesce(processed_at, now()),
    updated_at   = now()
  where id = request_id;

  if not found then
    raise exception 'access request not found: %', request_id;
  end if;
end $$;

-- Optional compatibility wrapper
create or replace function public.deny_access_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.deny_access_request(null, request_id);
end $$;

grant execute on function public.deny_access_request(text, uuid) to authenticated;
grant execute on function public.deny_access_request(uuid) to authenticated;

-- Force PostgREST schema cache refresh
notify pgrst, 'reload schema';
