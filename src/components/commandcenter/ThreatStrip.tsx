import React from "react";

type Threat = "GREEN" | "AMBER" | "RED";

export function ThreatStrip(props: {
  threat?: Threat;
  left?: React.ReactNode;
  right?: React.ReactNode;
  note?: string;
}) {
  const threat = (props.threat || "AMBER").toUpperCase() as Threat;

  const badgeStyle: React.CSSProperties =
    threat === "GREEN"
      ? { background: "rgba(86,240,106,0.16)", borderColor: "rgba(86,240,106,0.28)" }
      : threat === "RED"
      ? { background: "rgba(176,18,27,0.18)", borderColor: "rgba(176,18,27,0.32)" }
      : { background: "rgba(255,191,60,0.14)", borderColor: "rgba(255,191,60,0.26)" };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, rgba(12,15,19,0.92), rgba(10,12,16,0.88))",
        boxShadow: "0 14px 40px rgba(0,0,0,0.45)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            padding: "4px 8px",
            borderRadius: 999,
            border: "1px solid",
            color: "rgba(255,255,255,0.92)",
            ...badgeStyle,
          }}
        >
          Threat: {threat}
        </div>

        <div style={{ fontSize: 12, opacity: 0.72, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {props.note || "Monitor intel. Confirm operations. No panic — controlled chaos."}
        </div>

        {props.left ? <div style={{ marginLeft: 8 }}>{props.left}</div> : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {props.right}
      </div>
    </div>
  );
}

export default ThreatStrip;
