import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useParams } from "react-router-dom";

const COLS = 20;
const ROWS = 6;
const CELL_SIZE = 70;

const COLORS: Record<string, string> = {
  PLAYER_HQ: "#222",
  ALLIANCE_HQ: "#4b0000",
  WATCH_TOWER: "#003366",
  BANNER: "#664400",
  FORT: "#333333",
  CUSTOM: "#552266",
};

export default function PublicHQMap() {
  const { alliance } = useParams();
  const [cells, setCells] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("hq_map")
      .select("*")
      .eq("alliance_id", alliance)
      .order("order_index", { ascending: true })
      .then(({ data }) => setCells(data ?? []));
  }, [alliance]);

  return (
    <div className='page' style={{ width: "100%", minHeight: "100vh", padding: 24 }}>
      <h1 style={{ color: "white" }}>{alliance} HQ Map</h1>

      <div className='page'
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
          gap: 6,
          margin: "20px auto",
          width: "max-content",
        }}
      >
        {Array.from({ length: COLS * ROWS }).map((_, idx) => {
          const cell = cells[idx];
          return (
            <div className='page'
              key={idx}
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                background: COLORS[cell?.building_type] ?? "#111",
                border: "1px solid #333",
                color: "#eee",
                fontSize: 11,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              {cell ? (
                <div className='page'>
                  <strong>{cell.label || cell.player_name}</strong>
                  <div className='page' style={{ opacity: 0.7 }}>
                    {cell.building_type.replace("_", " ")}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

