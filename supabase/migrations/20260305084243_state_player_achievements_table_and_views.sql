-- Ensure UUID generator exists
create extension if not exists pgcrypto;

-- Table: admin-awarded achievements bound to canonical player_id
create table if not exists public.state_player_achievements (
  id uuid primary key default gen_random_uuid(),

  state_code text not null,
  player_id uuid not null,

  player_name text,
  alliance_name text,
  alliance_code text,

  achievement_name text,
  title text,
  type_name text,

  status text not null default 'completed',
  current_count integer,
  required_count integer,

  notes text,
  meta jsonb not null default '{}'::jsonb,

  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

-- updated_at trigger (safe to re-create)
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_state_player_achievements_set_updated_at on public.state_player_achievements;
create trigger trg_state_player_achievements_set_updated_at
before update on public.state_player_achievements
for each row execute function public.tg_set_updated_at();

alter table public.state_player_achievements enable row level security;

-- RLS:
-- - Players can read their own rows (player_id == current_player_id()).
-- - State achievement staff (state_achievement_access) can read/write within that state.
drop policy if exists "spa_select" on public.state_player_achievements;
create policy "spa_select"
on public.state_player_achievements
for select
to authenticated
using (
  player_id = public.current_player_id()
  OR exists (
    select 1
    from public.state_achievement_access a
    where a.user_id = auth.uid()
      and a.state_code = state_code
  )
);

drop policy if exists "spa_write" on public.state_player_achievements;
create policy "spa_write"
on public.state_player_achievements
for insert
to authenticated
with check (
  exists (
    select 1
    from public.state_achievement_access a
    where a.user_id = auth.uid()
      and a.state_code = state_code
  )
);

drop policy if exists "spa_update" on public.state_player_achievements;
create policy "spa_update"
on public.state_player_achievements
for update
to authenticated
using (
  exists (
    select 1
    from public.state_achievement_access a
    where a.user_id = auth.uid()
      and a.state_code = state_code
  )
)
with check (
  exists (
    select 1
    from public.state_achievement_access a
    where a.user_id = auth.uid()
      and a.state_code = state_code
  )
);

drop policy if exists "spa_delete" on public.state_player_achievements;
create policy "spa_delete"
on public.state_player_achievements
for delete
to authenticated
using (
  exists (
    select 1
    from public.state_achievement_access a
    where a.user_id = auth.uid()
      and a.state_code = state_code
  )
);

-- Convenience view: "my admin-awarded achievements"
create or replace view public.my_state_player_achievements as
select spa.*
from public.state_player_achievements spa
where spa.player_id = public.current_player_id();

grant select on public.my_state_player_achievements to authenticated;
grant select on public.state_player_achievements to authenticated;
