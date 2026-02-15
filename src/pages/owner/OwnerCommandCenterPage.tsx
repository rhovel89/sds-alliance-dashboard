import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import OwnerCard from "../../components/owner/OwnerCard";

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
  // show only host + last 6 chars
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

    // Session
    const u = await supabase.auth.getUser();
    const sessionUserId = u.data?.user?.id ?? null;

    // Counts (best-effort; RLS may restrict if owner policy isn’t active)
    const pendingRequests = await countTable("access_requests", (q) => q.eq("status", "pending"));
    const alliancesCount = await countTable("alliances");
    const playersCount = await countTable("players");
    const membershipsCount = await countTable("player_alliances");
    const eventsCount = await countTable("alliance_events");

    // Reminder “activity”: latest reminder_logs.created_at (best effort)
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

    // Alliances list (for jump links)
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

    // Discord settings coverage (masked)
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
        // fallback: select *
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reminderStatus = useMemo(() => {
    if (!health.reminderLastAt) return { label: "Unknown", ok: false };
    const t = new Date(health.reminderLastAt).getTime();
    const ageMin = Math.floor((Date.now() - t) / 60000);
    // Reminder logs only happen when reminders are sent; so this is “activity”, not a heartbeat.
    return ageMin <= 60
      ? { label: `Active (last send ${ageMin}m ago)`, ok: true }
      : { label: `No sends in ${ageMin}m`, ok: false };
  }, [health.reminderLastAt]);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const pill = (text: string, ok?: boolean) => (
    <span
      style={{
        fontSize: 12,
        padding: "3px 8px",
        borderRadius: 999,
        border: "1px solid #333",
        background: ok ? "rgba(0,255,140,0.08)" : "rgba(255,80,80,0.08)",
        color: ok ? "#8cffc7" : "#ff9c9c",
      }}
    >
      {text}
    </span>
  );

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>🧟 Owner Command Center</h2>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
            One page to run the whole state. (Health + links + quick jumps)
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={refresh} disabled={loading}>{loading ? "Refreshing…" : "↻ Refresh"}</button>
          <button onClick={logout}>🚪 Logout</button>
        </div>
      </div>

      {/* Quick Links */}
      <div style={{ marginTop: 16, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <OwnerCard title="Owner Tools" icon="🛠️">
          <div style={{ display: "grid", gap: 8 }}>
            <Link to="/owner/requests-provision">✅ Requests — Approve + Provision</Link>
            <Link to="/owner/players">👤 Players</Link>
            <Link to="/owner/players-link">🔗 Players — Link/Unlink Auth</Link>
            <Link to="/owner/membership">🧬 Membership Manager</Link>
            <Link to="/owner/alliances">🏷️ Alliances (Add/Edit/Delete)</Link>
            <Link to="/dashboard/OWNER">📣 Discord Settings (Owner Dashboard)</Link>
          </div>
        </OwnerCard>

        <OwnerCard title="App Navigation" icon="🧭">
          <div style={{ display: "grid", gap: 8 }}>
            <Link to="/onboarding">📝 Onboarding</Link>
            <Link to="/dashboard">🧟 My Dashboards</Link>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Tip: alliance pages live under <code>/dashboard/&lt;CODE&gt;/calendar</code> and <code>/dashboard/&lt;CODE&gt;/hq-map</code>
            </div>
          </div>
        </OwnerCard>

        <OwnerCard title="Health Overview" icon="🧪" right={health.lastRefreshed ? <span style={{ fontSize: 12, opacity: 0.7 }}>refreshed</span> : null}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span>Auth session</span>
              {pill(health.sessionUserId ? "OK" : "No session", !!health.sessionUserId)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span>Pending requests</span>
              <b>{health.pendingRequests ?? "—"}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span>Alliances</span>
              <b>{health.alliances ?? "—"}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span>Players</span>
              <b>{health.players ?? "—"}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span>Memberships</span>
              <b>{health.memberships ?? "—"}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span>Events</span>
              <b>{health.events ?? "—"}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span>Reminders</span>
              {pill(reminderStatus.label, reminderStatus.ok)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span>Discord webhooks</span>
              <b>
                {health.discordConfigured ?? "—"} configured / {health.discordMissing ?? "—"} missing
              </b>
            </div>
          </div>

          {health.errors.length ? (
            <div style={{ marginTop: 10, fontSize: 12, color: "#ffb3b3" }}>
              {health.errors.slice(0, 3).map((e, i) => (
                <div key={i}>⚠️ {e}</div>
              ))}
            </div>
          ) : null}

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            Note: reminder “activity” updates only when reminders are sent.
          </div>
        </OwnerCard>
      </div>

      {/* Alliance Jump List */}
      <div style={{ marginTop: 16 }}>
        <OwnerCard title="Alliance Jump Links" icon="🧟‍♂️">
          {alliances.length === 0 ? (
            <div style={{ opacity: 0.75 }}>No alliances found (or RLS blocked).</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {alliances.map((a) => {
                const enabled = a.enabled !== false;
                return (
                  <div
                    key={a.code}
                    style={{
                      border: "1px solid #2a2a2a",
                      borderRadius: 10,
                      padding: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 900 }}>
                        {a.code} {enabled ? "" : <span style={{ fontSize: 12, opacity: 0.7 }}>(disabled)</span>}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.85 }}>{a.name || a.code}</div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <Link to={`/dashboard/${a.code}/calendar`}>📅 Calendar</Link>
                      <Link to={`/dashboard/${a.code}/hq-map`}>🗺️ HQ Map</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </OwnerCard>
      </div>

      {/* Discord Settings Snapshot */}
      <div style={{ marginTop: 16 }}>
        <OwnerCard title="Discord Settings Snapshot (masked)" icon="📣">
          {discord.length === 0 ? (
            <div style={{ opacity: 0.75 }}>
              No discord settings rows found (or RLS blocked). Use <Link to="/dashboard/OWNER">Discord Settings</Link>.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10, maxWidth: 1100 }}>
              {discord.map((d, idx) => {
                const enabled = d.enabled !== false;
                const id = (d.alliance_id || `row_${idx}`).toUpperCase();
                const hasHook = !!d.webhook_url && String(d.webhook_url).trim() !== "";
                return (
                  <div
                    key={`${id}_${idx}`}
                    style={{ border: "1px solid #2a2a2a", borderRadius: 10, padding: 10 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 900 }}>{id}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {pill(enabled ? "Enabled" : "Disabled", enabled)}
                        {pill(hasHook ? "Webhook OK" : "Missing webhook", hasHook)}
                      </div>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                      Webhook: <code>{maskWebhook(d.webhook_url)}</code>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                      Role: <code>{d.role_id || "—"}</code>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 10 }}>
            <Link to="/dashboard/OWNER">Open full Discord settings →</Link>
          </div>
        </OwnerCard>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
        Direct link: <code>/owner</code>
      </div>
    </div>
  );
}
