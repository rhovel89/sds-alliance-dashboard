import React from "react";
import { useNavigate } from "react-router-dom";

export function OwnerBroadcastButton() {
  const nav = useNavigate();

  return (
    <button
      type="button"
      className="zombie-btn"
      onClick={() => nav("/owner/broadcast")}
      style={{ padding: "10px 12px" }}
    >
      📣 Open Owner Broadcast
    </button>
  );
}

export default OwnerBroadcastButton;
