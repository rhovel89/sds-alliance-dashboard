import { useEffect, useState } from "react";
import PlannerGrid from "../components/events/PlannerGrid";
import { useAlliance } from "../context/AllianceContext";
import { supabase } from "../lib/supabaseClient";

export default function EventsPage() {
  const { allianceId, loading } = useAlliance();
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    if (!allianceId) return;

    async function loadEvents() {
      setLoadingEvents(true);

      const { data, error } = await supabase
        .from("alliance_events")
        .select("*")
        .eq("alliance_id", allianceId);

      if (!error) setEvents(data || []);
      else console.error(error);

      setLoadingEvents(false);
    }

    loadEvents();
  }, [allianceId]);

  if (loading || loadingEvents) {
    return <div style={{ padding: 20 }}>Loading events…</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <PlannerGrid events={events} timezone="local" />
    </div>
  );
}
