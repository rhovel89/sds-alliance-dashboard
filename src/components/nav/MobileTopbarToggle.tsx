import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

function setOpen(open: boolean) {
  const root = document.documentElement;
  if (open) root.classList.add("sad-topbar-open");
  else root.classList.remove("sad-topbar-open");
}

export default function MobileTopbarToggle() {
  const location = useLocation();
  const [open, setOpenState] = useState(false);
  const [enabled, setEnabled] = useState(false);

  // Enable only when a topbar exists on the page
  useEffect(() => {
    const hasTopbar = !!document.querySelector('[data-sad-topbar="1"]');
    setEnabled(hasTopbar);

    if (!hasTopbar) {
      setOpenState(false);
      setOpen(false);
      document.body.style.overflow = "";
    }
  }, [location.pathname]);

  // Close on route change
  useEffect(() => {
    if (!enabled) return;
    setOpenState(false);
    setOpen(false);
  }, [location.pathname, enabled]);

  // Sync html class + (optional) body scroll lock when open
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
        className="sad-mobile-topbar-toggle"
        aria-label={open ? "Close controls" : "Open controls"}
        onClick={() => setOpenState((v) => !v)}
      >
        {open ? "✕" : "⚙︎"}
      </button>

      {open ? (
        <div
          className="sad-mobile-topbar-scrim"
          role="button"
          aria-label="Close controls"
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
