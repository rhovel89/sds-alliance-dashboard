import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type Tool = {
  group: string;
  title: string;
  desc: string;
  to: string;
  badge?: string;
  tags?: string[];
};

function Card(props: { t: Tool }) {
  const nav = useNavigate();
  const { t } = props;

  return (
    <button
      type="button"
      className="zombie-card"
      onClick={() => nav(t.to)}
      style={{
        width: "100%",
        textAlign: "left",
        padding: 14,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        borderRadius: 14,
        color: "rgba(255,255,255,0.95)",
        textShadow: "0 1px 2px rgba(0,0,0,0.65)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ fontWeight: 950, fontSize: 16, lineHeight: 1.2 }}>{t.title}</div>
        {t.badge ? (
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              border: "1px solid rgba(255,255,255,0.25)",
              padding: "3px 10px",
              borderRadius: 999,
              background: "rgba(0,0,0,0.25)",
            }}
          >
            {t.badge}
          </span>
        ) : null}
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.35, opacity: 0.95 }}>{t.desc}</div>
      <div style={{ fontSize: 12, lineHeight: 1.2, opacity: 0.78 }}>{t.to}</div>
    </button>
  );
}

export default function OwnerCommandCenterHome() {
  const [q, setQ] = useState("");

  const tools: Tool[] = useMemo(
    () => [
      // Recommended workflow
      { group: "Start Here (recommended order)", title: "1) Alliance Directory Sync", desc: "Add/verify alliances. Powers dropdowns + onboarding.", to: "/owner/directory-sync", badge: "Start" },
      { group: "Start Here (recommended order)", title: "2) Onboarding Queue", desc: "Approve → provision membership → optional welcome mail.", to: "/owner/onboarding-queue", badge: "Start" },
      { group: "Start Here (recommended order)", title: "3) Access Control Hub", desc: "All permissions (State + Alliance) + legacy tools in one place.", to: "/owner/access-control", badge: "Start" },
      { group: "Start Here (recommended order)", title: "4) Mail Broadcast", desc: "Send an alliance broadcast (shows in /mail-v2).", to: "/owner/mail-broadcast", badge: "Start" },

      // People & membership
      { group: "People & Membership", title: "Access Requests", desc: "Review access requests (legacy list).", to: "/owner/requests" },
      { group: "People & Membership", title: "Provision Requests", desc: "Provision memberships after approval.", to: "/owner/requests-provision" },
      { group: "People & Membership", title: "Memberships", desc: "View/manage memberships.", to: "/owner/memberships" },
      { group: "People & Membership", title: "Membership Manager", desc: "Direct membership management tools.", to: "/owner/membership" },
      { group: "People & Membership", title: "Players", desc: "Players list & tools.", to: "/owner/players" },
      { group: "People & Membership", title: "Players Link", desc: "Link auth users to players.", to: "/owner/players-link" },

      // Permissions
      { group: "Permissions", title: "Permissions Matrix V3", desc: "Your main permissions assignment UI.", to: "/owner/permissions-matrix-v3" },
      { group: "Permissions", title: "Permissions DB", desc: "DB-focused permission tooling.", to: "/owner/permissions-db" },
      { group: "Permissions", title: "Roles", desc: "Role/permission definitions (legacy).", to: "/owner/roles" },
      { group: "Permissions", title: "Access Control (Legacy only)", desc: "Original access-control page standalone.", to: "/owner/access-control-legacy" },

      // Directory / alliances
      { group: "Alliances & Directory", title: "Alliances", desc: "Owner alliances page.", to: "/owner/alliances" },
      { group: "Alliances & Directory", title: "Alliance Directory (legacy)", desc: "Legacy directory editor page.", to: "/owner/alliance-directory" },
      { group: "Alliances & Directory", title: "Directory Editor", desc: "Directory editor tool.", to: "/owner/directory-editor" },
      { group: "Alliances & Directory", title: "Directory DB", desc: "Directory DB tool.", to: "/owner/directory-db" },
      { group: "Alliances & Directory", title: "Directory Sync", desc: "Sync directory across UI.", to: "/owner/directory-sync" },
      { group: "Alliances & Directory", title: "Alliance Jump", desc: "Jump to an alliance dashboard.", to: "/owner/jump" },

      // Mail / comms
      { group: "Mail & Comms", title: "Mail Broadcast", desc: "Send broadcast into mail system.", to: "/owner/mail-broadcast" },
      { group: "Mail & Comms", title: "Broadcast Composer", desc: "Compose a Discord-ready message + payload.", to: "/owner/broadcast" },

      // Discord
      { group: "Discord", title: "Discord Settings", desc: "Discord settings page.", to: "/owner/discord" },
      { group: "Discord", title: "Discord Mentions", desc: "Role/channel mapping tools.", to: "/owner/discord-mentions" },
      { group: "Discord", title: "Mentions Tools", desc: "Mentions helper tools.", to: "/owner/discord-mentions-tools" },
      { group: "Discord", title: "Discord Templates", desc: "Template library.", to: "/owner/discord-templates" },
      { group: "Discord", title: "Discord Defaults", desc: "Default channel/roles.", to: "/owner/discord-defaults" },
      { group: "Discord", title: "Discord Send Log", desc: "View send log.", to: "/owner/discord-send-log" },
      { group: "Discord", title: "Discord Queue", desc: "Queue-for-bot tool.", to: "/owner/discord-queue" },
      { group: "Discord", title: "Discord Test Send", desc: "Test send UI.", to: "/owner/discord-test-send" },
      { group: "Discord", title: "Discord Edge Test", desc: "Edge send test page.", to: "/owner/discord-edge-test" },
      { group: "Discord", title: "Scheduled Sends", desc: "Scheduled Discord sends page.", to: "/owner/scheduled-sends" },

      // State management
      { group: "State Management", title: "State Manager", desc: "State manager page.", to: "/owner/state" },
      { group: "State Management", title: "State Leaders", desc: "Manage state leaders.", to: "/owner/state-leaders" },

      // Achievements admin
      { group: "State Achievements", title: "Achievement Inbox", desc: "Review requests (your dropdown fix is below).", to: "/owner/state-achievement-inbox" },
      { group: "State Achievements", title: "Achievement Catalog", desc: "Types/options catalog.", to: "/owner/state-achievement-catalog" },
      { group: "State Achievements", title: "Achievement Requests", desc: "Requests list/queue.", to: "/owner/state-achievement-requests" },
      { group: "State Achievements", title: "State Achievements (legacy)", desc: "Legacy state achievements admin.", to: "/owner/state-achievements" },

      // Events
      { group: "Events", title: "Event Types", desc: "Manage event types.", to: "/owner/event-types" },
      { group: "Events", title: "Event Types Library", desc: "Templates library.", to: "/owner/event-types-library" },

      // Ops / debug
      { group: "Ops & Debug", title: "Live Ops", desc: "Ops timer + checklist.", to: "/owner/live-ops" },
      { group: "Ops & Debug", title: "Live Ops DB", desc: "DB-backed live ops tools.", to: "/owner/live-ops-db" },
      { group: "Ops & Debug", title: "Realtime History", desc: "Realtime/debug history.", to: "/owner/realtime-history" },

      // Backups
      { group: "Backups / Data", title: "Data Vault", desc: "Export/import sad_* localStorage configs.", to: "/owner/data-vault" },

      // Provisioning (advanced)
      { group: "Advanced", title: "One-click Provision", desc: "Provision helper.", to: "/owner/oneclick-provision" },
      { group: "Advanced", title: "One-click Provision Plus", desc: "Provision helper (plus).", to: "/owner/oneclick-provision-plus" },

      // Owner selector (if used)
      { group: "Advanced", title: "Owner Select", desc: "Owner select page.", to: "/owner/select" },
    ],
    []
  );

  const query = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!query) return tools;
    return tools.filter((t) => {
      const hay = (t.group + " " + t.title + " " + t.desc + " " + t.to + " " + (t.tags || []).join(" ")).toLowerCase();
      return hay.includes(query);
    });
  }, [tools, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Tool[]>();
    for (const t of filtered) {
      if (!map.has(t.group)) map.set(t.group, []);
      map.get(t.group)!.push(t);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 16,
          padding: 14,
          color: "rgba(255,255,255,0.95)",
          textShadow: "0 1px 2px rgba(0,0,0,0.65)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 950, fontSize: 20, lineHeight: 1.15 }}>Command Center</div>
            <div style={{ fontSize: 14, lineHeight: 1.35, opacity: 0.92 }}>
              Search any tool or follow “Start Here” in order.
            </div>
          </div>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tools (permissions, onboarding, discord...)"
            style={{
              minWidth: 260,
              width: "min(520px, 100%)",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.22)",
              background: "rgba(0,0,0,0.35)",
              color: "rgba(255,255,255,0.95)",
              outline: "none",
            }}
          />
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
          {grouped.map(([group, items]) => (
            <div key={group}>
              <div style={{ fontWeight: 950, fontSize: 14, opacity: 0.95, marginBottom: 8 }}>{group}</div>
              <div className="sad-card-grid-2">
                {items.map((it) => (
                  <Card key={it.to + it.title} t={it} />
                ))}
              </div>
            </div>
          ))}
          {grouped.length === 0 ? <div style={{ opacity: 0.9 }}>No tools match your search.</div> : null}
        </div>
      </div>
    </div>
  );
}
