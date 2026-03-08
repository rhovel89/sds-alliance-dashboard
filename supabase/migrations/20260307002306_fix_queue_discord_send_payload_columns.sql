create extension if not exists pgcrypto;

-- Fix the overload:
--   queue_discord_send(p_kind text, p_target text, p_channel_id text, p_content text, p_meta jsonb)
-- to match the REAL discord_send_queue schema (channel_name/message/payload/etc)

create or replace function public.queue_discord_send(
  p_kind text,
  p_target text,
  p_channel_id text,
  p_content text,
  p_meta jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id uuid := gen_random_uuid();
  v_sc text := coalesce(nullif((coalesce(p_meta,'{}'::jsonb)->>'state_code')::text,''), '789');
  v_ac text := nullif(upper(coalesce((coalesce(p_meta,'{}'::jsonb)->>'alliance_code')::text,'')), '');
  v_chan text := nullif(btrim(coalesce(p_channel_id,'')), '');
  v_msg text := left(coalesce(p_content,''), 1900);
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if v_chan is null then
    raise exception 'channel_id is required';
  end if;

  -- best-effort: infer alliance_code from target like "alliance:WOC"
  if v_ac is null and coalesce(p_target,'') like 'alliance:%' then
    v_ac := upper(split_part(coalesce(p_target,''), ':', 2));
    v_ac := nullif(v_ac,'');
  end if;

  insert into public.discord_send_queue
    (id, created_by, state_code, alliance_code, channel_name, message, payload, status, send_at)
  values
    (
      v_id,
      auth.uid(),
      v_sc,
      v_ac,
      v_chan,
      v_msg,
      jsonb_build_object(
        'kind', coalesce(p_kind,''),
        'target', coalesce(p_target,''),
        'channel_id', v_chan,
        'meta', coalesce(p_meta,'{}'::jsonb)
      ),
      'queued',
      now()
    );

  return v_id;
end;
$$;

-- Add a COMPAT wrapper for clients that call with this named-args set:
-- (p_channel_id, p_content, p_kind, p_meta, p_target)
create or replace function public.queue_discord_send(
  p_channel_id text,
  p_content text,
  p_kind text,
  p_meta jsonb,
  p_target text
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  return public.queue_discord_send(
    p_kind   => p_kind,
    p_target => p_target,
    p_channel_id => p_channel_id,
    p_content => p_content,
    p_meta   => coalesce(p_meta,'{}'::jsonb)
  );
end;
$$;
