import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAllianceRole } from "../hooks/useAllianceRole";

const COLUMNS = 10;
const TOTAL_CELLS = 100;

export default function HQMap() {
  const { allianceId } = useParams<{ allianceId: string }>();
  const role = useAllianceRole(allianceId);

  const canEdit = role === "owner" || role === "R5" || role === "R4";

  const [cells, setCells] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!allianceId) return;

    supabase
      .from("hq_cells")
      .select("*")
      .eq("alliance_id", allianceId)
      .then(({ data }) => {
        const map = Array(TOTAL_CELLS).fill(null);
        data?.forEach((c: any) => {
          map[c.cell_index] = c;
        });
        setCells(map);
        setLoading(false);
      });
  }, [allianceId]);

  const saveCell = async () => {
    if (selected === null || !allianceId) return;

    await supabase.from("hq_cells").upsert({
      alliance_id: allianceId,
      cell_index: selected,
      player_name: playerName
    });

    setPlayerName("");
    setSelected(null);
  };

  if (loading) return <div>Loading HQ Map…</div>;

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
            onClick={() => {
              setSelected(i);
              setPlayerName(cell?.player_name || "");
            }}
          >
            {cell?.player_name || "—"}
          </button>
        ))}
      </div>

      {canEdit && selected !== null && (
        <div className="hq-editor">
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Player name"
          />
          <button onClick={saveCell}>Save</button>
        </div>
      )}
    </div>
  );
}
