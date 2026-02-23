-- ============================
-- Onboarding + Memberships v1
-- ============================

create extension if not exists pgcrypto;

-- 1) Memberships table
create table if not exists public.alliance_memberships (
  id uuid primary key default gen_random_uuid(),
  alliance_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint alliance_memberships_role_check
    check (role in ('owner','r5','r4','member','viewer')),
  constraint alliance_memberships_unique unique (alliance_id, user_id)
);

create or replace function public.alliance_memberships_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_alliance_memberships_updated_at on public.alliance_memberships;
create trigger trg_alliance_memberships_updated_at
before update on public.alliance_memberships
for each row
execute procedure public.alliance_memberships_set_updated_at();

alter table public.alliance_memberships enable row level security;

-- Users can read their own memberships. Admins can read all.
drop policy if exists "memberships_select" on public.alliance_memberships;
create policy "memberships_select"
on public.alliance_memberships
for select
to authenticated
using (
  auth.uid() = user_id
  or public.is_app_admin(auth.uid())
);

-- Only app admins can manage memberships (v1).
drop policy if exists "memberships_admin_manage" on public.alliance_memberships;
create policy "memberships_admin_manage"
on public.alliance_memberships
for all
to authenticated
using (public.is_app_admin(auth.uid()))
with check (public.is_app_admin(auth.uid()));

-- 2) Access requests table
create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_alliances text[] not null,
  note text null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_by uuid null references auth.users(id),
  reviewed_at timestamptz null,
  decision_note text null,
  constraint access_requests_status_check
    check (status in ('pending','approved','rejected'))
);

alter table public.access_requests enable row level security;

-- Users can create their own requests
drop policy if exists "access_requests_insert_own" on public.access_requests;
create policy "access_requests_insert_own"
on public.access_requests
for insert
to authenticated
with check (auth.uid() = user_id);

-- Users can read their own requests; admins can read all
drop policy if exists "access_requests_select_own_or_admin" on public.access_requests;
create policy "access_requests_select_own_or_admin"
on public.access_requests
for select
to authenticated
using (auth.uid() = user_id or public.is_app_admin(auth.uid()));

-- Only admins can update/decide
drop policy if exists "access_requests_update_admin" on public.access_requests;
create policy "access_requests_update_admin"
on public.access_requests
for update
to authenticated
using (public.is_app_admin(auth.uid()))
with check (public.is_app_admin(auth.uid()));

drop policy if exists "access_requests_delete_admin" on public.access_requests;
create policy "access_requests_delete_admin"
on public.access_requests
for delete
to authenticated
using (public.is_app_admin(auth.uid()));

-- 3) Helper functions for RLS on alliance_events
create or replace function public.is_alliance_member(a text)
returns boolean
stable
language sql
as $$
  select exists (
    select 1
    from public.alliance_memberships m
    where m.user_id = auth.uid()
      and upper(m.alliance_id) = upper(a)
  );
$$;

create or replace function public.can_edit_alliance(a text)
returns boolean
stable
language sql
as $$
  select
    public.is_app_admin(auth.uid())
    or exists (
      select 1
      from public.alliance_memberships m
      where m.user_id = auth.uid()
        and upper(m.alliance_id) = upper(a)
        and m.role in ('owner','r4','r5')
    );
$$;

-- 4) Enforce RLS on alliance_events (drop existing policies safely, then apply ours)
alter table public.alliance_events enable row level security;

do $$
declare r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname='public' and tablename='alliance_events'
  loop
    execute format('drop policy if exists %I on public.alliance_events', r.policyname);
  end loop;
end $$;

create policy "alliance_events_select_members"
on public.alliance_events
for select
to authenticated
using (
  public.is_app_admin(auth.uid())
  or public.is_alliance_member(alliance_id)
);

create policy "alliance_events_insert_editors"
on public.alliance_events
for insert
to authenticated
with check (public.can_edit_alliance(alliance_id));

create policy "alliance_events_update_editors"
on public.alliance_events
for update
to authenticated
using (public.can_edit_alliance(alliance_id))
with check (public.can_edit_alliance(alliance_id));

create policy "alliance_events_delete_editors"
on public.alliance_events
for delete
to authenticated
using (public.can_edit_alliance(alliance_id));
