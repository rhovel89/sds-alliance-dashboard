import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PlannerGrid from "../components/events/PlannerGrid";
import { supabase } from "../lib/supabaseClient";

export default function EventsPage() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!alliance_id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    supabase
      .from("alliance_events")
      .select("*")
      .eq("alliance_id", alliance_id)
      .order("date", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to load events:", error);
          setEvents([]);
        } else {
          setEvents((data || []).filter(e => e.date));
        }
        setLoading(false);
      });
  }, [alliance_id]);

  if (loading) {
    return <div className="events-page">Loading events…</div>;
  }

  return (
    <div className="events-page">
      <PlannerGrid
        events={events}
        alliance_id={alliance_id}
        onEventsChanged={setEvents}
      />
    </div>
  );
}