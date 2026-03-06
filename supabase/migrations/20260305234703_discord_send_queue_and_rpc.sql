create table if not exists public.discord_send_queue (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  target text not null,
  channel_id text not null,
  content text not null,
  meta jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  locked_at timestamptz null,
  locked_by text null,
  sent_at timestamptz null,
  error text null,
  created_by uuid null,
  created_at timestamptz not null default now()
);

create index if not exists idx_discord_send_queue_status_created
  on public.discord_send_queue(status, created_at);

alter table public.discord_send_queue enable row level security;

create or replace function public.queue_discord_send(
  p_kind text,
  p_target text,
  p_channel_id text,
  p_content text,
  p_meta jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_ok boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select
    exists (select 1 from public.app_admins a where a.user_id = auth.uid())
    OR
    exists (
      select 1
      from public.player_auth_links pal
      join public.player_alliances pa on pa.player_id = pal.player_id
      where pal.user_id = auth.uid()
        and pa.role in ('owner','r5','r4')
    )
  into v_ok;

  if not coalesce(v_ok,false) then
    raise exception 'not authorized';
  end if;

  insert into public.discord_send_queue(kind, target, channel_id, content, meta, created_by)
  values (p_kind, p_target, p_channel_id, p_content, coalesce(p_meta, '{}'::jsonb), auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.queue_discord_send(text,text,text,text,jsonb) from public;
grant execute on function public.queue_discord_send(text,text,text,text,jsonb) to authenticated;
