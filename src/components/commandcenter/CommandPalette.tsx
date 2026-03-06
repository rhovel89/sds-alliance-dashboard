import React, { useEffect, useMemo, useState } from "react";
import type { NavItem } from "../../navigation/navRegistry";

export default function CommandPalette(props: {
  open: boolean;
  items: NavItem[];
  onClose: () => void;
  onPick: (to: string) => void;
}) {
  const open = !!props.open;
  const items = props.items || [];
  const [q, setQ] = useState("");

  useEffect(() => {
    if (open) setQ("");
  }, [open]);

  const filtered = useMemo(() => {
    const term = String(q || "").trim().toLowerCase();
    if (!term) return items;
    return items.filter((x) => {
      const s = `${x.label} ${x.hint || ""} ${x.group || ""}`.toLowerCase();
      return s.includes(term);
    });
  }, [items, q]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") props.onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      onMouseDown={() => props.onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 90,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: 760,
          maxWidth: "calc(100vw - 28px)",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "linear-gradient(180deg, rgba(12,15,19,.98), rgba(7,8,10,.98))",
          boxShadow: "0 22px 70px rgba(0,0,0,.62)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontWeight: 950, letterSpacing: 0.6, textTransform: "uppercase", fontSize: 12, opacity: 0.9 }}>
            Command Palette
          </div>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type to search…"
            style={{
              marginTop: 10,
              width: "100%",
              padding: "12px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(255,255,255,0.92)",
              outline: "none",
            }}
          />
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.65 }}>
            Tip: Ctrl/Cmd + K to open • Esc to close
          </div>
        </div>

        <div style={{ maxHeight: "62vh", overflow: "auto" }}>
          {filtered.map((x) => (
            <button
              key={x.key}
              type="button"
              className="zombie-btn"
              onClick={() => props.onPick(x.to)}
              style={{
                width: "100%",
                textAlign: "left",
                borderRadius: 0,
                padding: "12px 12px",
                borderLeft: "none",
                borderRight: "none",
                borderTop: "none",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(0,0,0,0.12)",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900 }}>
                    {x.icon ? `${x.icon} ` : ""}{x.label}
                  </div>
                  {x.hint ? <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{x.hint}</div> : null}
                </div>
                {x.group ? (
                  <div style={{ fontSize: 11, opacity: 0.7, padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)" }}>
                    {x.group}
                  </div>
                ) : null}
              </div>
            </button>
          ))}
          {!filtered.length ? <div style={{ padding: 12, opacity: 0.7 }}>No matches.</div> : null}
        </div>
      </div>
    </div>
  );
}
