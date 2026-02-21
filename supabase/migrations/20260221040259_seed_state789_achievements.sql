-- Seed State 789 achievements (idempotent)
-- Requires schema from prior migration:
-- public.state_achievement_types, public.state_achievement_options

with swp as (
  insert into public.state_achievement_types (state_code, name, kind, requires_option, required_count, active)
  values ('789', 'SWP Weapon', 'swp_weapon', true, 1, true)
  on conflict (state_code, name) do update
    set kind = excluded.kind,
        requires_option = excluded.requires_option,
        required_count = excluded.required_count,
        active = true
  returning id
)
insert into public.state_achievement_options (achievement_type_id, label, sort, active)
select swp.id, 'Rail Gun', 0, true
from swp
on conflict (achievement_type_id, label) do update
  set active = true, sort = excluded.sort;

insert into public.state_achievement_types (state_code, name, kind, requires_option, required_count, active)
values ('789', 'Governor Rotations', 'governor_count', false, 3, true)
on conflict (state_code, name) do update
  set kind = excluded.kind,
      requires_option = excluded.requires_option,
      required_count = excluded.required_count,
      active = true;