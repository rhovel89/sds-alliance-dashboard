-- Ensure decision/approval columns exist (safe/additive)
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

-- Replace RPC with a stable, admin-guarded implementation.
-- IMPORTANT: argument name is request_id (frontend must pass request_id)
drop function if exists public.approve_access_request(uuid);

create or replace function public.approve_access_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- hard guard: only app admins (owner) can approve
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

  -- Provision player + memberships if you have the function (you do)
  if to_regprocedure('public.provision_access_request(uuid)') is not null then
    perform public.provision_access_request(request_id);
  end if;
end $$;

grant execute on function public.approve_access_request(uuid) to authenticated;
