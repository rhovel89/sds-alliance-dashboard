import { useEffect, useMemo, useState } from "react";
import { OwnerLiveOpsPanel } from "../../components/owner/OwnerLiveOpsPanel";

import styles from "./OwnerDashboardPage.module.css";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import OwnerToolsQuickNav from "../../components/owner/OwnerToolsQuickNav";
import OwnerAdminQuickLinksCard from "../../components/owner/OwnerAdminQuickLinksCard";

type LinkItem = { path: string; label: string; desc?: string };

const OWNER_LINKS: LinkItem[] = [
  { path: "/owner/alliances", label: "Alliances", desc: "/owner/alliances" },
  { path: "/owner/discord", label: "Discord Settings", desc: "/owner/discord" },
  { path: "/owner/membership", label: "Membership", desc: "/owner/membership" },
  { path: "/owner/memberships", label: "Membership Manager", desc: "/owner/memberships" },
  { path: "/owner/players", label: "Players", desc: "/owner/players" },
  { path: "/owner/players-link", label: "Players Link", desc: "/owner/players-link" },
  { path: "/owner/requests", label: "Access Requests", desc: "/owner/requests" },
  { path: "/owner/requests-provision", label: "Provision / Approvals", desc: "/owner/requests-provision" },
  { path: "/owner/select", label: "Select Alliance Dashboard", desc: "/owner/select" },
];

type Stats = {
  pendingRequests: number | null;
  alliances: number | null;
  players: number | null;
  webhooks: number | null;
};

async function safeCount(query: any): Promise<number | null> {
  try {
    const res = await query;
    if (res?.error) return null;
    return typeof res?.count === "number" ? res.count : null;
  } catch {
    return null;
  }
}

export default function OwnerDashboardPage() {
  const navigate = useNavigate();

  const [stats, setStats] = useState<Stats>({
    pendingRequests: null,
    alliances: null,
    players: null,
    webhooks: null,
  });

  useEffect(() => {
    (async () => {
      // Each one is "best effort" (if a table/column/policy blocks it, it just shows —)
      const pendingRequests = await safeCount(
        supabase
          .from("access_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
      );

      const alliances = await safeCount(
        supabase
          .from("alliances")
          .select("code", { count: "exact", head: true })
      );

      const players = await safeCount(
        supabase
          .from("players")
          .select("id", { count: "exact", head: true })
      );

      const webhooks = await safeCount(
        supabase
          .from("alliance_discord_settings")
          .select("alliance_id", { count: "exact", head: true })
          .eq("enabled", true)
      );

      setStats({ pendingRequests, alliances, players, webhooks });
    })();
  }, []);

  const healthCards = useMemo(
    () => [
      { label: "Pending Requests", value: stats.pendingRequests, path: "/owner/requests" },
      { label: "Alliances", value: stats.alliances, path: "/owner/alliances" },
      { label: "Players", value: stats.players, path: "/owner/players" },
      { label: "Discord Webhooks", value: stats.webhooks, path: "/owner/discord" },
    ],
    [stats]
  );

  return (
    <div className={styles.page}>
      <OwnerAdminQuickLinksCard />
      <h2 className={styles.title}>🧟 Owner Dashboard</h2>
      <OwnerToolsQuickNav />
      <div style={{ marginTop: 12 }}>
        <a
          href="/owner/roles"
          style={{
            display: "inline-block",
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.18)",
            textDecoration: "none",
          }}
        >
          🛡️ Roles & Permissions
        </a>
      </div>
      <div className={styles.subtext}>
        Quick access to requests, approvals, players, alliances, and Discord reminders.
      </div>

      {/* Health cards */}
      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
        }}
      >
        {healthCards.map((c) => (
          <div
            key={c.label}
            
            className={styles.card}
role={c.path ? "button" : undefined}
            tabIndex={c.path ? 0 : -1}
            onClick={() => {
              if (!c.path) return;
              navigate(c.path);
            }}
            onKeyDown={(e) => {
              if (!c.path) return;
              if (e.key === "Enter" || e.key === " ") navigate(c.path);
            }}
            style={{
              border: "1px solid #333",
              borderRadius: 12,
              padding: 14,
              background: "rgba(0,0,0,0.20)",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.8 }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>
              {c.value === null ? "—" : c.value}
            </div>
          </div>
        ))}
      </div>

      {/* Links */}
      <div className={styles.sectionTitle}>⚙️ Owner Links</div>
      <div
        style={{
          marginTop: 10,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        {OWNER_LINKS.map((l) => (
          <button
            key={l.path}
            onClick={() => navigate(l.path)}
                        className={styles.linkCard}
style={{
              textAlign: "left",
              padding: 14,
              border: "1px solid #333",
              borderRadius: 12,
              background: "rgba(0,0,0,0.20)",
              cursor: "pointer",
            
              color: "inherit",
}}
          >
            <div style={{ fontWeight: 900 }}>{l.label}</div>
            <div className={styles.linkDesc}>
              {l.desc ?? l.path}
            </div>
          </button>
        ))}
      </div>
          <OwnerLiveOpsPanel />
</div>
  );
}

