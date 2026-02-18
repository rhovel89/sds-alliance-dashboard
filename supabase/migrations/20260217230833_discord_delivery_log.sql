-- SAFE: Discord delivery log table for reminder reliability/debugging.
-- Insert expected from server-side (service role/edge function). Clients should not write.
-- Admin can read if is_app_admin exists.

create extension if not exists pgcrypto;

create table if not exists public.discord_delivery_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  scope text not null,                 -- e.g. 'calendar_reminder'
  alliance_code text null,             -- alliance code like 'OZ'
  event_id uuid null,
  webhook_url text null,
  status text not null,                -- 'success' | 'error'
  http_status integer null,
  error text null,
  payload jsonb null
);

create index if not exists discord_delivery_log_created_at_idx
  on public.discord_delivery_log(created_at desc);

create index if not exists discord_delivery_log_alliance_created_idx
  on public.discord_delivery_log(alliance_code, created_at desc);

alter table public.discord_delivery_log enable row level security;

do $$
begin
  if to_regprocedure('public.is_app_admin(uuid)') is not null then
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='discord_delivery_log' and policyname='ddl_select_admin'
    ) then
      execute $p$
        create policy ddl_select_admin
        on public.discord_delivery_log
        for select
        using (public.is_app_admin(auth.uid()))
      $p$;
    end if;
  end if;
end $$;
