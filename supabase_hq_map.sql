-- ==========================================================
-- HQ MAP persistence tables + RLS
-- Paste into Supabase SQL Editor
-- ==========================================================

-- Stores each cell (tile) for an alliance
create table if not exists public.hq_map_cells (
  alliance_id text not null,
  slot_index integer not null,
  player_name text default '',
  coords text default '',
  updated_at timestamptz not null default now(),
  primary key (alliance_id, slot_index)
);

-- Stores global map state (size + edit lock)
create table if not exists public.hq_map_state (
  alliance_id text primary key,
  hq_size integer not null default 120,
  edit_locked boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.hq_map_cells enable row level security;
alter table public.hq_map_state enable row level security;

-- NOTE:
-- These policies assume you have a user_alliances table with:
-- user_id (uuid), alliance_id (text), role_label (text)
-- Adjust if your schema differs.

-- READ: any member of the alliance can read the HQ map
drop policy if exists hq_map_cells_read on public.hq_map_cells;
create policy hq_map_cells_read
on public.hq_map_cells
for select
using (
  exists (
    select 1 from public.user_alliances ua
    where ua.alliance_id = hq_map_cells.alliance_id
      and ua.user_id = auth.uid()
  )
);

-- WRITE: only Owner or Mod can edit cells
drop policy if exists hq_map_cells_write_owner_mod on public.hq_map_cells;
create policy hq_map_cells_write_owner_mod
on public.hq_map_cells
for insert
with check (
  exists (
    select 1 from public.user_alliances ua
    where ua.alliance_id = hq_map_cells.alliance_id
      and ua.user_id = auth.uid()
      and ua.role_label in ('Owner','Mod')
  )
);

drop policy if exists hq_map_cells_update_owner_mod on public.hq_map_cells;
create policy hq_map_cells_update_owner_mod
on public.hq_map_cells
for update
using (
  exists (
    select 1 from public.user_alliances ua
    where ua.alliance_id = hq_map_cells.alliance_id
      and ua.user_id = auth.uid()
      and ua.role_label in ('Owner','Mod')
  )
);

-- HQ MAP STATE read/write
drop policy if exists hq_map_state_read on public.hq_map_state;
create policy hq_map_state_read
on public.hq_map_state
for select
using (
  exists (
    select 1 from public.user_alliances ua
    where ua.alliance_id = hq_map_state.alliance_id
      and ua.user_id = auth.uid()
  )
);

drop policy if exists hq_map_state_write_owner on public.hq_map_state;
create policy hq_map_state_write_owner
on public.hq_map_state
for insert
with check (
  exists (
    select 1 from public.user_alliances ua
    where ua.alliance_id = hq_map_state.alliance_id
      and ua.user_id = auth.uid()
      and ua.role_label = 'Owner'
  )
);

drop policy if exists hq_map_state_update_owner on public.hq_map_state;
create policy hq_map_state_update_owner
on public.hq_map_state
for update
using (
  exists (
    select 1 from public.user_alliances ua
    where ua.alliance_id = hq_map_state.alliance_id
      and ua.user_id = auth.uid()
      and ua.role_label = 'Owner'
  )
);
