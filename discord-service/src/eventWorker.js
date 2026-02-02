import { supabase } from './supabaseServer.js';
import { discord } from './discordClient.js';

const REMINDERS = [
  { label: '1h', minutes: 60 },
  { label: '30m', minutes: 30 },
  { label: '5m', minutes: 5 }
];

export function startEventWorker() {
  console.log('[worker] Event reminder worker started');
  setInterval(checkEvents, 60000);
}

async function checkEvents() {
  const now = new Date();

  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, start_time, alliance_id')
    .gt('start_time', now.toISOString());

  if (error || !events) return;

  for (const event of events) {
    for (const r of REMINDERS) {
      const remindAt = new Date(event.start_time);
      remindAt.setMinutes(remindAt.getMinutes() - r.minutes);

      if (Math.abs(remindAt - now) < 60000) {
        await sendReminder(event, r.label);
      }
    }
  }
}

async function sendReminder(event, type) {
  const { data: sent } = await supabase
    .from('event_reminders')
    .select('id')
    .eq('event_id', event.id)
    .eq('reminder_type', type)
    .maybeSingle();

  if (sent) return;

  const channelId = await resolveChannel(event.alliance_id);
  if (!channelId) return;

  const channel = await discord.channels.fetch(channelId);
  if (!channel) return;

  const message =
    'Reminder: ' +
    event.title +
    ' starts in ' +
    type;

  await channel.send(message);

  await supabase.from('event_reminders').insert({
    event_id: event.id,
    reminder_type: type
  });
}

async function resolveChannel(allianceId) {
  if (!allianceId) return null;

  const { data } = await supabase
    .from('alliances')
    .select('discord_channel_id')
    .eq('id', allianceId)
    .single();

  return data && data.discord_channel_id
    ? data.discord_channel_id
    : null;
}
