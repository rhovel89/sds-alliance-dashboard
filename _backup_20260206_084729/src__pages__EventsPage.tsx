import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAlliance } from "../context/AllianceContext";
import PlannerGrid from "../components/events/PlannerGrid";
import "../components/events/events.css";

export default function EventsPage() {
  const { allianceId, loading: loadingAlliance } = useAlliance();

  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    if (!allianceId) return;

    let cancelled = false;

    async function loadEvents() {
      setLoadingEvents(true);

      const { data, error } = await supabase
        .from("alliance_events")
        .select("*")
        .eq("alliance_id", String(allianceId))
        .order("start_time_utc", { ascending: true });

      if (!cancelled) {
        if (error) {
          console.error("❌ Failed to load events:", error);
          setEvents([]);
        } else {
          setEvents(data || []);
        }
        setLoadingEvents(false);
      }
    }

    loadEvents();
    return () => {
      cancelled = true;
    };
  }, [allianceId]);

  if (loadingAlliance || loadingEvents) {
    return <div style={{ padding: 20 }}>Loading events…</div>;
  }

  if (!allianceId) {
    return <div style={{ padding: 20 }}>No alliance selected</div>;
  }

  return (
    <div className="events-page">
      <div className="events-toolbar">
        <h2>Events</h2>
        <div className="events-sub">Alliance: {String(allianceId).slice(0, 8)}…</div>
      </div>

      <PlannerGrid events={events} />
    </div>
  );
}
