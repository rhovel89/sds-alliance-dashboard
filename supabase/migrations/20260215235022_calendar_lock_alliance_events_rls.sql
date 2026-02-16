-- Calendar Lock (DB/RLS)
-- Goal: Only Owner/App Admin can INSERT/UPDATE/DELETE alliance_events.
-- Authenticated users can SELECT (view calendar).
-- Uses public.is_app_admin(auth.uid()) (must already exist in your DB).

do $$
begin
  -- enable RLS (safe)
  begin
    execute 'alter table public.alliance_events enable row level security';
  exception when others then
    -- ignore if table missing or already enabled, etc.
    null;
  end;

  -- drop old policies if they exist (safe)
  begin execute 'drop policy if exists alliance_events_select on public.alliance_events'; exception when others then null; end;
  begin execute 'drop policy if exists alliance_events_admin_insert on public.alliance_events'; exception when others then null; end;
  begin execute 'drop policy if exists alliance_events_admin_update on public.alliance_events'; exception when others then null; end;
  begin execute 'drop policy if exists alliance_events_admin_delete on public.alliance_events'; exception when others then null; end;

  -- VIEW: authenticated can read
  execute $p$
    create policy alliance_events_select
    on public.alliance_events
    for select
    to authenticated
    using (true)
  $p$;

  -- WRITE: only app admin (Owner)
  execute $p$
    create policy alliance_events_admin_insert
    on public.alliance_events
    for insert
    to authenticated
    with check (public.is_app_admin(auth.uid()))
  $p$;

  execute $p$
    create policy alliance_events_admin_update
    on public.alliance_events
    for update
    to authenticated
    using (public.is_app_admin(auth.uid()))
    with check (public.is_app_admin(auth.uid()))
  $p$;

  execute $p$
    create policy alliance_events_admin_delete
    on public.alliance_events
    for delete
    to authenticated
    using (public.is_app_admin(auth.uid()))
  $p$;

  -- optional: best-effort schema cache refresh for PostgREST
  begin
    perform pg_notify('pgrst', 'reload schema');
  exception when others then null;
  end;

end $$;
