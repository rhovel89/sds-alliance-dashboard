import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type Tool = {
  group: string;
  title: string;
  desc: string;
  to: string;
  tags: string[];
  badge?: string;
};

function Card(props: { title: string; desc: string; to: string; badge?: string }) {
  const nav = useNavigate();
  return (
    <button
      type="button"
      className="zombie-card"
      onClick={() => nav(props.to)}
      style={{
        width: "100%",
        textAlign: "left",
        padding: 14,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        borderRadius: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ fontWeight: 950, fontSize: 16 }}>{props.title}</div>
        {props.badge ? (
          <span style={{ fontSize: 12, opacity: 0.9, border: "1px solid rgba(255,255,255,0.18)", padding: "2px 8px", borderRadius: 999 }}>
            {props.badge}
          </span>
        ) : null}
      </div>
      <div style={{ opacity: 0.8, fontSize: 13 }}>{props.desc}</div>
      <div style={{ opacity: 0.6, fontSize: 12 }}>{props.to}</div>
    </button>
  );
}

export default function OwnerCommandCenterHome() {
  const [q, setQ] = useState("");

  const tools: Tool[] = useMemo(
    () => [
      // Start Here flow
      {
        group: "Start Here (recommended order)",
        title: "1) Alliance Directory Sync",
        desc: "Add/verify alliances. This powers dropdowns + onboarding selections.",
        to: "/owner/directory-sync",
        tags: ["directory", "alliances", "sync", "start"],
        badge: "Start",
      },
      {
        group: "Start Here (recommended order)",
        title: "2) Onboarding Queue",
        desc: "Approve requests → provision membership → optional welcome mail.",
        to: "/owner/onboarding-queue",
        tags: ["onboarding", "approve", "provision", "start"],
        badge: "Start",
      },
      {
        group: "Start Here (recommended order)",
        title: "3) Permissions Matrix",
        desc: "Grant fine-grained State + Alliance permissions to staff/helpers.",
        to: "/owner/permissions-matrix-v3",
        tags: ["permissions", "matrix", "access", "start"],
        badge: "Start",
      },
      {
        group: "Start Here (recommended order)",
        title: "4) Mail Broadcast",
        desc: "Send an alliance broadcast (shows in /mail-v2).",
        to: "/owner/mail-broadcast",
        tags: ["mail", "broadcast", "comms", "start"],
      },

      // Operations / Daily
      {
        group: "Daily Ops",
        title: "Live Ops",
        desc: "Ops timer + checklist + template launcher (UI).",
        to: "/owner/live-ops",
        tags: ["ops", "checklist", "timer"],
      },
      {
        group: "Daily Ops",
        title: "Discord Queue",
        desc: "Queue messages for bot sending later (still no actual send).",
        to: "/owner/discord-queue",
        tags: ["discord", "queue"],
      },

      // Discord setup
      {
        group: "Discord Setup",
        title: "Discord Mentions",
        desc: "Maintain role/channel mappings (localStorage).",
        to: "/owner/discord-mentions",
        tags: ["discord", "mentions", "roles", "channels"],
      },
      {
        group: "Discord Setup",
        title: "Discord Templates",
        desc: "Manage broadcast templates (localStorage).",
        to: "/owner/discord-templates",
        tags: ["discord", "templates"],
      },
      {
        group: "Discord Setup",
        title: "Broadcast Composer",
        desc: "Compose a Discord-ready message + copy payload JSON.",
        to: "/owner/broadcast",
        tags: ["discord", "broadcast", "composer"],
      },

      // State Achievements admin
      {
        group: "State Achievements Admin",
        title: "Achievements Admin (v2)",
        desc: "Manage types/options/queue for State Achievements.",
        to: "/state/789/achievements/admin-v2",
        tags: ["achievements", "state", "admin"],
      },
      {
        group: "State Achievements Admin",
        title: "Achievement Requests Inbox",
        desc: "Review/triage achievement requests.",
        to: "/owner/state-achievement-inbox",
        tags: ["achievements", "requests", "inbox"],
      },
      {
        group: "State Achievements Admin",
        title: "Achievement Catalog",
        desc: "Manage the catalog of achievement types/options.",
        to: "/owner/state-achievement-catalog",
        tags: ["achievements", "catalog"],
      },
      {
        group: "State Achievements Admin",
        title: "Achievement Requests",
        desc: "Queue/list view of achievement submissions.",
        to: "/owner/state-achievement-requests",
        tags: ["achievements", "queue"],
      },

      // Data / backups
      {
        group: "Backups / Data",
        title: "Data Vault",
        desc: "Export/import sad_* localStorage configs safely.",
        to: "/owner/data-vault",
        tags: ["backup", "export", "import", "localStorage"],
      },
      {
        group: "Backups / Data",
        title: "Realtime History",
        desc: "Inspect realtime/debug stream history.",
        to: "/owner/realtime-history",
        tags: ["debug", "realtime"],
      },

      // Legacy quick links
      {
        group: "Legacy / Advanced",
        title: "One-Click Provision",
        desc: "Provision helpers and memberships quickly (advanced).",
        to: "/owner/oneclick-provision-plus",
        tags: ["provision", "advanced"],
      },
      {
        group: "Legacy / Advanced",
        title: "Access Control",
        desc: "Advanced access control management.",
        to: "/owner/access-control",
        tags: ["access", "advanced"],
      },
    ],
    []
  );

  const query = q.trim().toLowerCase();

  const grouped = useMemo(() => {
    const filtered = !query
      ? tools
      : tools.filter((t) => {
          const hay = (t.title + " " + t.desc + " " + t.to + " " + t.tags.join(" ")).toLowerCase();
          return hay.includes(query);
        });

    const map = new Map<string, Tool[]>();
    for (const t of filtered) {
      if (!map.has(t.group)) map.set(t.group, []);
      map.get(t.group)!.push(t);
    }
    return Array.from(map.entries());
  }, [tools, query]);

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ border: "1px solid rgba(255,255,255,0.14)", borderRadius: 16, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 950, fontSize: 18 }}>Owner Command Center</div>
            <div style={{ opacity: 0.8, fontSize: 13 }}>
              Start here if you’re unsure. Everything below is just shortcuts to tools you already have.
            </div>
          </div>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tools (permissions, onboarding, discord...)"
            style={{ minWidth: 260, width: "min(520px, 100%)" }}
          />
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
          {grouped.map(([group, items]) => (
            <div key={group}>
              <div style={{ fontWeight: 900, opacity: 0.9, marginBottom: 8 }}>{group}</div>
              <div className="sad-card-grid-2">
                {items.map((it) => (
                  <Card key={it.to + it.title} title={it.title} desc={it.desc} to={it.to} badge={it.badge} />
                ))}
              </div>
            </div>
          ))}
          {grouped.length === 0 ? <div style={{ opacity: 0.8 }}>No tools match your search.</div> : null}
        </div>
      </div>
    </div>
  );
}
