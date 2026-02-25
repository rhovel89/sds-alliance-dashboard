import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

function setOpen(open: boolean) {
  const root = document.documentElement;
  if (open) root.classList.add("sad-topbar-open");
  else root.classList.remove("sad-topbar-open");
}

function findTopbarContainer(): HTMLElement | null {
  const needles = [
    "Admin Jump",
    "Realtime",
    "Theme",
    "Support Bundle",
    "Broadcast",
    "Admin Tools",
    "Log Out",
    "Alliance"
  ];

  // First: try to find a node containing any needle
  const all = Array.from(document.querySelectorAll("body *")) as HTMLElement[];

  for (const el of all) {
    const txt = (el.textContent || "").trim();
    if (!txt) continue;

    // Keep it cheap: only consider relatively short label-ish nodes
    if (txt.length > 120) continue;

    if (needles.some((n) => txt.includes(n))) {
      // Walk up to find a parent with multiple controls (buttons/selects)
      let cur: HTMLElement | null = el;
      for (let steps = 0; steps < 10 && cur; steps++) {
        const controls = cur.querySelectorAll("button, select, a, input").length;
        if (controls >= 4) return cur;
        cur = cur.parentElement;
      }
    }
  }

  return null;
}

function ensureTopbarTagged(): HTMLElement | null {
  const el = findTopbarContainer();
  if (!el) return null;

  // Tag it once
  el.setAttribute("data-sad-topbar", "1");
  el.classList.add("sad-topbar-root");
  return el;
}

export default function MobileTopbarToggle() {
  const location = useLocation();
  const [open, setOpenState] = useState(false);
  const [enabled, setEnabled] = useState(false);

  // Enable if topbar found; tag it
  useEffect(() => {
    const el = ensureTopbarTagged();
    setEnabled(!!el);

    if (!el) {
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

  // Sync open + scroll lock when expanded
  useEffect(() => {
    if (!enabled) return;

    setOpen(open);
    const prev = document.body.style.overflow;

    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = prev || "";

    return () => {
      document.body.style.overflow = prev || "";
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
