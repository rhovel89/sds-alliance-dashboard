create or replace function run_event_template(template_id uuid)
returns void
language plpgsql
security definer
as src/sql
declare
  tpl record;
  run_date date := current_date;
begin
  select * into tpl
  from alliance_event_templates
  where id = template_id;

  if tpl.id is null then
    raise exception 'Template not found';
  end if;

  insert into alliance_events (
    id,
    alliance_id,
    title,
    description,
    start_date,
    start_time,
    end_time,
    created_by
  ) values (
    gen_random_uuid(),
    tpl.alliance_id,
    tpl.title,
    tpl.description,
    run_date,
    tpl.start_time_utc,
    tpl.start_time_utc + make_interval(mins => tpl.duration_minutes),
    auth.uid()
  );

  insert into alliance_event_template_runs (
    template_id,
    run_at
  ) values (
    template_id,
    now()
  );
end;
src/sql;
