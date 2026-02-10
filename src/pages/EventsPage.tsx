import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import PlannerGrid from "../components/events/PlannerGrid";

export default function EventsPage() {
  const { allianceId } = useParams<{ allianceId: string }>();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!allianceId) return;

    supabase
      .from("alliance_events")
      .select("*")
      .eq("alliance_id", allianceId)
      .then(({ data }) => {
        setEvents(data || []);
        setLoading(false);
      });
  }, [allianceId]);

  if (loading) return <div>Loading events…</div>;

  return (
    <PlannerGrid
      events={events}
      alliance_id={allianceId}
      onEventsChanged={setEvents}
    />
  );
}
