import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

function s(v: any) { return v === null || v === undefined ? "" : String(v); }
function shortId(x: string) { const t = s(x); return t ? (t.slice(0, 8) + "…" + t.slice(-6)) : ""; }

type Membership = { alliance_code: string; role: string | null };
type DefaultRow = { kind: string; webhook_id: string | null };
type WebhookRow = { id: string; label: string | null; active: boolean | null };

const KIND_LABELS: Record<string, string> = {
  announcements: "Announcements",
  alerts: "Alerts",
  ops: "Ops Feed",
  threads: "Threads",
  achievements: "Achievements",
};

export default function MeDossierPage() {
  const nav = useNavigate();

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [player, setPlayer] = useState<any>(null);

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [defaultsByAlliance, setDefaultsByAlliance] = useState<Record<string, DefaultRow[]>>({});
  const [webhooksByAlliance, setWebhooksByAlliance] = useState<Record<string, WebhookRow[]>>({});

  async function resolvePlayerId(uid: string): Promise<string> {
    const link = await supabase.from("player_auth_links").select("player_id").eq("user_id", uid).maybeSingle();
    const pid = s(link.data?.player_id);
    if (pid) return pid;

    const r = await supabase
      .from("players")
      .select("*")
      .eq("auth_user_id", uid)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    return s((r.data as any)?.id);
  }

  async function load() {
    setLoading(true);
    setStatus("");

    const me = await supabase.auth.getUser();
    const uid = s(me.data?.user?.id);
    if (!uid) {
      setLoading(false);
      setStatus("Not signed in.");
      return;
    }

    setUserId(uid);

    const pid = await resolvePlayerId(uid);
    setPlayerId(pid);

    if (!pid) {
      setLoading(false);
      setStatus("No player record linked yet.");
      return;
    }

    const pr = await supabase.from("players").select("*").eq("id", pid).maybeSingle();
    if (!pr.error) setPlayer(pr.data || null);

    const mr = await supabase
      .from("player_alliances")
      .select("alliance_code,role")
      .eq("player_id", pid)
      .order("alliance_code", { ascending: true });

    if (mr.error) {
      setLoading(false);
      setStatus(mr.error.message);
      return;
    }

    const ms = (mr.data || []) as Membership[];
    setMemberships(ms);

    const nextDefaults: Record<string, DefaultRow[]> = {};
    const nextHooks: Record<string, WebhookRow[]> = {};

    for (const m of ms) {
      const ac = s(m.alliance_code).toUpperCase();
      if (!ac) continue;

      const d = await supabase
        .from("alliance_discord_webhook_defaults")
        .select("kind,webhook_id")
        .eq("alliance_code", ac);

      if (!d.error) nextDefaults[ac] = (d.data || []) as DefaultRow[];

      const w = await supabase
        .from("alliance_discord_webhooks")
        .select("id,label,active")
        .eq("alliance_code", ac)
        .order("created_at", { ascending: false });

      if (!w.error) nextHooks[ac] = (w.data || []) as WebhookRow[];
    }

    setDefaultsByAlliance(nextDefaults);
    setWebhooksByAlliance(nextHooks);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  function labelForWebhook(allianceCode: string, webhookId: string | null): string {
    if (!webhookId) return "(none)";
    const list = webhooksByAlliance[allianceCode] || [];
    const hit = list.find((x) => s(x.id) === s(webhookId));
    const label = s(hit?.label);
    return label ? label : shortId(webhookId);
  }

  return (
    <div style={{ width: "100%", maxWidth: 1100, margin: "0 auto", display: "grid", gap: 12, padding: 16 }}>
      <div
        className="zombie-card"
        style={{
          padding: 20,
          background: "linear-gradient(180deg, rgba(16,20,26,0.98), rgba(8,10,14,0.94))",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 950, lineHeight: 1.05 }}>My Dossier</div>
            <div style={{ opacity: 0.84, marginTop: 10, lineHeight: 1.7 }}>
              Identity, memberships, and Discord defaults in one clean page.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" type="button" onClick={() => nav("/me")} style={{ padding: "10px 12px" }}>
              Back
            </button>
            <button className="zombie-btn" type="button" onClick={() => nav("/me/dossier-sheet")} style={{ padding: "10px 12px" }}>
              Print Sheet
            </button>
            <button className="zombie-btn" type="button" onClick={() => nav("/state/789")} style={{ padding: "10px 12px" }}>
              State 789
            </button>
          </div>
        </div>
      </div>

      {status ? (
        <div style={{ border: "1px solid rgba(176,18,27,0.35)", background: "rgba(176,18,27,0.12)", borderRadius: 12, padding: 10 }}>
          {status}
        </div>
      ) : null}

      {loading ? <div style={{ opacity: 0.75 }}>Loading…</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12, alignItems: "start" }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>Identity</div>
            <div style={{ opacity: 0.72, fontSize: 12 }}>LIVE</div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 950, fontSize: 18 }}>
              {s(player?.game_name || player?.name || "Unknown Player")}
            </div>
            <div style={{ opacity: 0.75, marginTop: 8, fontSize: 12, lineHeight: 1.6 }}>
              user_id: <code>{shortId(userId)}</code><br />
              player_id: <code>{shortId(playerId)}</code>
            </div>
          </div>
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>Alliance Memberships</div>
          <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>Source: player_alliances</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {memberships.map((m, i) => {
              const ac = s(m.alliance_code).toUpperCase();
              const role = s(m.role);
              return (
                <div key={i} style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.18)", borderRadius: 14, padding: 10 }}>
                  <div style={{ fontWeight: 950 }}>
                    {ac} <span style={{ opacity: 0.75, fontWeight: 700 }}>({role || "member"})</span>
                  </div>
                </div>
              );
            })}
            {!memberships.length ? <div style={{ opacity: 0.75 }}>No alliances yet.</div> : null}
          </div>
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12, gridColumn: "1 / -1" }}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>Discord Defaults</div>
          <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>
            These defaults power your alliance send actions.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {memberships.map((m, i) => {
              const ac = s(m.alliance_code).toUpperCase();
              const defaults = defaultsByAlliance[ac] || [];
              const get = (k: string) => defaults.find(d => s(d.kind) === k)?.webhook_id || null;

              return (
                <div key={i} style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.18)", borderRadius: 14, padding: 10 }}>
                  <div style={{ fontWeight: 950 }}>{ac}</div>

                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                    {Object.keys(KIND_LABELS).map((k) => (
                      <div key={k} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 8, background: "rgba(255,255,255,0.02)" }}>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>{KIND_LABELS[k]}</div>
                        <div style={{ fontWeight: 900, marginTop: 4 }}>
                          {labelForWebhook(ac, get(k))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {!memberships.length ? <div style={{ opacity: 0.75 }}>No defaults found.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
