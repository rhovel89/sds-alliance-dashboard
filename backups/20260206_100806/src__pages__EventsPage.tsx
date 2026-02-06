import { useEffect, useState } from "react";
import PlannerGrid from "../components/events/PlannerGrid";
import { supabase } from "../lib/supabaseClient";
import { useAlliance } from "../context/AllianceContext";

export default function EventsPage() {
  const { allianceId, loading } = useAlliance();
  const [events, setEvents] = useState<any[]>([]);

  async function loadEvents() {
    if (!allianceId) return;

    const { data } = await supabase
      .from("alliance_events")
      .select("*")
      .eq("alliance_id", allianceId);

    setEvents(data || []);
  }

  useEffect(() => {
    loadEvents();
    window.addEventListener("events-updated", loadEvents);
    return () => window.removeEventListener("events-updated", loadEvents);
  }, [allianceId]);

  if (loading) return <div>Loading…</div>;

  return <PlannerGrid events={events} />;
}

