import React, { useEffect } from "react";

export function ActionDrawer(props: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { open, title, onClose, children } = props;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="cc-drawerOverlay" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="cc-drawer" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cc-drawerHeader">
          <div className="cc-drawerTitle">{title || "ACTION"}</div>
          <button type="button" className="cc-drawerClose" onClick={onClose}>✕</button>
        </div>
        <div className="cc-drawerBody">{children}</div>
      </div>
    </div>
  );
}

export default ActionDrawer;
