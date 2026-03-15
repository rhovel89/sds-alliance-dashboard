import React from "react";
import { useNavigate } from "react-router-dom";

export function OwnerBroadcastModal() {
  const nav = useNavigate();

  return (
    <button
      type="button"
      className="zombie-btn"
      title="Open live broadcast composer"
      onClick={() => nav("/owner/broadcast")}
      style={{ padding: "10px 12px" }}
    >
      📢 Broadcast
    </button>
  );
}

export default OwnerBroadcastModal;
