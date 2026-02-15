-- ==========================================================
-- Onboarding requests + Owner approval -> roster auto-sync
-- ==========================================================

create extension if not exists pgcrypto;

-- admin helper (safe)
create or replace function public.is_app_admin(uid uuid)
returns boolean
stable
language sql
as $$
  select exists (select 1 from public.app_admins a where a.user_id = uid);
$$;

-- 1) Onboarding / access requests table
create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_name text not null,
  requested_alliances text[] not null,
  status text not null default 'pending',
  decided_by uuid null references auth.users(id) on delete set null,
  decided_at timestamptz null,
  decision_reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  player_id uuid null references public.players(id) on delete set null,
  constraint access_requests_status_check check (status in ('pending','approved','denied'))
);

create index if not exists idx_access_requests_user_id on public.access_requests(user_id);
create index if not exists idx_access_requests_status on public.access_requests(status);

-- updated_at trigger
create or replace function public.access_requests_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_access_requests_updated_at on public.access_requests;
create trigger trg_access_requests_updated_at
before update on public.access_requests
for each row execute procedure public.access_requests_set_updated_at();

alter table public.access_requests enable row level security;

-- RLS:
-- user can insert their own request
drop policy if exists access_requests_insert_own on public.access_requests;
create policy access_requests_insert_own
on public.access_requests
for insert
to authenticated
with check (auth.uid() = user_id and status = 'pending');

-- user can view their own; admins can view all
drop policy if exists access_requests_select_own_or_admin on public.access_requests;
create policy access_requests_select_own_or_admin
on public.access_requests
for select
to authenticated
using (auth.uid() = user_id or public.is_app_admin(auth.uid()));

-- user can delete their own pending request (cancel)
drop policy if exists access_requests_delete_own_pending on public.access_requests;
create policy access_requests_delete_own_pending
on public.access_requests
for delete
to authenticated
using (auth.uid() = user_id and status = 'pending');

-- only admins can update requests (approve/deny)
drop policy if exists access_requests_update_admin on public.access_requests;
create policy access_requests_update_admin
on public.access_requests
for update
to authenticated
using (public.is_app_admin(auth.uid()))
with check (public.is_app_admin(auth.uid()));

-- 2) RPC: approve request -> roster + link (sync triggers handle memberships)
create or replace function public.approve_access_request(
  p_request_id uuid,
  p_role text default 'member'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  r public.access_requests%rowtype;
  v_player_id uuid;
begin
  if not public.is_app_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  select * into r
  from public.access_requests
  where id = p_request_id
  for update;

  if r.id is null then
    raise exception 'request not found';
  end if;

  if r.status <> 'pending' then
    raise exception 'request is not pending';
  end if;

  if p_role not in ('owner','r5','r4','member','viewer') then
    raise exception 'invalid role';
  end if;

  -- If this auth user is already linked to a roster player, reuse it.
  select l.player_id into v_player_id
  from public.player_auth_links l
  where l.user_id = r.user_id;

  if v_player_id is null then
    insert into public.players (game_name, note)
    values (r.game_name, 'Created via onboarding approval')
    returning id into v_player_id;
  else
    -- Keep roster name up to date
    update public.players
    set game_name = r.game_name
    where id = v_player_id;
  end if;

  -- Link roster player -> auth user (upsert)
  insert into public.player_auth_links (player_id, user_id)
  values (v_player_id, r.user_id)
  on conflict (player_id) do update set user_id = excluded.user_id;

  -- Assign alliances from request
  insert into public.player_alliances (player_id, alliance_code, role)
  select
    v_player_id,
    upper(btrim(x)),
    p_role
  from unnest(r.requested_alliances) as x
  where btrim(x) <> ''
  on conflict (player_id, alliance_code)
  do update set role = excluded.role;

  -- Mark request approved
  update public.access_requests
  set status = 'approved',
      decided_by = auth.uid(),
      decided_at = now(),
      decision_reason = null,
      player_id = v_player_id
  where id = r.id;

  -- Your DB triggers will now auto-sync into alliance_memberships
  return v_player_id;
end;
$$;

-- 3) RPC: deny request
create or replace function public.deny_access_request(
  p_request_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  r public.access_requests%rowtype;
begin
  if not public.is_app_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  select * into r
  from public.access_requests
  where id = p_request_id
  for update;

  if r.id is null then
    raise exception 'request not found';
  end if;

  if r.status <> 'pending' then
    raise exception 'request is not pending';
  end if;

  update public.access_requests
  set status = 'denied',
      decided_by = auth.uid(),
      decided_at = now(),
      decision_reason = p_reason
  where id = r.id;
end;
$$;
