$ErrorActionPreference = "Stop"

function Backup-File {
  param([string]$Path)
  if (-not (Test-Path $Path)) { throw "Missing file: $Path" }
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $backup = "$Path.bak-dossier-clean-$stamp"
  Copy-Item $Path $backup -Force
  Write-Host "Backup created: $backup"
}

# -------- MeDossierPage --------
$path = "src/pages/me/MeDossierPage.tsx"
Backup-File $path
@"
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
      setStatus("No player record linked yet (player_auth_links missing).");
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

    const ms = (mr.data || []) as any as Membership[];
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
    <div style={{ width: "100%", maxWidth: 1240, margin: "0 auto", display: "grid", gap: 12, padding: 16 }}>
      <div
        className="zombie-card"
        style={{
          padding: 18,
          background: "linear-gradient(180deg, rgba(16,20,26,0.98), rgba(8,10,14,0.94))",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 30, fontWeight: 950, lineHeight: 1.05 }}>My Dossier</div>
            <div style={{ opacity: 0.84, marginTop: 10, lineHeight: 1.7, maxWidth: 860 }}>
              Your identity, alliance memberships, Discord defaults, and quick access links.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" type="button" onClick={() => nav("/me")} style={{ padding: "10px 12px" }}>
              Back
            </button>
            <button className="zombie-btn" type="button" onClick={() => nav("/me/dossier-sheet")} style={{ padding: "10px 12px" }}>
              Print Sheet
            </button>
            <button className="zombie-btn" type="button" onClick={() => nav("/dashboard")} style={{ padding: "10px 12px" }}>
              Dashboard
            </button>
            <button className="zombie-btn" type="button" onClick={() => nav("/state/789")} style={{ padding: "10px 12px" }}>
              State 789
            </button>
          </div>
        </div>
      </div>

      {status ? (
        <div style={{ marginBottom: 0, border: "1px solid rgba(176,18,27,0.35)", background: "rgba(176,18,27,0.12)", borderRadius: 12, padding: 10 }}>
          {status}
        </div>
      ) : null}

      {loading ? <div style={{ opacity: 0.75 }}>Loading…</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12, alignItems: "start" }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>Operator Identity</div>
            <div style={{ opacity: 0.72, fontSize: 12 }}>LIVE</div>
          </div>

          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "110px 1fr", gap: 12, alignItems: "start" }}>
            <div
              style={{
                height: 110,
                width: 110,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "linear-gradient(180deg, rgba(176,18,27,0.20), rgba(0,0,0,0.35))"
              }}
            />
            <div>
              <div style={{ fontWeight: 950, fontSize: 18 }}>
                {s(player?.game_name || player?.name || "Unknown Operator")}
              </div>
              <div style={{ opacity: 0.75, marginTop: 6, fontSize: 12 }}>
                user_id: <code>{shortId(userId)}</code><br />
                player_id: <code>{shortId(playerId)}</code>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <button className="zombie-btn" type="button" onClick={() => nav("/me/dossier-sheet")}>Open Printable Sheet</button>
                <button className="zombie-btn" type="button" onClick={() => nav("/dashboard")}>Open Dashboard</button>
              </div>
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
              const base = `/dashboard/${encodeURIComponent(ac)}`;
              return (
                <div key={i} style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.18)", borderRadius: 14, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 950 }}>{ac} <span style={{ opacity: 0.75, fontWeight: 700 }}>({role || "member"})</span></div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="zombie-btn" type="button" onClick={() => nav(base)}>Open</button>
                      <button className="zombie-btn" type="button" onClick={() => nav(base + "/calendar")}>Calendar</button>
                      <button className="zombie-btn" type="button" onClick={() => nav(base + "/hq-map")}>HQ Map</button>
                      <button className="zombie-btn" type="button" onClick={() => nav(base + "/discord-webhooks")}>Webhooks</button>
                    </div>
                  </div>
                </div>
              );
            })}
            {!memberships.length ? <div style={{ opacity: 0.75 }}>No alliances yet.</div> : null}
          </div>
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>Discord Defaults</div>
          <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>
            These defaults power send-to-Discord actions.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {memberships.map((m, i) => {
              const ac = s(m.alliance_code).toUpperCase();
              const defaults = defaultsByAlliance[ac] || [];
              const get = (k: string) => defaults.find(d => s(d.kind) === k)?.webhook_id || null;

              return (
                <div key={i} style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.18)", borderRadius: 14, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 950 }}>{ac}</div>
                    <button className="zombie-btn" type="button" onClick={() => nav(`/dashboard/${encodeURIComponent(ac)}/discord-webhooks`)}>Manage</button>
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
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
            {!memberships.length ? <div style={{ opacity: 0.75 }}>No defaults — join an alliance first.</div> : null}
          </div>
        </div>
      </div>

      <WeeklyAgendaCard />
    </div>
  );
}
"@ | Set-Content -Encoding UTF8 $path

# -------- DossierSheetPage --------
$path = "src/pages/me/DossierSheetPage.tsx"
Backup-File $path
@"
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { resolveMyPlayerIdentity, listMyAllianceMemberships } from "../../lib/playerIdentity";
import { supabase } from "../../lib/supabaseClient";

function s(v: any) { return v === null || v === undefined ? "" : String(v); }
function nowLocal() { try { return new Date().toLocaleString(); } catch { return ""; } }

export default function DossierSheetPage() {
  const nav = useNavigate();

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState("");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [player, setPlayer] = useState<any | null>(null);
  const [memberships, setMemberships] = useState<any[]>([]);

  const [editGameName, setEditGameName] = useState("");
  const [editName, setEditName] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setStatus("");

      const id = await resolveMyPlayerIdentity();
      if (cancelled) return;

      setUserId(id.userId);
      setPlayerId(id.playerId);
      setPlayer(id.playerRow);

      if (id.playerRow) {
        setEditGameName(s(id.playerRow.game_name || id.playerRow.name));
        setEditName(s(id.playerRow.name || id.playerRow.game_name));
      }

      if (id.playerId) {
        const m = await listMyAllianceMemberships(id.playerId);
        if (!cancelled) setMemberships(m);
      }

      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, []);

  async function saveIdentity() {
    try {
      setStatus("");
      if (!playerId) {
        setStatus("No player id found.");
        return;
      }

      const patch: any = {
        name: s(editName).trim() || null,
        game_name: s(editGameName).trim() || null,
        updated_at: new Date().toISOString(),
      };

      const up = await supabase.from("players").update(patch).eq("id", playerId);
      if (up.error) {
        setStatus(up.error.message);
        return;
      }

      const fresh = await supabase.from("players").select("*").eq("id", playerId).maybeSingle();
      if (!fresh.error) setPlayer(fresh.data);
      setStatus("Saved ✅");
      window.setTimeout(() => setStatus(""), 900);
    } catch (e: any) {
      setStatus(String(e?.message || e || "Save failed"));
    }
  }

  function printSheet() {
    try { window.print(); } catch {}
  }

  return (
    <div style={{ width: "100%", maxWidth: 980, margin: "0 auto", display: "grid", gap: 12, padding: 16 }}>
      <div
        className="zombie-card"
        style={{
          padding: 18,
          background: "linear-gradient(180deg, rgba(16,20,26,0.98), rgba(8,10,14,0.94))",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 30, fontWeight: 950, lineHeight: 1.05 }}>My Dossier Sheet</div>
            <div style={{ opacity: 0.84, marginTop: 10, lineHeight: 1.7 }}>
              Printable version of your dossier.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" type="button" onClick={printSheet} style={{ padding: "10px 12px" }}>
              Print / Save PDF
            </button>
            <button className="zombie-btn" type="button" onClick={() => nav("/me/dossier")} style={{ padding: "10px 12px" }}>
              Back to My Dossier
            </button>
          </div>
        </div>
      </div>

      {loading ? <div style={{ opacity: 0.75 }}>Loading…</div> : null}

      {status ? (
        <div style={{ marginBottom: 0, border: "1px solid rgba(176,18,27,0.35)", background: "rgba(176,18,27,0.12)", borderRadius: 12, padding: 10 }}>
          {status}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 950, fontSize: 16 }}>Identity</div>
              <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>Generated: {nowLocal()}</div>
            </div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>
              user_id: <code>{userId || "(none)"}</code><br />
              player_id: <code>{playerId || "(none)"}</code>
            </div>
          </div>

          {!playerId ? (
            <div style={{ marginTop: 12, opacity: 0.8 }}>
              No player identity link found yet. Complete onboarding or ask Owner to approve + assign.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Display Name</div>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)", color: "rgba(255,255,255,0.92)" }}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Game Name</div>
                <input
                  value={editGameName}
                  onChange={(e) => setEditGameName(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)", color: "rgba(255,255,255,0.92)" }}
                />
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="zombie-btn" type="button" onClick={saveIdentity}>Save Identity</button>
                <div style={{ opacity: 0.7, fontSize: 12 }}>
                  If save fails, RLS is blocking edits.
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>Alliance Memberships</div>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
            Source: player_alliances
          </div>

          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {memberships.map((m: any, i: number) => (
              <div key={String(m.id || i)} style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.18)", borderRadius: 12, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>
                  {String(m.alliance_code || m.alliance_id || "Alliance")}
                  <span style={{ opacity: 0.7, fontWeight: 700 }}> • role: {String(m.role || "")}</span>
                </div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                  state_code: {String(m.state_code || "")} • created: {m.created_at ? new Date(String(m.created_at)).toLocaleString() : ""}
                </div>
              </div>
            ))}
            {!memberships.length ? <div style={{ opacity: 0.8 }}>No memberships found.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
"@ | Set-Content -Encoding UTF8 $path

# -------- PlayerDossierPage --------
$path = "src/pages/player/PlayerDossierPage.tsx"
Backup-File $path
@"
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

function s(v: any) { return v === null || v === undefined ? "" : String(v); }
function nowLocal() { try { return new Date().toLocaleString(); } catch { return ""; } }

type HqRow = {
  id?: string;
  profile_id?: string | null;
  player_id?: string | null;
  alliance_code?: string | null;
  alliance_id?: string | null;
  hq_name?: string | null;
  hq_level?: number | null;
  is_primary?: boolean | null;
  troop_type?: string | null;
  troop_tier?: string | null;
  troop_size?: number | null;
  march_size?: number | null;
  march_size_no_heroes?: number | null;
  rally_size?: number | null;
  coord_x?: number | null;
  coord_y?: number | null;
  updated_at?: string | null;
};

export default function PlayerDossierPage() {
  const nav = useNavigate();
  const params = useParams();
  const playerId = String((params as any)?.playerId || "");

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const [player, setPlayer] = useState<any | null>(null);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [hqRows, setHqRows] = useState<HqRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setStatus("");

      if (!playerId) {
        setStatus("Missing player id.");
        setLoading(false);
        return;
      }

      const p = await supabase.from("players").select("*").eq("id", playerId).maybeSingle();
      if (cancelled) return;

      if (p.error) {
        setStatus(p.error.message);
        setPlayer(null);
      } else {
        setPlayer(p.data || null);
      }

      const m = await supabase
        .from("player_alliances")
        .select("*")
        .eq("player_id", playerId)
        .order("alliance_code", { ascending: true });

      if (!cancelled) {
        if (m.error) setStatus((prev) => prev ? prev : m.error.message);
        setMemberships((m.data || []) as any[]);
      }

      let nextHqs: HqRow[] = [];

      try {
        const hqA = await supabase
          .from("player_alliance_hqs")
          .select("*")
          .eq("profile_id", playerId)
          .order("is_primary", { ascending: false })
          .order("updated_at", { ascending: false });

        if (!hqA.error && (hqA.data || []).length > 0) {
          nextHqs = (hqA.data || []) as HqRow[];
        } else {
          const hqB = await supabase
            .from("player_hqs")
            .select("*")
            .eq("profile_id", playerId)
            .order("updated_at", { ascending: false });

          if (!hqB.error) {
            nextHqs = (hqB.data || []) as HqRow[];
          }
        }
      } catch {
      }

      if (!cancelled) {
        setHqRows(nextHqs);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [playerId]);

  function printSheet() {
    try { window.print(); } catch {}
  }

  const primaryHq = hqRows.find((h) => h.is_primary === true) || hqRows[0] || null;

  return (
    <div style={{ width: "100%", maxWidth: 980, margin: "0 auto", display: "grid", gap: 12, padding: 16 }}>
      <div
        className="zombie-card"
        style={{
          padding: 18,
          background: "linear-gradient(180deg, rgba(16,20,26,0.98), rgba(8,10,14,0.94))",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 30, fontWeight: 950, lineHeight: 1.05 }}>Player Dossier Sheet</div>
            <div style={{ opacity: 0.84, marginTop: 10, lineHeight: 1.7 }}>
              Owner-visible player dossier and HQ summary.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" type="button" onClick={printSheet} style={{ padding: "10px 12px" }}>
              Print / Save PDF
            </button>
            <button className="zombie-btn" type="button" onClick={() => nav("/owner/dossier")} style={{ padding: "10px 12px" }}>
              Owner Lookup
            </button>
          </div>
        </div>
      </div>

      {loading ? <div style={{ opacity: 0.75 }}>Loading…</div> : null}

      {status ? (
        <div style={{ marginBottom: 0, border: "1px solid rgba(176,18,27,0.35)", background: "rgba(176,18,27,0.12)", borderRadius: 12, padding: 10 }}>
          {status}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 950, fontSize: 16 }}>Identity</div>
              <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>Generated: {nowLocal()}</div>
            </div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>
              player_id: <code>{playerId || "(none)"}</code>
            </div>
          </div>

          {!player ? (
            <div style={{ marginTop: 12, opacity: 0.8 }}>
              No player record visible.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Display Name</div>
                <div style={{ fontWeight: 900 }}>{s(player.name || "(none)")}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Game Name</div>
                <div style={{ fontWeight: 900 }}>{s(player.game_name || player.name || "(none)")}</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>Alliance Memberships</div>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>Source: player_alliances</div>

          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {memberships.map((m: any, i: number) => (
              <div key={String(m.id || i)} style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.18)", borderRadius: 12, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>
                  {String(m.alliance_code || m.alliance_id || "Alliance")}
                  <span style={{ opacity: 0.7, fontWeight: 700 }}> • role: {String(m.role || "")}</span>
                </div>
              </div>
            ))}
            {!memberships.length ? <div style={{ opacity: 0.8 }}>No memberships found.</div> : null}
          </div>
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>HQ Summary</div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>{hqRows.length} HQ row(s)</div>
          </div>

          {primaryHq ? (
            <div style={{ marginTop: 10, fontSize: 13, opacity: 0.9 }}>
              Primary HQ: <b>{s(primaryHq.hq_name || "HQ")}{primaryHq.hq_level ? ` • HQ ${s(primaryHq.hq_level)}` : ""}</b>
            </div>
          ) : null}

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {hqRows.map((h, i) => (
              <div key={String(h.id || i)} style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.18)", borderRadius: 12, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>
                  {h.is_primary ? "⭐ " : ""}
                  {s(h.hq_name || "HQ")}
                  {h.hq_level ? ` • HQ ${s(h.hq_level)}` : ""}
                </div>

                <div style={{ fontSize: 12, opacity: 0.78, marginTop: 6 }}>
                  Alliance: {s(h.alliance_code || h.alliance_id || "—")}
                  {h.troop_type ? ` • Type: ${s(h.troop_type)}` : ""}
                  {h.troop_tier ? ` • Tier: ${s(h.troop_tier)}` : ""}
                </div>

                <div style={{ fontSize: 12, opacity: 0.72, marginTop: 6 }}>
                  {h.coord_x != null && h.coord_y != null ? `Coords: ${s(h.coord_x)}, ${s(h.coord_y)}` : "Coords: —"}
                  {(h.march_size || h.march_size_no_heroes) ? ` • March: ${s(h.march_size || h.march_size_no_heroes)}` : ""}
                  {h.rally_size ? ` • Rally: ${s(h.rally_size)}` : ""}
                  {h.troop_size ? ` • Troops: ${s(h.troop_size)}` : ""}
                </div>
              </div>
            ))}
            {!hqRows.length ? <div style={{ opacity: 0.8 }}>No HQ rows found.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
"@ | Set-Content -Encoding UTF8 $path

Write-Host ""
Write-Host "Dossier pages cleaned."
Write-Host "Now run: npm run build"
