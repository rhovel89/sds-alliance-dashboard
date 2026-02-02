import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AchievementAdmin() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("user_achievements")
      .select("*, achievements(title)")
      .eq("status", "pending")
      .then(r => setRows(r.data || []));
  }, []);

  async function advance(id: string, progress: number) {
    await supabase
      .from("user_achievements")
      .update({ progress, status: progress >= 100 ? "completed" : "approved" })
      .eq("id", id);
  }

  return (
    <div className='page' style={{ padding: 32 }}>
      <h2>Achievement Reviews</h2>

      {rows.map(r => (
        <div className='page' key={r.id}>
          {r.achievements.title} — Progress {r.progress}/{r.goal}
          <button onClick={() => advance(r.id, r.progress + 10)}>+10</button>
        </div>
      ))}
    </div>
  );
}

