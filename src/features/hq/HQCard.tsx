import { Link } from "react-router-dom";
import type { PlayerHQ } from "./usePlayerHQs";

export default function HQCard(props: { hq: PlayerHQ; allianceName?: string | null }) {
  const { hq, allianceName } = props;

  const title = allianceName ? \\ (\)\ : hq.allianceCode;

  const coord = (hq.playerX != null && hq.playerY != null)
    ? \(\, \)\
    : "—";

  const slot = (hq.slotNumber != null || (hq.slotX != null && hq.slotY != null))
    ? (hq.slotNumber != null ? \Slot #\\ : \Slot (\, \)\)
    : null;

  return (
    <div style={{
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 14,
      padding: 12,
      background: "rgba(0,0,0,0.18)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 14 }}>{title}</div>
          <div style={{ opacity: 0.8, fontSize: 12, marginTop: 2 }}>
            HQ: <b>{hq.label || "Unnamed HQ"}</b>
          </div>
        </div>
        <div style={{ opacity: 0.7, fontSize: 12 }}>
          {hq.source === "alliance_hq_map" ? "Map Slot" : "Position"}
        </div>
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 13 }}>
        <div style={{ opacity: 0.9 }}>
          Player Coords: <b>{coord}</b>
        </div>
        {slot ? (
          <div style={{ opacity: 0.8 }}>
            {slot}
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link to={\/dashboard/\/hq-map\}
          style={{ opacity: 0.9, textDecoration: "none", border: "1px solid rgba(255,255,255,0.14)", padding: "6px 10px", borderRadius: 10 }}>
          View HQ Map
        </Link>
        <Link to={\/dashboard/\/calendar\}
          style={{ opacity: 0.9, textDecoration: "none", border: "1px solid rgba(255,255,255,0.14)", padding: "6px 10px", borderRadius: 10 }}>
          View Daily Events
        </Link>
      </div>
    </div>
  );
}
