create or replace view public.v_discord_send_queue_flat as
select
  id,
  created_at,
  updated_at,
  status,
  status_detail,
  state_code,
  alliance_code,
  coalesce(payload->>'kind','') as kind,
  coalesce(payload->>'target','') as target,
  coalesce(payload->>'discord_channel_id', channel_name, '') as channel_id,
  left(coalesce(message, payload->>'message',''), 500) as message_preview,
  attempt_count,
  locked_at,
  sent_at,
  discord_message_id
from public.discord_send_queue;
