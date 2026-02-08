import { useEffect, useState } from "react";
import PlannerGrid from "../components/events/PlannerGrid";
import { useAlliance } from "../context/AllianceContext";
import { supabase } from "../lib/supabaseClient";
import { normalizeEvents } from "../components/events/normalizeEvents";

export default function EventsPage() {
  const { allianceId } = useAlliance();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadEvents() {
    if (!allianceId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("alliance_events")
      .select("*")
      .eq("alliance_id", allianceId)
      .order("start_time_utc", { ascending: true });

    if (error) {
      console.error("❌ Failed to load events", error);
      setEvents([]);
    } else {
      setEvents(normalizeEvents(data || []));
    }

    setLoading(false);
  }

  useEffect(() => {
    loadEvents();
  }, [allianceId]);

  if (loading) {
    return <div style={{ padding: 20 }}>Loading events…</div>;
  }

  return (
    <PlannerGrid
      events={events}
      allianceId={allianceId}
      onEventsChanged={loadEvents}
    />
  );
}
