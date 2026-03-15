import React from "react";
import { useNavigate } from "react-router-dom";

export function OwnerBroadcastModal() {
  const nav = useNavigate();

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button
        type="button"
        className="zombie-btn"
        title="Open live broadcast composer"
        onClick={() => nav("/owner/broadcast")}
        style={{ padding: "10px 12px" }}
      >
        📢 Broadcast
      </button>

      <button
        type="button"
        className="zombie-btn"
        title="Open Discord role/channel mappings"
        onClick={() => nav("/owner/discord-mentions")}
        style={{ padding: "10px 12px" }}
      >
        🔧 Mentions
      </button>
    </div>
  );
}

export default OwnerBroadcastModal;
