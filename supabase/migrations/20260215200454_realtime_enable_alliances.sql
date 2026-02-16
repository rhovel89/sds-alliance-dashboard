-- Enable realtime for public.alliances (best-effort; safe if already enabled)

do $$
declare
  pub_oid oid;
begin
  select oid into pub_oid from pg_publication where pubname = 'supabase_realtime';

  if pub_oid is null then
    -- nothing to do
    return;
  end if;

  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where pr.prpubid = pub_oid
      and n.nspname = 'public'
      and c.relname = 'alliances'
  ) then
    execute 'alter publication supabase_realtime add table public.alliances';
  end if;
exception when others then
  null;
end $$;
