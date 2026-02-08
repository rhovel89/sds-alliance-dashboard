import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import "../../styles/hq-map.css";

type HQCell = {
  name: string;
  coords: string;
};

const COLUMNS = 13;
const DEFAULT_SLOTS = 120;

export default function PublicHQMap() {
  const [cells, setCells] = useState<Record<number, HQCell>>({});
  const indices = useMemo(
    () => Array.from({ length: DEFAULT_SLOTS }, (_, i) => i),
    []
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("hq_slots")
        .select("*");

      if (!data) return;

      const map: Record<number, HQCell> = {};
      data.forEach((r) => {
        map[r.slot_index] = {
          name: r.player_name ?? "",
          coords: r.coords ?? ""
        };
      });

      setCells(map);
    })();
  }, []);

  return (
    <div className="hq-map-wrapper read-only">
      <div
        className="hq-map-grid"
        style={{ gridTemplateColumns: `repeat(${COLUMNS}, 1fr)` }}
      >
        {indices.map((i) => (
          <div key={i} className="hq-cell read-only">
            <div className="hq-title">HQ {i + 1}</div>
            <div className="hq-name">{cells[i]?.name || "—"}</div>
            <div className="hq-coords">{cells[i]?.coords || "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
