import React, { useMemo } from "react";
import { Link } from "react-router-dom";

function s(v: any) { return v === null || v === undefined ? "" : String(v); }

export default function HQCard(props: { hq: any; allianceName?: string | null }) {
  const hq = props.hq || {};
  const allianceName = props.allianceName;

  const allianceCode = useMemo(() => {
    return s(hq.allianceCode || hq.alliance_code || hq.alliance || hq.alliance_id).trim().toUpperCase();
  }, [hq]);

  const title = useMemo(() => {
    return allianceName ? `${s(allianceName).trim()} — ${allianceCode || "HQ"}` : (allianceCode || "HQ");
  }, [allianceName, allianceCode]);

  const slotNumber = hq.slotNumber ?? hq.slot_number ?? hq.slot ?? null;
  const slotLabel = slotNumber != null ? `Slot #${slotNumber}` : "";

  const dashboardBase = allianceCode ? `/dashboard/${encodeURIComponent(allianceCode)}` : "/dashboard";
  const hqMapLink = `${dashboardBase}/hq-map`;
  const calLink = `${dashboardBase}/calendar`;

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 14,
        padding: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 950 }}>{title}</div>
          <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4 }}>
            {slotLabel ? slotLabel : "HQ"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link
            to={hqMapLink}
            style={{
              opacity: 0.9,
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.14)",
              padding: "6px 10px",
              borderRadius: 10,
            }}
          >
            HQ Map →
          </Link>
          <Link
            to={calLink}
            style={{
              opacity: 0.9,
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.14)",
              padding: "6px 10px",
              borderRadius: 10,
            }}
          >
            Calendar →
          </Link>
        </div>
      </div>

      {hq.note ? <div style={{ marginTop: 10, opacity: 0.85 }}>{String(hq.note)}</div> : null}
    </div>
  );
}
