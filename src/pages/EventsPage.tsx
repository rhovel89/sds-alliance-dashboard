import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAlliance } from '../context/AllianceContext';
import PlannerGrid from '../components/events/PlannerGrid';
import { normalizeEvents } from '../components/events/normalizeEvents';

export default function EventsPage() {
  const { allianceId, loading } = useAlliance();
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    if (!allianceId) return;

    async function loadEvents() {
      setLoadingEvents(true);

      const { data, error } = await supabase
        .from('alliance_events')
        .select('*')
        .eq('alliance_id', allianceId);

      if (!error && data) {
        setEvents(normalizeEvents(data));
      }

      setLoadingEvents(false);
    }

    loadEvents();
  }, [allianceId]);

  if (loading || loadingEvents) {
    return <div style={{ padding: 20 }}>Loading events…</div>;
  }

  if (!allianceId) {
    return <div style={{ padding: 20 }}>No alliance selected</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <PlannerGrid events={events} timezone="local" />
    </div>
  );
}
