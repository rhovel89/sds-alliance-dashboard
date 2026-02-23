import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

type LinkItem = { label: string; path: (a: string) => string; emoji?: string };

const LINKS: LinkItem[] = [
  { label: "Guides",        path: (a) => "/dashboard/" + a + "/guides", emoji: "📚" },
  { label: "Calendar",      path: (a) => "/dashboard/" + a + "/calendar", emoji: "🗓️" },
  { label: "HQ Map",        path: (a) => "/dashboard/" + a + "/hq-map", emoji: "🏰" },
  { label: "Announcements", path: (a) => "/dashboard/" + a + "/announcements", emoji: "📣" },
  { label: "Permissions",   path: (a) => "/dashboard/" + a + "/permissions", emoji: "🔐" },
  { label: "Events",        path: (a) => "/dashboard/" + a + "/events", emoji: "🎯" },
  { label: "My Mail",     path: (_a) => "/mail", emoji: "✉️" },
];

export function AllianceQuickLinksPanel() {
  const nav = useNavigate();
  const { alliance_id } = useParams();
  const alliance = useMemo(() => (alliance_id ? String(alliance_id).toUpperCase() : ""), [alliance_id]);

  return (
    <div className="zombie-card" style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 14 }}>⚡ Quick Links</div>

        <button
          className="zombie-btn"
          style={{ padding: "8px 10px", fontSize: 12 }}
          onClick={async () => {
            const url = window.location.origin + "/dashboard/" + alliance;
            try {
              await navigator.clipboard.writeText(url);
              window.alert("Copied: " + url);
            } catch {
              window.prompt("Copy link:", url);
            }
          }}
        >
          Copy Alliance URL
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 10,
          marginTop: 12,
        }}
      >
        {LINKS.map((l) => (
          <button
            key={l.label}
            className="zombie-btn"
            style={{ width: "100%", textAlign: "left", padding: "12px 12px" }}
            onClick={() => nav(l.path(alliance))}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 16 }}>{l.emoji || "➡️"}</div>
              <div style={{ fontWeight: 900 }}>{l.label}</div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
        Visible only on <code>/dashboard/&lt;ALLIANCE&gt;</code> (home).
      </div>
    </div>
  );
}

export default AllianceQuickLinksPanel;
