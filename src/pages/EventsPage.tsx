import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import PlannerGrid from "../components/events/PlannerGrid";

export default function EventsPage() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!alliance_id) return;

    setLoading(true);
    supabase
      .from("alliance_events")
      .select("*")
      .eq("alliance_id", alliance_id)
      .order("date", { ascending: true })
      .then(({ data }) => {
        setEvents(data || []);
        setLoading(false);
      });
  }, [alliance_id]);

  if (loading) {
    return <div className="events-page">Loading events…</div>;
  }

  return (
    <div className="events-page">
      <PlannerGrid events={events} alliance_id={alliance_id} />
    </div>
  );
}
