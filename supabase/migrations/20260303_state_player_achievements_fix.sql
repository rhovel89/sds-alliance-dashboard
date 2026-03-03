-- ==========================================================
-- state_player_achievements: ensure columns match app usage
-- ==========================================================

create table if not exists public.state_player_achievements (
  id uuid primary key default gen_random_uuid(),
  state_code text not null,
  player_id uuid not null references public.players(id) on delete cascade,
  title text not null,
  status text not null default 'completed',
  progress_percent int not null default 100,
  note text null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure updated_at exists even if table existed previously
alter table public.state_player_achievements
  add column if not exists updated_at timestamptz not null default now();

-- Keep updated_at current
create or replace function public._touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_spa_touch_updated_at on public.state_player_achievements;
create trigger trg_spa_touch_updated_at
before update on public.state_player_achievements
for each row execute function public._touch_updated_at();

create index if not exists idx_spa_state_player_created
  on public.state_player_achievements (state_code, player_id, created_at desc);

alter table public.state_player_achievements enable row level security;

-- Players can read their own rows
drop policy if exists "spa_read_own" on public.state_player_achievements;
create policy "spa_read_own"
on public.state_player_achievements
for select
to authenticated
using (
  exists (
    select 1 from public.players p
    where p.id = state_player_achievements.player_id
      and p.auth_user_id = auth.uid()
  )
);

-- App admins can manage everything
drop policy if exists "spa_admin_select" on public.state_player_achievements;
create policy "spa_admin_select"
on public.state_player_achievements
for select
to authenticated
using (public.is_app_admin());

drop policy if exists "spa_admin_insert" on public.state_player_achievements;
create policy "spa_admin_insert"
on public.state_player_achievements
for insert
to authenticated
with check (public.is_app_admin());

drop policy if exists "spa_admin_update" on public.state_player_achievements;
create policy "spa_admin_update"
on public.state_player_achievements
for update
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

drop policy if exists "spa_admin_delete" on public.state_player_achievements;
create policy "spa_admin_delete"
on public.state_player_achievements
for delete
to authenticated
using (public.is_app_admin());
