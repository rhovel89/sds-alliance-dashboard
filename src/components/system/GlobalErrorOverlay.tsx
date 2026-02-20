import React, { useEffect, useState } from "react";
import SupportBundleButton from "./SupportBundleButton";

export default function GlobalErrorOverlay() {
  const [err, setErr] = useState<{ message: string; stack?: string } | null>(null);

  useEffect(() => {
    function onErr(e: any) {
      const message = String(e?.message || e?.error?.message || e || "Unknown error");
      const stack = String(e?.error?.stack || e?.stack || "");
      setErr({ message, stack });
    }
    function onRej(e: any) {
      const message = String(e?.reason?.message || e?.reason || "Unhandled rejection");
      const stack = String(e?.reason?.stack || "");
      setErr({ message, stack });
    }

    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);

  if (!err) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999999, background: "rgba(0,0,0,0.85)", padding: 14, overflow: "auto" }}>
      <div className="zombie-card" style={{ border: "1px solid rgba(255,0,0,0.35)" }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>🧟 Global Error Trap</div>
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <SupportBundleButton label="Copy Support Bundle" />
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => setErr(null)}>Dismiss</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => window.location.href = "/debug"}>Open /debug</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => window.location.reload()}>Reload</button>
        </div>
        <pre style={{ marginTop: 12, whiteSpace: "pre-wrap", fontSize: 12, opacity: 0.9 }}>
{err.message}

{err.stack || ""}
        </pre>
      </div>
    </div>
  );
}