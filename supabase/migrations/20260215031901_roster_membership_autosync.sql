-- ==========================================================
-- Roster -> alliance_memberships auto-sync (source-of-truth)
-- FIXED: create trigger functions BEFORE creating triggers
-- ==========================================================

-- 1) Add roster tracking columns to alliance_memberships (safe)
alter table public.alliance_memberships
  add column if not exists managed_by_roster boolean not null default false,
  add column if not exists roster_player_id uuid null;

-- 2) SECURITY DEFINER sync function (bypasses RLS as table owner)
create or replace function public.sync_memberships_for_player(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id
  from public.player_auth_links
  where player_id = p_player_id;

  -- If not linked yet, nothing to sync
  if v_user_id is null then
    return;
  end if;

  -- Upsert roster assignments -> memberships
  insert into public.alliance_memberships (
    alliance_id,
    user_id,
    role,
    managed_by_roster,
    roster_player_id
  )
  select
    upper(btrim(pa.alliance_code)) as alliance_id,
    v_user_id as user_id,
    pa.role,
    true as managed_by_roster,
    p_player_id as roster_player_id
  from public.player_alliances pa
  where pa.player_id = p_player_id
  on conflict (alliance_id, user_id)
  do update set
    role = excluded.role,
    managed_by_roster = true,
    roster_player_id = excluded.roster_player_id;

  -- Remove roster-managed memberships that no longer exist in roster assignments
  delete from public.alliance_memberships m
  where m.user_id = v_user_id
    and m.managed_by_roster = true
    and m.roster_player_id = p_player_id
    and not exists (
      select 1
      from public.player_alliances pa
      where pa.player_id = p_player_id
        and upper(btrim(pa.alliance_code)) = upper(btrim(m.alliance_id))
    );
end;
$$;

-- 3) Cleanup function when unlinking a player
create or replace function public.purge_roster_memberships_for_player(p_player_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from public.alliance_memberships m
  where m.user_id = p_user_id
    and m.managed_by_roster = true
    and m.roster_player_id = p_player_id;
end;
$$;

-- 4) Trigger functions (MUST exist before triggers)

create or replace function public._player_alliances_sync_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  pid uuid;
begin
  pid := coalesce(new.player_id, old.player_id);
  perform public.sync_memberships_for_player(pid);
  return coalesce(new, old);
end;
$$;

create or replace function public._player_auth_links_sync_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if (tg_op = 'DELETE') then
    perform public.purge_roster_memberships_for_player(old.player_id, old.user_id);
    return old;
  end if;

  -- INSERT or UPDATE
  perform public.sync_memberships_for_player(new.player_id);
  return new;
end;
$$;

-- 5) Triggers: player_alliances changes -> sync
drop trigger if exists trg_player_alliances_sync_ins on public.player_alliances;
drop trigger if exists trg_player_alliances_sync_upd on public.player_alliances;
drop trigger if exists trg_player_alliances_sync_del on public.player_alliances;

create trigger trg_player_alliances_sync_ins
after insert on public.player_alliances
for each row execute function public._player_alliances_sync_trigger();

create trigger trg_player_alliances_sync_upd
after update on public.player_alliances
for each row execute function public._player_alliances_sync_trigger();

create trigger trg_player_alliances_sync_del
after delete on public.player_alliances
for each row execute function public._player_alliances_sync_trigger();

-- 6) Triggers: linking/unlinking auth -> sync/purge
drop trigger if exists trg_player_auth_links_sync_ins on public.player_auth_links;
drop trigger if exists trg_player_auth_links_sync_upd on public.player_auth_links;
drop trigger if exists trg_player_auth_links_sync_del on public.player_auth_links;

create trigger trg_player_auth_links_sync_ins
after insert on public.player_auth_links
for each row execute function public._player_auth_links_sync_trigger();

create trigger trg_player_auth_links_sync_upd
after update on public.player_auth_links
for each row execute function public._player_auth_links_sync_trigger();

create trigger trg_player_auth_links_sync_del
after delete on public.player_auth_links
for each row execute function public._player_auth_links_sync_trigger();
