import React from "react";
export type ThreatStripItem = { label: string; value: string; stamp?: string; };

export default function ThreatStrip(props: { items: ThreatStripItem[] }) {
  const items = Array.isArray(props.items) ? props.items : [];
  return (
    <div className="cc-strip">
      {items.map((it) => (
        <div key={it.label} className="cc-strip-item">
          <div className="cc-strip-label">{it.label}</div>
          <div className="cc-strip-value">
            {it.value}
            {it.stamp ? <span className="cc-stamp">{it.stamp}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
