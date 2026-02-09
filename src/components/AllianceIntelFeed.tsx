import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AllianceIntelFeed({ allianceId }: { allianceId: string }) {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("alliance_activity_log")
      .select("action_label, action_type, created_at")
      .eq("alliance_id", allianceId)
      .order("created_at", { ascending: false })
      .limit(25)
      .then(({ data }) => setItems(data ?? []));
  }, [allianceId]);

  return (
    <div className="command-card">
      <h3>🧠 Alliance Intel</h3>
      <ul style={{ fontSize: "0.85rem", paddingLeft: "1rem" }}>
        {items.map((i, idx) => (
          <li key={idx}>
            <strong>{i.action_label}</strong>
            <br />
            <span style={{ opacity: 0.7 }}>
              {new Date(i.created_at).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
