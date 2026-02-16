import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function EventModal({ alliance_id, date, onClose, onSaved }: any) {
  const [title, setTitle] = useState("");

  async function save() {
    await supabase.from("alliance_events").insert({
      alliance_id,
      title,
      date
    });
    onSaved();
    onClose();
  }

  return (
    <div className="modal">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" />
      <button onClick={save}>Save</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
}
