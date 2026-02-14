import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type AllianceEvent = {
  id: string;
  alliance_id: string;
  title: string;
  event_type: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
};

export default function AllianceCalendarPage() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = (alliance_id || "").toUpperCase();

  const [events, setEvents] = useState<AllianceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!upperAlliance) return;

    const loadEvents = async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("alliance_events")
        .select("*")
        .eq("alliance_id", upperAlliance)
        .order("start_date", { ascending: true });

      if (error) {
        console.error("CALENDAR LOAD ERROR:", error);
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      setEvents(data || []);
      setLoading(false);
    };

    loadEvents();
  }, [upperAlliance]);

  return (
    <div style={{ padding: 24, color: "#b6ff9e" }}>
      <h1 style={{ marginBottom: 12 }}>
        📅 Alliance Calendar — {upperAlliance}
      </h1>

      {loading && <div>Loading events...</div>}
      {errorMsg && <div style={{ color: "red" }}>{errorMsg}</div>}

      {!loading && events.length === 0 && (
        <div style={{ opacity: 0.6 }}>
          No events yet for this alliance.
        </div>
      )}

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {events.map((event) => (
          <div
            key={event.id}
            style={{
              padding: 16,
              borderRadius: 12,
              background: "rgba(0,0,0,0.45)",
              border: "1px solid rgba(0,255,0,0.25)",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {event.title}
            </div>

            <div style={{ opacity: 0.8, marginTop: 6 }}>
              {event.start_date} → {event.end_date}
            </div>

            {event.start_time && (
              <div style={{ opacity: 0.7 }}>
                {event.start_time} – {event.end_time}
              </div>
            )}

            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.6 }}>
              Type: {event.event_type}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
