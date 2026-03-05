import React, { useMemo } from "react";

export function BroadcastHeader(props: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const title = props.title ?? "STATE COMMAND";
  const subtitle = props.subtitle ?? "Live operations • Stay alive.";
  const ts = useMemo(() => {
    try { return new Date().toLocaleString(); } catch { return ""; }
  }, []);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, rgba(12,15,19,0.92), rgba(10,12,16,0.88))",
        borderRadius: 14,
        padding: 12,
        boxShadow: "0 14px 40px rgba(0,0,0,0.45)",
      }}
    >
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontWeight: 900, letterSpacing: 0.6, textTransform: "uppercase", fontSize: 12, opacity: 0.95 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, opacity: 0.62, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {subtitle}
        </div>
        <div style={{ fontSize: 12, opacity: 0.62 }}>{ts}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {props.right}
        <div
          style={{
            fontSize: 11,
            padding: "4px 8px",
            borderRadius: 999,
            background: "rgba(176,18,27,0.18)",
            border: "1px solid rgba(176,18,27,0.32)",
            color: "rgba(255,255,255,0.92)",
            fontWeight: 800,
            letterSpacing: 0.4,
          }}
        >
          Z-OPS
        </div>
      </div>
    </div>
  );
}

export default BroadcastHeader;
