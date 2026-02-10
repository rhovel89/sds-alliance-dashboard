import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAllianceRole } from "../hooks/useAllianceRole";

type HQCell = {
  id: string;
  hq_name: string;
  coord_x: number;
  coord_y: number;
  hq_map_slot: number;
};

const COLUMNS = 10;
const TOTAL_SLOTS = 100;

export default function HQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const role = useAllianceRole(alliance_id);
  const canEdit = role === "owner" || role === "R5" || role === "R4";

  const [cells, setCells] = useState<(HQCell | null)[]>(Array(TOTAL_SLOTS).fill(null));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!alliance_id) return;

    setLoading(true);
    supabase
      .from("player_hqs")
      .select("*")
      .eq("alliance_id", alliance_id)
      .then(({ data }) => {
        const next = Array(TOTAL_SLOTS).fill(null);
        data?.forEach((hq: HQCell) => {
          next[hq.hq_map_slot] = hq;
        });
        setCells(next);
        setLoading(false);
      });
  }, [alliance_id]);

  if (loading) {
    return <div className="hq-page">Loading HQ Map…</div>;
  }

  return (
    <div className="hq-page">
      <div
        className="hq-grid"
        style={{ gridTemplateColumns: `repeat(${COLUMNS}, 1fr)` }}
      >
        {cells.map((cell, i) => (
          <button
            key={i}
            disabled={!canEdit}
            className="hq-cell"
          >
            {cell ? cell.hq_name : "+"}
          </button>
        ))}
      </div>
    </div>
  );
}
