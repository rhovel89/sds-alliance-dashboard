-- Allow one-time events: recurrence_type can be NULL
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'alliance_events'
      and column_name  = 'recurrence_type'
      and is_nullable  = 'NO'
  ) then
    alter table public.alliance_events
      alter column recurrence_type drop not null;
  end if;
end $$;
