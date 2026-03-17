import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";
import { supabase } from "../../lib/supabaseClient";
import WeeklyAgendaCard from "../../components/dashboard/WeeklyAgendaCard";

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

  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);
  function onSelectModule(k: string) { const to = cc.find((m) => m.key === k)?.to; if (to) nav(to); }

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [player, setPlayer] = useState<any>(null);

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [defaultsByAlliance, setDefaultsByAlliance] = useState<Record<string, DefaultRow[]>>({});
  const [webhooksByAlliance, setWebhooksByAlliance] = useState<Record<string, WebhookRow[]>>({});

  async function resolvePlayerId(uid: string): Promise<string> {
    // canonical: player_auth_links
    const link = await supabase.from("player_auth_links").select("player_id").eq("user_id", uid).maybeSingle();
    const pid = s(link.data?.player_id);
    if (pid) return pid;

    // fallback: oldest players row by auth_user_id (schema-safe)
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
    if (!uid) { setLoading(false); setStatus("Not signed in."); return; }

    setUserId(uid);

    const pid = await resolvePlayerId(uid);
    setPlayerId(pid);

    if (!pid) { setLoading(false); setStatus("No player record linked yet (player_auth_links missing)."); return; }

    // Player record (schema-safe)
    const pr = await supabase.from("players").select("*").eq("id", pid).maybeSingle();
    if (!pr.error) setPlayer(pr.data || null);

    // Memberships
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

    const ms = (mr.data || []) as any as Membership[];
    setMemberships(ms);

    // Per-alliance defaults + webhook labels
    const nextDefaults: Record<string, DefaultRow[]> = {};
    const nextHooks: Record<string, WebhookRow[]> = {};

    for (const m of ms) {
      const ac = s(m.alliance_code).toUpperCase();
      if (!ac) continue;

      const d = await supabase
        .from("alliance_discord_webhook_defaults")
        .select("kind,webhook_id")
        .eq("alliance_code", ac);

      if (!d.error) nextDefaults[ac] = (d.data || []) as any as DefaultRow[];

      const w = await supabase
        .from("alliance_discord_webhooks")
        .select("id,label,active")
        .eq("alliance_code", ac)
        .order("created_at", { ascending: false });

      if (!w.error) nextHooks[ac] = (w.data || []) as any as WebhookRow[];
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
    <CommandCenterShell
      title="My Dossier"
      subtitle="Overview • memberships • Discord defaults • quick links"
      modules={modules}
      activeModuleKey="dossier"
      onSelectModule={onSelectModule}
      topRight={
        <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => nav("/me")}>Back</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/me/dossier-sheet")}>Print Sheet</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/dashboard")}>Dashboard</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/state/789")}>State 789</button>
        </div>
      }
    >
      {status ? (
        <div style={{ marginBottom: 10, border:"1px solid rgba(176,18,27,0.35)", background:"rgba(176,18,27,0.12)", borderRadius: 12, padding: 10 }}>
          {status}
        </div>
      ) : null}

      {loading ? <div style={{ opacity: 0.75 }}>Loading…</div> : null}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))", gap: 12, alignItems:"start" }}>
        {/* Identity card */}
        <div style={{ border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", gap: 10, alignItems:"center" }}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>🧟 CASE FILE — Operator</div>
            <div style={{ opacity: 0.72, fontSize: 12 }}>CLASSIFIED</div>
          </div>

          <div style={{ marginTop: 10, display:"grid", gridTemplateColumns:"110px 1fr", gap: 12, alignItems:"start" }}>
            <div style={{
              height: 110, width: 110, borderRadius: 14,
              border:"1px solid rgba(255,255,255,0.12)",
              background:"linear-gradient(180deg, rgba(176,18,27,0.20), rgba(0,0,0,0.35))"
            }} />
            <div>
              <div style={{ fontWeight: 950, fontSize: 18 }}>
                {s(player?.game_name || player?.name || "Unknown Operator")}
              </div>
              <div style={{ opacity: 0.75, marginTop: 6, fontSize: 12 }}>
                user_id: <code>{shortId(userId)}</code><br />
                player_id: <code>{shortId(playerId)}</code>
              </div>
              <div style={{ display:"flex", gap: 8, flexWrap:"wrap", marginTop: 10 }}>
                <button className="zombie-btn" type="button" onClick={() => nav("/me")}>Open /me</button>
                <button className="zombie-btn" type="button" onClick={() => nav("/dashboard")}>Open /dashboard</button>
              </div>
            </div>
          </div>
        </div>

        {/* Memberships */}
        <div style={{ border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>🪖 Alliances (Multi)</div>
          <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>RLS enforces access. This panel reflects your membership rows.</div>

          <div style={{ display:"flex", flexDirection:"column", gap: 10, marginTop: 10 }}>
            {memberships.map((m, i) => {
              const ac = s(m.alliance_code).toUpperCase();
              const role = s(m.role);
              const base = `/dashboard/${encodeURIComponent(ac)}`;
              return (
                <div key={i} style={{ border:"1px solid rgba(255,255,255,0.08)", background:"rgba(0,0,0,0.18)", borderRadius: 14, padding: 10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", gap: 10, flexWrap:"wrap", alignItems:"center" }}>
                    <div>
                      <div style={{ fontWeight: 950 }}>{ac} <span style={{ opacity: 0.75, fontWeight: 700 }}>({role || "member"})</span></div>
                      <div style={{ opacity: 0.70, fontSize: 12, marginTop: 4 }}>
                        Quick lanes: dashboard • calendar • hq • webhooks
                      </div>
                    </div>
                    <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
                      <button className="zombie-btn" type="button" onClick={() => nav(base)}>Open</button>
                      <button className="zombie-btn" type="button" onClick={() => nav(base + "/calendar")}>Calendar</button>
                      <button className="zombie-btn" type="button" onClick={() => nav(base + "/hq-map")}>HQ Map</button>
                      <button className="zombie-btn" type="button" onClick={() => nav(base + "/discord-webhooks")}>Webhooks</button>
                    </div>
                  </div>
                </div>
              );
            })}
            {!memberships.length ? <div style={{ opacity: 0.75 }}>No alliances yet. Complete onboarding + approval.</div> : null}
          </div>
        </div>

        {/* Defaults overview */}
        <div style={{ border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>🪝 Discord Defaults (Per Alliance)</div>
          <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>
            These defaults power “Send to Discord (Default)” actions.
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap: 10, marginTop: 10 }}>
            {memberships.map((m, i) => {
              const ac = s(m.alliance_code).toUpperCase();
              const defaults = defaultsByAlliance[ac] || [];
              const get = (k: string) => defaults.find(d => s(d.kind) === k)?.webhook_id || null;

              return (
                <div key={i} style={{ border:"1px solid rgba(255,255,255,0.08)", background:"rgba(0,0,0,0.18)", borderRadius: 14, padding: 10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap: 10, flexWrap:"wrap" }}>
                    <div style={{ fontWeight: 950 }}>{ac}</div>
                    <button className="zombie-btn" type="button" onClick={() => nav(`/dashboard/${encodeURIComponent(ac)}/discord-webhooks`)}>Manage</button>
                  </div>

                  <div style={{ marginTop: 10, display:"grid", gridTemplateColumns:"1fr 1fr", gap: 8 }}>
                    {Object.keys(KIND_LABELS).map((k) => (
                      <div key={k} style={{ border:"1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 8, background:"rgba(255,255,255,0.02)" }}>
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
            {!memberships.length ? <div style={{ opacity: 0.75 }}>No defaults — join an alliance first.</div> : null}
          </div>
        </div>
      </div>
          <WeeklyAgendaCard />
    </CommandCenterShell>
  );
}


