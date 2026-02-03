-- PROFILES
create table if not exists profiles (
  user_id uuid primary key,
  game_name text not null,
  created_at timestamptz default now()
);

-- ROLES AUDIT
create table if not exists alliance_role_audit (
  id uuid default gen_random_uuid() primary key,
  alliance_id text not null,
  target_user uuid not null,
  new_role text not null,
  created_at timestamptz default now()
);

-- INVITES
create table if not exists alliance_invites (
  id uuid default gen_random_uuid() primary key,
  alliance_id text not null,
  token uuid not null,
  created_at timestamptz default now()
);

-- OWNER LOCK
create table if not exists alliance_settings (
  alliance_id text primary key,
  owner_lock boolean default true
);
