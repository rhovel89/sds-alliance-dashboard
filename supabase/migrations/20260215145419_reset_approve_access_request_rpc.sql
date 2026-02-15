-- Ensure required columns exist (safe/additive)
alter table public.access_requests
  add column if not exists status text not null default 'pending';

alter table public.access_requests
  add column if not exists decision text;

alter table public.access_requests
  add column if not exists approved_at timestamptz;

alter table public.access_requests
  add column if not exists approved_by uuid;

alter table public.access_requests
  add column if not exists decided_at timestamptz;

alter table public.access_requests
  add column if not exists decided_by uuid;

alter table public.access_requests
  add column if not exists processed_at timestamptz;

alter table public.access_requests
  add column if not exists updated_at timestamptz not null default now();

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

-- 🔥 Remove ALL approve_access_request overloads in public schema (prevents ambiguity)
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
    where n.nspname='public' and p.proname='approve_access_request'
  loop
    execute 'drop function if exists ' || r.sig || ' cascade';
  end loop;
end $$;

-- ✅ Recreate the EXACT signature your UI is calling:
create or replace function public.approve_access_request(p_role text, request_id uuid)
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
    status       = 'approved',
    decision     = coalesce(decision, 'approved'),
    approved_at  = coalesce(approved_at, now()),
    approved_by  = coalesce(approved_by, auth.uid()),
    decided_at   = coalesce(decided_at, now()),
    decided_by   = coalesce(decided_by, auth.uid()),
    processed_at = coalesce(processed_at, now()),
    updated_at   = now()
  where id = request_id;

  if not found then
    raise exception 'access request not found: %', request_id;
  end if;

  -- Provision player + memberships (if your function exists)
  if to_regprocedure('public.provision_access_request(uuid)') is not null then
    perform public.provision_access_request(request_id);
  end if;

  -- p_role is accepted for UI compatibility (we’ll wire it into role assignment next)
end $$;

-- Compatibility wrapper (optional, but helpful)
create or replace function public.approve_access_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.approve_access_request('member', request_id);
end $$;

grant execute on function public.approve_access_request(text, uuid) to authenticated;
grant execute on function public.approve_access_request(uuid) to authenticated;

-- Force PostgREST schema cache refresh
notify pgrst, 'reload schema';
