import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Alliance = {
  id: string;
  name: string;
};

type HQCell = {
  slot_index: number;
  name: string;
  coords: string;
};

export default function StateHQOverview() {
  const [alliances, setAlliances] = useState<Alliance[]>([]);
  const [hqData, setHqData] = useState<Record<string, HQCell[]>>({});

  useEffect(() => {
    async function load() {
      const { data: allianceList } = await supabase
        .from("alliances")
        .select("id, name")
        .order("name");

      if (!allianceList) return;
      setAlliances(allianceList);

      const map: Record<string, HQCell[]> = {};

      for (const a of allianceList) {
        const { data } = await supabase
          .from("hq_map")
          .select("slot_index, name, coords")
          .eq("alliance_id", a.id)
          .order("slot_index");

        map[a.id] = data || [];
      }

      setHqData(map);
    }

    load();
  }, []);

  return (
    <div className='page' style={{
      width: "100vw",
      minHeight: "100vh",
      background: "#080808",
      padding: 24,
      color: "#7cff00"
    }}>
      <h1>State 789 — HQ Overview</h1>

      {alliances.map(alliance => (
        <div className='page' key={alliance.id} style={{ marginTop: 40 }}>
          <h2>{alliance.name}</h2>

          <div className='page' style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 60px)",
            gap: 6,
            marginTop: 12
          }}>
            {Array.from({ length: 120 }).map((_, i) => {
              const cell = hqData[alliance.id]?.find(
                c => c.slot_index === i
              );

              return (
                <div className='page'
                  key={i}
                  style={{
                    width: 60,
                    height: 60,
                    background: "#1a1a1a",
                    border: "1px solid #333",
                    fontSize: 9,
                    textAlign: "center",
                    padding: 4,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center"
                  }}
                >
                  <strong>{cell?.name || ""}</strong>
                  <span>{cell?.coords || ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

