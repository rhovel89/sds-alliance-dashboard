import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import MyAlliance from "../MyAlliance";
import { AllianceThemePicker } from "../../components/theme/AllianceThemePicker";
import { RealtimeStatusBadge } from "../../components/system/RealtimeStatusBadge";
import { detectAllianceFromPath } from "../../utils/detectAllianceFromPath";
import { getCurrentAlliance } from "../../utils/getCurrentAlliance";
import { getCurrentTheme } from "../../utils/getCurrentTheme";
import { DashboardHomeQuickLinks } from "../../components/nav/DashboardHomeQuickLinks";
import AllianceAnnouncementsHomePreview from "../../components/announcements/AllianceAnnouncementsHomePreview";

export default function AllianceDashboardIndexPage() {
  const { alliance_id } = useParams();
  const alliance = useMemo(() => (alliance_id ? String(alliance_id).toUpperCase() : ""), [alliance_id]);

  const [copied, setCopied] = useState<string | null>(null);

  async function copySupportBundle() {
    try {
      const u = await supabase.auth.getUser();
      const userId = u.data.user?.id || null;

      const bundle = {
        tsUtc: new Date().toISOString(),
        href: window.location.href,
        path: window.location.pathname,
        alliance: getCurrentAlliance(window.location.pathname),
        theme: getCurrentTheme(getCurrentAlliance(window.location.pathname)),
        userId,
        browserOnline: navigator.onLine,
        userAgent: navigator.userAgent,
      };

      const txt = JSON.stringify(bundle, null, 2);
      try {
        await navigator.clipboard.writeText(txt);
        setCopied("Copied support bundle to clipboard.");
        window.setTimeout(() => setCopied(null), 2500);
      } catch {
        window.prompt("Copy support bundle:", txt);
      }
    } catch {
      window.alert("Could not generate support bundle.");
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <div className="zombie-pill" style={{ padding: "8px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.18)", fontWeight: 900, fontSize: 12 }}>
            Current Alliance: {alliance || "—"}
          </div>
          <RealtimeStatusBadge allianceCode={alliance || null} />
          <DashboardHomeQuickLinks />
          <AllianceAnnouncementsHomePreview />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <AllianceThemePicker />
          <button className="zombie-btn" style={{ padding: "10px 12px", fontSize: 12 }} onClick={copySupportBundle}>
            Copy Support Bundle
          </button>
        </div>
      </div>

      {copied ? <div style={{ marginTop: 8, opacity: 0.85, fontSize: 12 }}>{copied}</div> : null}


      <div style={{ marginTop: 14 }}>
        <MyAlliance />
      </div>
    </div>
  );
}
