-- State Player Achievements (owner/admin can record achievements for others)
-- Safe: new table + new RLS only

create extension if not exists pgcrypto;

-- Helper: all player IDs connected to current auth user (players.auth_user_id + player_auth_links)
create or replace function public.current_player_ids()
returns table(player_id uuid)
language sql
stable
as $$
  select p.id
  from public.players p
  where p.auth_user_id = auth.uid()

  union

  select l.player_id
  from public.player_auth_links l
  where l.user_id = auth.uid();
$$;

create table if not exists public.state_player_achievements (
  id uuid primary key default gen_random_uuid(),
  state_code text not null,
  player_id uuid not null references public.players(id) on delete cascade,

  -- Optional linkage to your existing achievement config (if you want it later)
  achievement_type_id uuid null references public.state_achievement_types(id) on delete set null,
  achievement_option_id uuid null references public.state_achievement_options(id) on delete set null,

  title text not null,
  status text not null default 'completed'
    check (lower(status) = any(array['in_progress','completed','revoked'])),
  progress_percent integer null check (progress_percent is null or (progress_percent >= 0 and progress_percent <= 100)),
  note text null,

  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.trg_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_state_player_achievements_touch on public.state_player_achievements;
create trigger trg_state_player_achievements_touch
before update on public.state_player_achievements
for each row execute function public.trg_touch_updated_at();

alter table public.state_player_achievements enable row level security;

-- READ: owner/admin OR state viewers/editors OR the player themself
drop policy if exists spa_select on public.state_player_achievements;
create policy spa_select
on public.state_player_achievements
for select
to authenticated
using (
  is_dashboard_owner()
  or is_app_admin()
  or can_view_state_achievements(state_code)
  or player_id in (select player_id from public.current_player_ids())
);

-- WRITE: owner/admin OR state editors
drop policy if exists spa_write on public.state_player_achievements;
create policy spa_write
on public.state_player_achievements
for all
to authenticated
using (
  is_dashboard_owner()
  or is_app_admin()
  or can_edit_state_achievements(state_code)
)
with check (
  is_dashboard_owner()
  or is_app_admin()
  or can_edit_state_achievements(state_code)
);
