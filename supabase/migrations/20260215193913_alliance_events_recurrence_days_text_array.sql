-- Fix: UI sends days like "Sun","Mon"... but DB expects integer.
-- Make recurrence_days a text[] so inserts succeed without touching the calendar UI.

do $$
begin
  -- If recurrence_days is currently an int[] / smallint[] array, convert it to text[]
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='alliance_events'
      and column_name='recurrence_days'
      and data_type='ARRAY'
      and udt_name in ('_int4','_int2')
  ) then
    alter table public.alliance_events
      alter column recurrence_days type text[]
      using case
        when recurrence_days is null then null
        else array(select unnest(recurrence_days)::text)
      end;
  end if;

  -- If recurrence_days is a single integer column for some reason, convert to text[]
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='alliance_events'
      and column_name='recurrence_days'
      and data_type='integer'
  ) then
    alter table public.alliance_events
      alter column recurrence_days type text[]
      using case
        when recurrence_days is null then null
        else array[recurrence_days::text]
      end;
  end if;
end $$;
