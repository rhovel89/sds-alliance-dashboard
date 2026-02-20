import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

type LinkItem = { label: string; emoji: string; href: (a: string) => string };

const ALLIANCE_LINKS: LinkItem[] = [
  { label: "Guides",        emoji: "📚", href: (a) => `/dashboard/${a}/guides` },
  { label: "Calendar",      emoji: "🗓️", href: (a) => `/dashboard/${a}/calendar` },
  { label: "HQ Map",        emoji: "🏰", href: (a) => `/dashboard/${a}/hq-map` },
  { label: "Announcements", emoji: "📣", href: (a) => `/dashboard/${a}/announcements` },
  { label: "Permissions",   emoji: "🔐", href: (a) => `/dashboard/${a}/permissions` },
  { label: "Events",        emoji: "🎯", href: (a) => `/dashboard/${a}/events` },
];

const GLOBAL_LINKS: LinkItem[] = [
  { label: "My Mail",    emoji: "✉️", href: (_a) => `/mail` },
  { label: "State 789",  emoji: "🧟", href: (_a) => `/state/789` },
  { label: "Alliances",  emoji: "🗂️", href: (_a) => `/alliances` },
];

function CardButton(props: { emoji: string; label: string; onClick: () => void }) {
  return (
    <button
      className="zombie-btn"
      style={{
        width: "100%",
        textAlign: "left",
        padding: "12px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
      onClick={props.onClick}
    >
      <div style={{ fontSize: 18 }}>{props.emoji}</div>
      <div style={{ fontWeight: 900 }}>{props.label}</div>
    </button>
  );
}

export function AllianceQuickLinksPanel() {
  const nav = useNavigate();
  const { alliance_id } = useParams();

  const alliance = useMemo(() => (alliance_id ? String(alliance_id).toUpperCase() : ""), [alliance_id]);

  return (
    <div className="zombie-card" style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 900, fontSize: 14 }}>⚡ Quick Links</div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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

          <button
            className="zombie-btn"
            style={{ padding: "8px 10px", fontSize: 12 }}
            onClick={async () => {
              if (!alliance) return window.alert("No alliance in URL.");
              try {
                await navigator.clipboard.writeText(alliance);
                window.alert("Copied: " + alliance);
              } catch {
                window.prompt("Copy alliance:", alliance);
              }
            }}
          >
            Copy Code
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 8 }}>Alliance</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
          {ALLIANCE_LINKS.map((l) => (
            <CardButton key={l.label} emoji={l.emoji} label={l.label} onClick={() => nav(l.href(alliance))} />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 8 }}>Global</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
          {GLOBAL_LINKS.map((l) => (
            <CardButton key={l.label} emoji={l.emoji} label={l.label} onClick={() => nav(l.href(alliance))} />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
        Tip: links are UI-only shortcuts; backend permissions still enforced by RLS.
      </div>
    </div>
  );
}

export default AllianceQuickLinksPanel;