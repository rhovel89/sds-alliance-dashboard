-- ==========================================
-- Owner Membership Manager support (RLS)
-- ==========================================

create extension if not exists pgcrypto;

-- Ensure admin helper exists (used by RLS)
create or replace function public.is_app_admin(uid uuid)
returns boolean
stable
language sql
as $$
  select exists (select 1 from public.app_admins a where a.user_id = uid);
$$;

-- Memberships table
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

create index if not exists idx_alliance_memberships_alliance_id
  on public.alliance_memberships (alliance_id);

create index if not exists idx_alliance_memberships_user_id
  on public.alliance_memberships (user_id);

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

-- Clean old policies (safe)
do $$
declare r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname='public' and tablename='alliance_memberships'
  loop
    execute format('drop policy if exists %I on public.alliance_memberships', r.policyname);
  end loop;
end $$;

-- Users can read their own memberships; admins can read all
create policy "memberships_select_self_or_admin"
on public.alliance_memberships
for select
to authenticated
using (auth.uid() = user_id or public.is_app_admin(auth.uid()));

-- Only app admins can insert/update/delete memberships
create policy "memberships_admin_manage"
on public.alliance_memberships
for all
to authenticated
using (public.is_app_admin(auth.uid()))
with check (public.is_app_admin(auth.uid()));
