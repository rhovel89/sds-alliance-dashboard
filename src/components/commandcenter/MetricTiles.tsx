import React from "react";

export type MetricTile = {
  label: string;
  value: string;
  stamp?: string;
  tone?: "neutral" | "watch" | "critical" | "clear";
  sub?: string;
};

export default function MetricTiles(props: { tiles: MetricTile[] }) {
  const tiles = Array.isArray(props.tiles) ? props.tiles : [];
  return (
    <div className="cc-metrics">
      {tiles.map((t) => (
        <div key={t.label} className="cc-tile" data-tone={t.tone || "neutral"}>
          <div className="cc-tile-top">
            <div className="cc-tile-label">{t.label}</div>
            {t.stamp ? <span className="cc-stamp">{t.stamp}</span> : null}
          </div>
          <div className="cc-tile-value">{t.value}</div>
          {t.sub ? <div className="cc-tile-sub">{t.sub}</div> : <div className="cc-tile-sub"> </div>}
        </div>
      ))}
    </div>
  );
}
