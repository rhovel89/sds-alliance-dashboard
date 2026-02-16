-- ACCESS REQUESTS: harden schema + approve/deny RPCs that match frontend payload keys

-- 1) Compatibility columns (additive only)
alter table public.access_requests add column if not exists user_id uuid;
alter table public.access_requests add column if not exists game_name text;

-- Your frontend is selecting requested_alliances (compat) and we also keep requested_alliance_codes (canonical)
alter table public.access_requests add column if not exists requested_alliance_codes text[] not null default '{}'::text[];
alter table public.access_requests add column if not exists requested_alliances     text[] not null default '{}'::text[];

alter table public.access_requests add column if not exists status text not null default 'pending';

-- Decision metadata (compat)
alter table public.access_requests add column if not exists decision_reason text;
alter table public.access_requests add column if not exists decided_at timestamptz;
alter table public.access_requests add column if not exists decided_by uuid;

-- Keep older names too if other code uses them
alter table public.access_requests add column if not exists approved_at timestamptz;
alter table public.access_requests add column if not exists approved_by uuid;

alter table public.access_requests add column if not exists processed_at timestamptz;

-- 2) Keep requested_alliances and requested_alliance_codes in sync (best-effort backfill)
update public.access_requests
set requested_alliance_codes = requested_alliances
where (requested_alliance_codes is null or array_length(requested_alliance_codes,1) is null)
  and requested_alliances is not null
  and array_length(requested_alliances,1) is not null;

update public.access_requests
set requested_alliances = requested_alliance_codes
where (requested_alliances is null or array_length(requested_alliances,1) is null)
  and requested_alliance_codes is not null
  and array_length(requested_alliance_codes,1) is not null;

-- 3) Normalize statuses so the constraint won't fail
update public.access_requests
set status = lower(btrim(status))
where status is not null;

update public.access_requests
set status = 'denied'
where status in ('rejected','declined','deny');

update public.access_requests
set status = 'pending'
where status is null
   or btrim(status) = ''
   or status not in ('pending','approved','denied');

-- 4) Replace status check constraint to allow denied
alter table public.access_requests
  drop constraint if exists access_requests_status_check;

alter table public.access_requests
  add constraint access_requests_status_check
  check (status in ('pending','approved','denied'));

-- 5) Internal helper (no dependency on any existing RPC)
create or replace function public._is_app_admin()
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from public.app_admins a
    where a.user_id = auth.uid()
  );
$$;

-- 6) APPROVE (frontend was calling approve_access_request(p_role, request_id))
create or replace function public.approve_access_request(p_role text, request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public._is_app_admin() then
    raise exception 'not authorized';
  end if;

  update public.access_requests
  set status = 'approved',
      decided_by = auth.uid(),
      decided_at = now(),
      approved_by = auth.uid(),
      approved_at = now(),
      processed_at = coalesce(processed_at, now()),
      decision_reason = null
  where id = request_id;

  -- If provision function exists, run it
  if to_regprocedure('public.provision_access_request(uuid)') is not null then
    perform public.provision_access_request(request_id);
  end if;
end;
$$;

grant execute on function public.approve_access_request(text, uuid) to authenticated;

-- 7) DENY (frontend was calling deny_access_request(p_reason, request_id))
create or replace function public.deny_access_request(p_reason text, request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public._is_app_admin() then
    raise exception 'not authorized';
  end if;

  update public.access_requests
  set status = 'denied',
      decided_by = auth.uid(),
      decided_at = now(),
      processed_at = coalesce(processed_at, now()),
      decision_reason = nullif(btrim(coalesce(p_reason,'')),'')
  where id = request_id;
end;
$$;

grant execute on function public.deny_access_request(text, uuid) to authenticated;

-- 8) Best-effort: refresh PostgREST schema cache (so RPC shows up immediately)
do $$
begin
  perform pg_notify('pgrst', 'reload schema');
exception when others then
  null;
end $$;
