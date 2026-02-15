-- Allow status='denied' by rebuilding the check constraint from existing live values.
-- Works if status is text OR enum.

do $$
declare
  v_vals text[] := '{}'::text[];
  v_sql  text;
  v_typid oid;
begin
  -- Collect existing status values currently in the table
  select coalesce(
    array_agg(distinct btrim(status::text)) filter (where status is not null and btrim(status::text) <> ''),
    '{}'::text[]
  )
  into v_vals
  from public.access_requests;

  -- Ensure 'denied' is included
  if not ('denied' = any(v_vals)) then
    v_vals := array_append(v_vals, 'denied');
  end if;

  -- Fallback if table empty / no statuses
  if array_length(v_vals, 1) is null then
    v_vals := array['pending','approved','denied'];
  end if;

  -- If status is an enum type, ensure enum label 'denied' exists
  select a.atttypid
  into v_typid
  from pg_attribute a
  where a.attrelid = 'public.access_requests'::regclass
    and a.attname = 'status'
    and a.attnum > 0
    and not a.attisdropped;

  if exists (select 1 from pg_type t where t.oid = v_typid and t.typtype = 'e') then
    begin
      execute format('alter type %s add value if not exists %L', v_typid::regtype, 'denied');
    exception when duplicate_object then
      null;
    end;
  end if;

  -- Drop + recreate constraint
  execute 'alter table public.access_requests drop constraint if exists access_requests_status_check';

  v_sql :=
    'alter table public.access_requests add constraint access_requests_status_check check (status in (' ||
    (select string_agg(quote_literal(x), ',') from unnest(v_vals) as x) ||
    '))';

  execute v_sql;
end $$;

-- Refresh PostgREST schema cache (helps Supabase API see changes faster)
notify pgrst, 'reload schema';
