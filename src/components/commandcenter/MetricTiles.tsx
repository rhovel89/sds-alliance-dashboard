import React from "react";

type AnyRecord = Record<string, any>;

function normalizeTiles(input: any): AnyRecord[] {
  if (!input) return [];
  if (Array.isArray(input)) return input as AnyRecord[];
  if (typeof input === "object") {
    // If someone passed { a: 1, b: 2 } turn into [{label:a,value:1},...]
    return Object.entries(input).map(([k, v]) => ({ label: k, value: v }));
  }
  return [{ label: "Value", value: input }];
}

export function MetricTiles(props: any) {
  const tiles = normalizeTiles(props.tiles ?? props.metrics ?? props.items ?? props.data);
  const title = props.title ?? null;
  const subtitle = props.subtitle ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {(title || subtitle) ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {title ? <div style={{ fontWeight: 900, letterSpacing: 0.4, textTransform: "uppercase", fontSize: 12, opacity: 0.92 }}>{String(title)}</div> : null}
          {subtitle ? <div style={{ fontSize: 12, opacity: 0.62 }}>{String(subtitle)}</div> : null}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
        }}
      >
        {tiles.length === 0 ? (
          <div style={{
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            borderRadius: 14,
            padding: 12,
            opacity: 0.7,
          }}>
            No metrics yet.
          </div>
        ) : tiles.map((t, idx) => {
          const label = t.label ?? t.name ?? t.key ?? `Metric ${idx + 1}`;
          const value = t.value ?? t.val ?? t.count ?? t.total ?? "";
          const hint = t.hint ?? t.sub ?? t.subtitle ?? "";

          return (
            <div
              key={idx}
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                borderRadius: 14,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.72, fontWeight: 800, letterSpacing: 0.2 }}>
                {String(label)}
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 0.2 }}>
                {String(value)}
              </div>
              {hint ? <div style={{ fontSize: 12, opacity: 0.62 }}>{String(hint)}</div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MetricTiles;
