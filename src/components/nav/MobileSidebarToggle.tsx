import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

function setOpen(open: boolean) {
  const root = document.documentElement;
  if (open) root.classList.add("sad-nav-open");
  else root.classList.remove("sad-nav-open");
}

export default function MobileSidebarToggle() {
  const location = useLocation();
  const [open, setOpenState] = useState(false);

  const enabled = useMemo(() => {
    // Show toggle only where sidebar layout exists (alliance dashboards).
    // You can add "/owner" later if you want.
    return location.pathname.startsWith("/dashboard/");
  }, [location.pathname]);

  // Close the drawer on route change
  useEffect(() => {
    if (!enabled) return;
    setOpenState(false);
    setOpen(false);
  }, [location.pathname, enabled]);

  // Keep html class in sync + prevent background scroll when open
  useEffect(() => {
    if (!enabled) return;

    setOpen(open);
    const prevOverflow = document.body.style.overflow;

    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = prevOverflow || "";

    return () => {
      document.body.style.overflow = prevOverflow || "";
      setOpen(false);
    };
  }, [open, enabled]);

  // ESC closes
  useEffect(() => {
    if (!enabled) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenState(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        className="sad-mobile-nav-toggle"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpenState((v) => !v)}
      >
        {open ? "✕" : "☰"}
      </button>

      {open ? (
        <div
          className="sad-mobile-scrim"
          role="button"
          aria-label="Close menu"
          tabIndex={0}
          onClick={() => setOpenState(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setOpenState(false);
          }}
        />
      ) : null}
    </>
  );
}
