import React, { useState } from "react";
import { OwnerBroadcastModal } from "./OwnerBroadcastModal";

export function OwnerBroadcastButton() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginTop: 12 }}>
      <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => setOpen(true)}>
        📣 Open Owner Broadcast
      </button>
      <OwnerBroadcastModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

export default OwnerBroadcastButton;