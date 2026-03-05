create or replace function public.current_player_id()
returns uuid
language sql
stable
as $$
  select coalesce(
    (select pal.player_id
       from public.player_auth_links pal
      where pal.user_id = auth.uid()
      order by pal.created_at asc
      limit 1),
    (select p.id
       from public.players p
      where p.auth_user_id = auth.uid()
      order by p.created_at asc
      limit 1)
  );
$$;

create or replace view public.my_player_alliances as
select pa.*
from public.player_alliances pa
where pa.player_id = public.current_player_id();

grant execute on function public.current_player_id() to authenticated;
grant select on public.my_player_alliances to authenticated;
