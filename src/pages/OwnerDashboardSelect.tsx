import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const OWNER_ID = "775966588200943616";

export default function OwnerDashboardSelect() {
  const navigate = useNavigate();
  const [alliances, setAlliances] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user || data.user.id !== OWNER_ID) return;

      const { data: rows } = await supabase
        .from("alliances")
        .select("id, short_code")
        .order("short_code");

      setAlliances(rows || []);
    });
  }, []);

  return (
    <div className="zombie-card">
      <h2>🧟 Select Dashboard</h2>

      <button
        className="zombie-btn"
        onClick={() => navigate("/state/1")}
      >
        State 789 Dashboard
      </button>

      <div style={{ marginTop: 20 }}>
        {alliances.map(a => (
          <button
            key={a.id}
            className="zombie-btn"
            style={{ display: "block", marginTop: 10 }}
            onClick={() => navigate(`/dashboard/${a.short_code}`)}
          >
            {a.short_code} Alliance
          </button>
        ))}
      </div>
    </div>
  );
}
