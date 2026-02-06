import { supabase } from "../../lib/supabaseClient";
import { useAlliance } from "../../context/AllianceContext";
import EventModal from "./EventModal";
import { useState, useEffect } from "react";

export default function PlannerGrid() {
  const { allianceId } = useAlliance();
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  async function loadEvents() {
    const { data } = await supabase
      .from("alliance_events")
      .select("*")
      .eq("alliance_id", allianceId);

    setEvents(data || []);
  }

  useEffect(() => {
    if (allianceId) loadEvents();
  }, [allianceId]);

  async function handleSave(event) {
    const startUtc = new Date(`${event.date}T${event.startTime}:00`).toISOString();
    const endUtc = new Date(`${event.date}T${event.endTime}:00`).toISOString();

    await supabase.from("alliance_events").insert({
      title: event.title,
      alliance_id: allianceId,
      start_time_utc: startUtc,
      duration_minutes: 60,
      recurrence_type: event.recurrence_type,
      created_by: (await supabase.auth.getUser()).data.user.id
    });

    setSelectedDate(null);
    loadEvents();
  }

  return (
    <div className="calendar">
      {events.map(e => (
        <div key={e.id}>{e.title}</div>
      ))}

      {selectedDate && (
        <EventModal
          date={selectedDate}
          onSave={handleSave}
          onCancel={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}
