import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const OWNER_ID = "775966588200943616";

export default function OwnerDashboardSelect() {
  const navigate = useNavigate();
  const [alliances, setAlliances] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;

      if (!user || user.id !== OWNER_ID) {
        navigate("/", { replace: true });
        return;
      }

      const { data: rows } = await supabase
        .from("alliances")
        .select("code");

      setAlliances(rows?.map(a => a.code) || []);
    });
  }, [navigate]);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>🧟 Select Dashboard</h1>

      {alliances.map(code => (
        <button
          key={code}
          style={{ display: "block", margin: "1rem 0" }}
          onClick={() => navigate(`/dashboard/${code}`)}
        >
          {code}
        </button>
      ))}

      <button
        style={{ display: "block", marginTop: "2rem" }}
        onClick={() => navigate("/state/789")}
      >
        State Dashboard
      </button>
    </div>
  );
}
