-- View: "my admin-awarded achievements" scoped by canonical current_player_id()
create or replace view public.my_state_player_achievements as
select spa.*
from public.state_player_achievements spa
where spa.player_id = public.current_player_id();

grant select on public.my_state_player_achievements to authenticated;
