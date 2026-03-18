import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type AllianceRow = { code: string; name?: string | null; enabled?: boolean | null };
type DiscordRow = { alliance_id?: string | null; webhook_url?: string | null; role_id?: string | null; enabled?: boolean | null };
type HealthState = {
  sessionUserId: string | null;
  lastRefreshed: string | null;
  pendingRequests: number | null;
  alliances: number | null;
  players: number | null;
  memberships: number | null;
  events: number | null;
  reminderLastAt: string | null;
  discordConfigured: number | null;
  discordMissing: number | null;
  errors: string[];
};

function maskWebhook(url?: string | null) {
  if (!url) return "—";
  try {
    const u = new URL(url);
    const tail = url.slice(-6);
    return `${u.host}/…${tail}`;
  } catch {
    const tail = url.slice(-6);
    return `…${tail}`;
  }
}

async function countTable(table: string, filter?: (q: any) => any): Promise<number | null> {
  try {
    let q = supabase.from(table).select("*", { count: "exact", head: true });
    if (filter) q = filter(q);
    const res = await q;
    if (res.error) return null;
    return typeof res.count === "number" ? res.count : 0;
  } catch {
    return null;
  }
}

function Pill(props: { text: string }) {
  return (
    <div
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: "0.04em",
        opacity: 0.92,
      }}
    >
      {props.text}
    </div>
  );
}

function StatCard(props: { label: string; value: string; sub: string }) {
  return (
    <div
      className="zombie-card"
      style={{
        padding: 14,
        minHeight: 112,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ opacity: 0.72, fontSize: 11, fontWeight: 900, letterSpacing: "0.12em" }}>{props.label}</div>
      <div style={{ fontSize: 24, fontWeight: 950 }}>{props.value}</div>
      <div style={{ opacity: 0.72, fontSize: 12 }}>{props.sub}</div>
    </div>
  );
}

function SectionCard(props: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div
      className="zombie-card"
      style={{
        padding: 16,
        background: "rgba(0,0,0,0.22)",
      }}
    >
      <div style={{ fontWeight: 950, fontSize: 18 }}>{props.title}</div>
      {props.subtitle ? (
        <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4, marginBottom: 12 }}>{props.subtitle}</div>
      ) : (
        <div style={{ height: 12 }} />
      )}
      {props.children}
    </div>
  );
}

function LaunchCard(props: { title: string; desc: string; to: string; emoji: string }) {
  return (
    <Link to={props.to} style={{ textDecoration: "none" }}>
      <div
        className="zombie-card"
        style={{
          padding: 18,
          minHeight: 180,
          display: "grid",
          gap: 10,
          alignContent: "start",
          background: "linear-gradient(180deg, rgba(18,22,28,0.96), rgba(10,12,16,0.94))",
        }}
      >
        <div style={{ fontSize: 30 }}>{props.emoji}</div>
        <div style={{ fontSize: 20, fontWeight: 950 }}>{props.title}</div>
        <div style={{ opacity: 0.82, lineHeight: 1.6 }}>{props.desc}</div>
        <div style={{ opacity: 0.62, fontSize: 12 }}>{props.to}</div>
      </div>
    </Link>
  );
}

function LinkChip(props: { to: string; label: string }) {
  return (
    <Link
      to={props.to}
      style={{
        textDecoration: "none",
        padding: "9px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.04)",
        color: "rgba(255,255,255,0.92)",
        fontWeight: 700,
        fontSize: 13,
      }}
    >
      {props.label}
    </Link>
  );
}

function Badge(props: { text: string; ok?: boolean }) {
  return (
    <span
      style={{
        fontSize: 12,
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.10)",
        background: props.ok ? "rgba(0,255,140,0.08)" : "rgba(255,80,80,0.08)",
        color: props.ok ? "#8cffc7" : "#ffb0b0",
        fontWeight: 800,
      }}
    >
      {props.text}
    </span>
  );
}

export default function OwnerCommandCenterPage() {
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<HealthState>({
    sessionUserId: null,
    lastRefreshed: null,
    pendingRequests: null,
    alliances: null,
    players: null,
    memberships: null,
    events: null,
    reminderLastAt: null,
    discordConfigured: null,
    discordMissing: null,
    errors: [],
  });

  const [alliances, setAlliances] = useState<AllianceRow[]>([]);
  const [discord, setDiscord] = useState<DiscordRow[]>([]);

  const refresh = async () => {
    setLoading(true);
    const errors: string[] = [];

    const u = await supabase.auth.getUser();
    const sessionUserId = u.data?.user?.id ?? null;

    const pendingRequests = await countTable("access_requests", (q) => q.eq("status", "pending"));
    const alliancesCount = await countTable("alliances");
    const playersCount = await countTable("players");
    const membershipsCount = await countTable("player_alliances");
    const eventsCount = await countTable("alliance_events");

    let reminderLastAt: string | null = null;
    try {
      const r = await supabase
        .from("reminder_logs")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1);
      reminderLastAt = (r.data && r.data[0] && (r.data[0] as any).created_at) ? (r.data[0] as any).created_at : null;
    } catch {
      reminderLastAt = null;
    }

    try {
      const resA = await supabase.from("alliances").select("code,name,enabled").order("code", { ascending: true });
      if (!resA.error) {
        setAlliances((resA.data || []) as any);
      } else {
        const msg = (resA.error.message || "").toLowerCase();
        if (msg.includes("enabled")) {
          const resB = await supabase.from("alliances").select("code,name").order("code", { ascending: true });
          if (!resB.error) setAlliances(((resB.data || []) as any).map((x: any) => ({ ...x, enabled: true })));
          else errors.push(resB.error.message);
        } else {
          errors.push(resA.error.message);
        }
      }
    } catch (e: any) {
      errors.push(e?.message || "Failed to load alliances");
    }

    let discordConfigured: number | null = null;
    let discordMissing: number | null = null;
    try {
      const resA = await supabase
        .from("alliance_discord_settings")
        .select("alliance_id,webhook_url,role_id,enabled")
        .order("alliance_id", { ascending: true });

      if (!resA.error) {
        const rows = (resA.data || []) as any[];
        setDiscord(rows);
        const enabledRows = rows.filter((r) => r.enabled !== false);
        discordConfigured = enabledRows.filter((r) => !!r.webhook_url && String(r.webhook_url).trim() !== "").length;
        discordMissing = enabledRows.filter((r) => !r.webhook_url || String(r.webhook_url).trim() === "").length;
      } else {
        const resB = await supabase.from("alliance_discord_settings").select("*").limit(500);
        if (!resB.error) {
          const rows = (resB.data || []) as any[];
          setDiscord(rows);
          const enabledRows = rows.filter((r) => r.enabled !== false);
          discordConfigured = enabledRows.filter((r) => !!r.webhook_url && String(r.webhook_url).trim() !== "").length;
          discordMissing = enabledRows.filter((r) => !r.webhook_url || String(r.webhook_url).trim() === "").length;
        } else {
          errors.push(resB.error.message);
        }
      }
    } catch (e: any) {
      errors.push(e?.message || "Failed to load discord settings");
    }

    setHealth({
      sessionUserId,
      lastRefreshed: new Date().toISOString(),
      pendingRequests,
      alliances: alliancesCount,
      players: playersCount,
      memberships: membershipsCount,
      events: eventsCount,
      reminderLastAt,
      discordConfigured,
      discordMissing,
      errors,
    });

    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const reminderStatus = useMemo(() => {
    if (!health.reminderLastAt) return { label: "Unknown", ok: false };
    const t = new Date(health.reminderLastAt).getTime();
    const ageMin = Math.floor((Date.now() - t) / 60000);
    return ageMin <= 60
      ? { label: `Active (${ageMin}m ago)`, ok: true }
      : { label: `No sends in ${ageMin}m`, ok: false };
  }, [health.reminderLastAt]);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div style={{ width: "100%", maxWidth: 1440, margin: "0 auto", display: "grid", gap: 12 }}>
      <div
        className="zombie-card"
        style={{
          padding: 20,
          background: "linear-gradient(180deg, rgba(16,20,26,0.98), rgba(8,10,14,0.94))",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ minWidth: 280 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <Pill text="OWNER COMMAND" />
              <Pill text="LIVE OPS" />
              <Pill text="ACCESS + HEALTH" />
            </div>

            <div style={{ fontSize: 34, fontWeight: 950, lineHeight: 1.05 }}>
              Owner Command Center
            </div>

            <div style={{ opacity: 0.84, marginTop: 10, lineHeight: 1.7, maxWidth: 880 }}>
              A cleaner owner home for approvals, memberships, alliances, Discord setup, search, queue health, and achievement administration.
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <LinkChip to="/owner/player-intake" label="🧪 Player Intake" />
              <LinkChip to="/owner/approval-center" label="✅ Approval Center" />
              <LinkChip to="/owner/dossiers" label="🗂️ Player Dossiers" />
              <LinkChip to="/owner/state-achievements" label="🏆 State Achievements" />
              <LinkChip to="/owner/queue-health" label="🩺 Queue Health" />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" type="button" onClick={refresh} disabled={loading} style={{ padding: "10px 12px" }}>
              {loading ? "Refreshing…" : "↻ Refresh"}
            </button>
            <button className="zombie-btn" type="button" onClick={logout} style={{ padding: "10px 12px" }}>
              🚪 Logout
            </button>
          </div>
        </div>

        {health.errors.length ? (
          <div
            style={{
              marginTop: 14,
              border: "1px solid rgba(255,120,120,0.30)",
              background: "rgba(255,120,120,0.08)",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 900 }}>Health warnings</div>
            <div style={{ marginTop: 8, display: "grid", gap: 6, fontSize: 13 }}>
              {health.errors.slice(0, 4).map((e, i) => (
                <div key={i}>⚠️ {e}</div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
        <StatCard label="PENDING REQUESTS" value={String(health.pendingRequests ?? "—")} sub="Access requests waiting" />
        <StatCard label="ALLIANCES" value={String(health.alliances ?? "—")} sub="Configured alliance rows" />
        <StatCard label="PLAYERS" value={String(health.players ?? "—")} sub="Tracked player rows" />
        <StatCard label="MEMBERSHIPS" value={String(health.memberships ?? "—")} sub="Alliance membership rows" />
        <StatCard label="EVENTS" value={String(health.events ?? "—")} sub="Alliance event rows" />
        <StatCard
          label="DISCORD"
          value={`${health.discordConfigured ?? "—"}/${health.discordMissing ?? "—"}`}
          sub="Configured / missing"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <LaunchCard title="Player Ops Flow" desc="Intake, approval, memberships, and permissions in one owner path." to="/owner/player-ops" emoji="👤" />
        <LaunchCard title="Alliance Ops Flow" desc="Directory, sync, alliances, and memberships in one management path." to="/owner/alliance-ops" emoji="🏷️" />
        <LaunchCard title="Approval Center" desc="Approve requests and assign access from one shared workspace." to="/owner/approval-center" emoji="✅" />
        <LaunchCard title="State Achievements" desc="Manage achievement requests, types, options, access, and exports." to="/owner/state-achievements" emoji="🏆" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12, alignItems: "start" }}>
        <SectionCard title="Operations and access" subtitle="Core owner workflows and admin tools.">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <LinkChip to="/owner/requests-provision" label="✅ Requests + Provision" />
            <LinkChip to="/owner/players" label="👤 Players" />
            <LinkChip to="/owner/dossiers" label="🗂️ Dossiers" />
            <LinkChip to="/owner/players-link" label="🔗 Link / Unlink Auth" />
            <LinkChip to="/owner/membership" label="🧬 Membership Manager" />
            <LinkChip to="/owner/access-control" label="🛡️ Access Control" />
            <LinkChip to="/owner/onboarding-queue" label="📝 Onboarding Queue" />
            <LinkChip to="/owner/approval-center" label="📂 Approval Center" />
            <LinkChip to="/owner/search" label="🔎 Search Everywhere" />
            <LinkChip to="/owner/player-progress" label="📈 Player Progress" />
            <LinkChip to="/owner/player-progress-compare" label="🆚 Player Compare" />
          </div>
        </SectionCard>

        <SectionCard title="State, messaging, and reports" subtitle="Broadcast, Discord, health, and state reporting tools.">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <LinkChip to="/owner/broadcast" label="📣 Broadcast" />
            <LinkChip to="/owner/discord" label="💬 Discord Settings" />
            <LinkChip to="/owner/discord-mentions" label="🎭 Discord Mentions" />
            <LinkChip to="/owner/discord-defaults" label="⚙️ Discord Defaults" />
            <LinkChip to="/owner/queue-health" label="🩺 Queue Health" />
            <LinkChip to="/owner/morning-brief" label="🌅 Morning Brief" />
            <LinkChip to="/owner/state-achievements" label="🏆 State Achievements" />
            <LinkChip to="/owner/alliance-dashboard-links" label="🔗 Dashboard Links" />
            <LinkChip to="/dashboard" label="🧟 My Dashboards" />
          </div>

          <div style={{ marginTop: 12, opacity: 0.72, fontSize: 12 }}>
            Reminder activity: <Badge text={reminderStatus.label} ok={reminderStatus.ok} />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Alliance jump links" subtitle="Fast access into alliance areas from owner home.">
        {alliances.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No alliances found, or access is blocked.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {alliances.map((a) => {
              const enabled = a.enabled !== false;
              return (
                <div
                  key={a.code}
                  style={{
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 12,
                    padding: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "center",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span>{a.code}</span>
                      {enabled ? <Badge text="Enabled" ok={true} /> : <Badge text="Disabled" ok={false} />}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.78, marginTop: 6 }}>{a.name || a.code}</div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <LinkChip to={`/dashboard/${a.code}`} label="Hub" />
                    <LinkChip to={`/dashboard/${a.code}/calendar`} label="📅 Calendar" />
                    <LinkChip to={`/dashboard/${a.code}/guides`} label="📚 Guides" />
                    <LinkChip to={`/dashboard/${a.code}/hq-map`} label="🗺️ HQ Map" />
                    <LinkChip to={`/dashboard/${a.code}/discord-webhooks`} label="📣 Discord" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Discord settings snapshot" subtitle="Masked webhook coverage across alliances.">
        {discord.length === 0 ? (
          <div style={{ opacity: 0.75 }}>
            No Discord settings rows found, or access is blocked. Open <Link to="/dashboard/WOC/discord-webhooks">Discord Settings</Link>.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {discord.map((d, idx) => {
              const enabled = d.enabled !== false;
              const id = (d.alliance_id || `row_${idx}`).toUpperCase();
              const hasHook = !!d.webhook_url && String(d.webhook_url).trim() !== "";
              return (
                <div
                  key={`${id}_${idx}`}
                  style={{
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 12,
                    padding: 12,
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ fontWeight: 900 }}>{id}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Badge text={enabled ? "Enabled" : "Disabled"} ok={enabled} />
                      <Badge text={hasHook ? "Webhook OK" : "Missing webhook"} ok={hasHook} />
                    </div>
                  </div>

                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.82 }}>
                    Webhook: <code>{maskWebhook(d.webhook_url)}</code>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.82 }}>
                    Role: <code>{d.role_id || "—"}</code>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <LinkChip to="/dashboard/WOC/discord-webhooks" label="Open Discord Settings" />
          <LinkChip to="/owner/discord" label="Owner Discord Page" />
        </div>
      </SectionCard>

      <div style={{ opacity: 0.62, fontSize: 12 }}>
        Direct owner route: <code>/owner</code>
      </div>
    </div>
  );
}

