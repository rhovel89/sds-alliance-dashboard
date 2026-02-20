import React from "react";
import * as Mod from "./AppRoutes";

/**
 * Default-export compatibility wrapper.
 * App.tsx expects a default export for routes, but AppRoutes.tsx currently doesn't have one.
 * We DO NOT rewrite AppRoutes.tsx here; we just adapt to whatever it exports.
 */
function pickCandidate(): any {
  const m: any = Mod as any;
  return (
    m.default ??
    m.AppRoutes ??
    m.AppRouter ??
    m.Router ??
    m.Routes ??
    m.router ??
    null
  );
}

export default function AppRoutesDefault() {
  const c: any = pickCandidate();

  // If module exported a ready-made element, render it
  if (c && React.isValidElement(c)) return c;

  // If module exported a component/function, render it
  if (typeof c === "function") return React.createElement(c);

  // Fallback: show diagnostic instead of black screen
  return (
    <div style={{ padding: 16, color: "rgba(235,255,235,0.95)" }}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>⚠ Routes module has no renderable export</div>
      <div style={{ opacity: 0.8, fontSize: 12 }}>
        Expected one of: default, AppRoutes, AppRouter, Router, Routes, router.
      </div>
    </div>
  );
}