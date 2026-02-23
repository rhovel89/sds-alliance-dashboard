-- Fix: UI sends days like "Sun","Mon"... but DB expects integer.
-- Convert recurrence_days to text[] safely (no subqueries in USING).

do $$
declare
  v_data_type text;
  v_udt_name  text;
begin
  select data_type, udt_name
    into v_data_type, v_udt_name
  from information_schema.columns
  where table_schema='public'
    and table_name='alliance_events'
    and column_name='recurrence_days';

  -- If it's an integer array (int2/int4/int8), cast to text[]
  if v_data_type = 'ARRAY' and v_udt_name in ('_int2','_int4','_int8') then
    alter table public.alliance_events
      alter column recurrence_days type text[]
      using recurrence_days::text[];
  end if;

  -- If it's a scalar integer, convert to text[] (single-element)
  if v_data_type in ('smallint','integer','bigint') then
    alter table public.alliance_events
      alter column recurrence_days type text[]
      using case
        when recurrence_days is null then null
        else array[recurrence_days::text]
      end;
  end if;
end $$;
