create extension if not exists pgcrypto;

create or replace function public.queue_discord_webhook_send(
  p_state_code text,
  p_alliance_code text,
  p_webhook_id text,
  p_content text,
  p_payload_kind text default 'achievements',
  p_meta jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id uuid := gen_random_uuid();
  v_sc text := coalesce(nullif(p_state_code,''), '789');
  v_ac text := nullif(upper(coalesce(p_alliance_code,'')), '');
  v_wh text := nullif(btrim(coalesce(p_webhook_id,'')), '');
  v_msg text := left(coalesce(p_content,''), 1900);
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if v_ac is null then
    raise exception 'alliance_code is required';
  end if;

  if v_wh is null then
    raise exception 'webhook_id is required';
  end if;

  if v_msg = '' then
    raise exception 'content is required';
  end if;

  -- Uses your existing permissions gate
  if not public.can_manage_alliance_discord_settings(v_ac) then
    raise exception 'Not allowed for alliance %', v_ac;
  end if;

  -- IMPORTANT: matches your existing discord_send_queue schema (channel_name/message/payload)
  insert into public.discord_send_queue
    (id, created_by, state_code, alliance_code, channel_name, message, payload, status, send_at)
  values
    (
      v_id,
      auth.uid(),
      v_sc,
      v_ac,
      v_wh,
      v_msg,
      jsonb_build_object(
        'kind','discord_webhook',
        'state_code',v_sc,
        'alliance_code',v_ac,
        'webhook_id',v_wh,
        'payload_kind',lower(coalesce(p_payload_kind,'achievements')),
        'meta',coalesce(p_meta,'{}'::jsonb)
      ),
      'queued',
      now()
    );

  return v_id;
end;
$$;
