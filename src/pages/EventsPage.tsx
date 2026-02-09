import { useParams } from "react-router-dom";

import { useEffect, useState } from "react";
import PlannerGrid from "../components/events/PlannerGrid";
import { useAlliance } from "../context/AllianceContext";
import { supabase } from "../lib/supabaseClient";
import { normalizeEvents } from "../components/events/normalizeEvents";
import "../styles/events-calendar.css";

export default function EventsPage() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  async function loadEvents() {
    if (!alliance_id) return;

    setLoadingEvents(true);

    const { data, error } = await supabase
      .from("alliance_events")
      .select("*")
      .eq("alliance_id", alliance_id)
      .order("start_time_utc", { ascending: true });

    if (error) {
      console.error("❌ Failed to load events:", error);
      setEvents([]);
    } else {
      setEvents(normalizeEvents(data ?? []));
    }

    setLoadingEvents(false);
  }

  useEffect(() => {
    loadEvents();
  }, [alliance_id]);

  if (loading || loadingEvents) {
    return <div className="events-page">Loading events…</div>;
  }

  return (
    <div className="events-page">
      <PlannerGrid
        events={events}
        alliance_id={ alliance_id }
        onEventsChanged={loadEvents}
      />
    </div>
  );
}

