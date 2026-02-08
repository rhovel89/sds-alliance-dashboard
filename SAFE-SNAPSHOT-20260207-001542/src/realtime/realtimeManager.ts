import { supabase } from '../lib/supabaseClient';

type ChannelRef = ReturnType<typeof supabase.channel>;

let channels: ChannelRef[] = [];

export function startRealtime() {
  if (channels.length > 0) return;

  // Messages
  channels.push(
    supabase
      .channel('realtime:messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        payload => {
          console.log('[realtime] messages change', payload);
        }
      )
      .subscribe()
  );

  // Events
  channels.push(
    supabase
      .channel('realtime:events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        payload => {
          console.log('[realtime] events change', payload);
        }
      )
      .subscribe()
  );

  // Permissions
  channels.push(
    supabase
      .channel('realtime:permissions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_permissions' },
        payload => {
          console.log('[realtime] permissions change', payload);
        }
      )
      .subscribe()
  );

  console.log('[realtime] started');
}

export function stopRealtime() {
  channels.forEach(ch => supabase.removeChannel(ch));
  channels = [];
  console.log('[realtime] stopped');
}
