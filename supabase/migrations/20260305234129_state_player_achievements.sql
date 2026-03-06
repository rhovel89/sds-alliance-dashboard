create table if not exists public.state_player_achievements (
  id uuid primary key default gen_random_uuid(),
  state_code text not null,
  player_id uuid not null,
  player_name text null,
  alliance_code text null,
  alliance_name text null,
  achievement_type_id uuid null,
  option_id uuid null,
  achievement_name text null,
  title text null,
  kind text null,
  status text null default 'completed',
  notes text null,
  awarded_by uuid null,
  awarded_at timestamptz null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_spa_state on public.state_player_achievements(state_code);
create index if not exists idx_spa_player on public.state_player_achievements(player_id);

alter table public.state_player_achievements enable row level security;
