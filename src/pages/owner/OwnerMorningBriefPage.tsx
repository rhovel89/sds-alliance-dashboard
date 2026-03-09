import React, { useEffect, useMemo, useState } from "react";
import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type AnyRow = any;

function s(v: any) {
  return v === null || v === undefined ? "" : String(v);
}

function norm(v: any) {
  return s(v).trim();
}

function normLower(v: any) {
  return norm(v).toLowerCase();
}

function getPlayerName(r: AnyRow): string {
  return norm(r?.player_name || r?.game_name || r?.player || r?.name || "Unknown");
}

function getAllianceCode(r: AnyRow): string {
  return norm(r?.alliance_code || r?.alliance || r?.alliance_name || "—").toUpperCase();
}

function getTypeName(
  r: AnyRow,
  typeNameById: Record<string, string>,
  optionNameById: Record<string, string>
): string {
  const direct = norm(
    r?.achievement_name ||
    r?.type_name ||
    r?.title ||
    r?.achievement ||
    r?.label ||
    r?.option_label ||
    r?.option_name
  );
  if (direct) return direct;

  const optionId = norm(r?.option_id);
  if (optionId && optionNameById[optionId]) return optionNameById[optionId];

  const typeId = norm(r?.achievement_type_id || r?.type_id);
  if (typeId && typeNameById[typeId]) return typeNameById[typeId];

  return norm(r?.kind || "Achievement");
}

function isPendingStatus(v: any) {
  const x = normLower(v);
  return x === "pending" || x === "submitted" || x === "review" || x === "in_review";
}

function isProgressStatus(v: any) {
  const x = normLower(v);
  return x === "in_progress" || x === "progress" || x === "tracking";
}

function isCompletedStatus(v: any) {
  const x = normLower(v);
  return x === "completed" || x === "complete" || x === "approved" || x === "done";
}

function parseDate(v: any): number | null {
  const t = Date.parse(String(v || ""));
  return Number.isFinite(t) ? t : null;
}

export default function OwnerMorningBriefPage() {
  const nav = useNavigate();
  const stateCode = "789";

  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);
  function onSelectModule(k: string) {
    const to = cc.find((m) => m.key === k)?.to;
    if (to) nav(to);
  }

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [briefTargetAlliance, setBriefTargetAlliance] = useState("WOC");
  const [briefWebhookId, setBriefWebhookId] = useState("");
  const [briefWebhooks, setBriefWebhooks] = useState<AnyRow[]>([]);
  const [sendingBrief, setSendingBrief] = useState(false);

  const [types, setTypes] = useState<AnyRow[]>([]);
  const [options, setOptions] = useState<AnyRow[]>([]);
  const [requests, setRequests] = useState<AnyRow[]>([]);
  const [queueRows, setQueueRows] = useState<AnyRow[]>([]);

  const typeNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of types) {
      const id = norm(t?.id);
      const name = norm(t?.name);
      if (id && name) m[id] = name;
    }
    return m;
  }, [types]);

  const optionNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const o of options) {
      const id = norm(o?.id);
      const label = norm(o?.label);
      if (id && label) m[id] = label;
    }
    return m;
  }, [options]);

  async function loadBriefWebhooks(allianceCode: string) {
    try {
      const a = String(allianceCode || "").trim().toUpperCase();
      if (!a) {
        setBriefWebhooks([]);
        setBriefWebhookId("");
        return;
      }

      const r = await supabase
        .from("alliance_discord_webhooks")
        .select("id, alliance_code, label, active")
        .eq("alliance_code", a)
        .eq("active", true)
        .order("label", { ascending: true });

      if (r.error) throw r.error;

      const rows = (r.data || []) as AnyRow[];
      setBriefWebhooks(rows);

      if (rows.length && !rows.some((x) => String(x?.id || "") === String(briefWebhookId || ""))) {
        setBriefWebhookId(String(rows[0]?.id || ""));
      }
      if (!rows.length) {
        setBriefWebhookId("");
      }
    } catch {
      setBriefWebhooks([]);
      setBriefWebhookId("");
    }
  }

  async function loadAll() {
    try {
      setLoading(true);
      setStatus("");

      const t = await supabase
        .from("state_achievement_types")
        .select("*")
        .eq("state_code", stateCode)
        .order("name", { ascending: true });

      if (t.error) throw t.error;
      const tData = (t.data || []) as AnyRow[];
      setTypes(tData);

      const typeIds = tData.map((x) => x?.id).filter(Boolean);
      if (typeIds.length > 0) {
        const op = await supabase
          .from("state_achievement_options")
          .select("*")
          .in("achievement_type_id", typeIds)
          .order("sort", { ascending: true })
          .order("label", { ascending: true });

        if (!op.error) setOptions((op.data || []) as AnyRow[]);
        else setOptions([]);
      } else {
        setOptions([]);
      }

      const r = await supabase
        .from("state_achievement_requests")
        .select("*")
        .eq("state_code", stateCode)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (r.error) throw r.error;
      setRequests((r.data || []) as AnyRow[]);

      const q = await supabase
        .from("discord_send_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (!q.error) setQueueRows((q.data || []) as AnyRow[]);
      else setQueueRows([]);
    } catch (e: any) {
      setStatus(String(e?.message || e || "Load failed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    void loadBriefWebhooks(briefTargetAlliance);
  }, [briefTargetAlliance]);

  const now = Date.now();
  const last24h = now - 24 * 60 * 60 * 1000;

  const pendingRows = useMemo(
    () => requests.filter((r) => isPendingStatus(r?.status)).slice(0, 25),
    [requests]
  );

  const completed24h = useMemo(
    () =>
      requests
        .filter((r) => {
          if (!isCompletedStatus(r?.status)) return false;
          const ts =
            parseDate(r?.completed_at) ??
            parseDate(r?.updated_at) ??
            parseDate(r?.created_at);
          return ts !== null && ts >= last24h;
        })
        .slice(0, 25),
    [requests, last24h]
  );

  const failedQueueRows = useMemo(
    () => queueRows.filter((r) => normLower(r?.status) === "failed").slice(0, 20),
    [queueRows]
  );

  const allianceSummary = useMemo(() => {
    const m: Record<string, { pending: number; progress: number; completed24h: number; total: number }> = {};

    for (const r of requests) {
      const a = getAllianceCode(r) || "—";
      if (!m[a]) m[a] = { pending: 0, progress: 0, completed24h: 0, total: 0 };
      m[a].total += 1;
      if (isPendingStatus(r?.status)) m[a].pending += 1;
      if (isProgressStatus(r?.status)) m[a].progress += 1;

      if (isCompletedStatus(r?.status)) {
        const ts =
          parseDate(r?.completed_at) ??
          parseDate(r?.updated_at) ??
          parseDate(r?.created_at);
        if (ts !== null && ts >= last24h) m[a].completed24h += 1;
      }
    }

    return Object.entries(m)
      .map(([alliance, stats]) => ({ alliance, ...stats }))
      .sort((a, b) => a.alliance.localeCompare(b.alliance));
  }, [requests, last24h]);

  const closestToFinishing = useMemo(() => {
    const rows: AnyRow[] = [];

    for (const t of types) {
      const requiredCount = Number(t?.required_count || 0);
      if (!requiredCount || requiredCount <= 1) continue;

      const typeId = norm(t?.id);
      const typeName = norm(t?.name || "Achievement");
      const byPlayer: Record<string, { player: string; alliance: string; count: number }> = {};

      for (const r of requests) {
        const player = getPlayerName(r);
        const alliance = getAllianceCode(r);
        const rTypeId = norm(r?.achievement_type_id || r?.type_id);
        const rTypeName = getTypeName(r, typeNameById, optionNameById);

        const matches = (typeId && rTypeId === typeId) || (!typeId && rTypeName === typeName);
        if (!matches) continue;
        if (!isCompletedStatus(r?.status)) continue;

        const pk = [player, alliance].join("||");
        if (!byPlayer[pk]) byPlayer[pk] = { player, alliance, count: 0 };
        byPlayer[pk].count += 1;
      }

      for (const v of Object.values(byPlayer)) {
        if (v.count >= requiredCount) continue;
        rows.push({
          player: v.player,
          alliance: v.alliance,
          typeName,
          count: v.count,
          requiredCount,
          missing: requiredCount - v.count,
        });
      }
    }

    return rows.sort((a, b) => {
      if (a.missing !== b.missing) return a.missing - b.missing;
      return a.player.localeCompare(b.player);
    }).slice(0, 25);
  }, [requests, types, typeNameById, optionNameById]);

  const summary = useMemo(() => {
    const pendingCount = requests.filter((r) => isPendingStatus(r?.status)).length;
    const completed24hCount = requests.filter((r) => {
      if (!isCompletedStatus(r?.status)) return false;
      const ts =
        parseDate(r?.completed_at) ??
        parseDate(r?.updated_at) ??
        parseDate(r?.created_at);
      return ts !== null && ts >= last24h;
    }).length;
    const failedCount = queueRows.filter((r) => normLower(r?.status) === "failed").length;
    const activeAlliances = allianceSummary.filter((x) => x.total > 0).length;

    return {
      pendingCount,
      completed24hCount,
      failedCount,
      activeAlliances,
    };
  }, [requests, queueRows, allianceSummary, last24h]);


  function buildMorningBriefMessage() {
    const topPending = pendingRows.slice(0, 5).map((r) => `• ${getPlayerName(r)} — ${getTypeName(r, typeNameById, optionNameById)}`);
    const topCompleted = completed24h.slice(0, 5).map((r) => `• ${getPlayerName(r)} — ${getTypeName(r, typeNameById, optionNameById)}`);
    const failedTop = failedQueueRows.slice(0, 3).map((r) => `• ${norm(r?.kind || "queue")} — ${norm(r?.status_detail || "Unknown failure")}`);

    const parts: string[] = [
      `🌅 **State ${stateCode} — Morning Brief**`,
      `Alliance Target: **${briefTargetAlliance}**`,
      `Pending Now: **${summary.pendingCount}**`,
      `Completed Last 24h: **${summary.completed24hCount}**`,
      `Failed Discord Sends: **${summary.failedCount}**`,
      `Active Alliances: **${summary.activeAlliances}**`,
    ];

    if (topPending.length) parts.push("", "📝 **New Pending**", ...topPending);
    if (topCompleted.length) parts.push("", "✅ **Completed Last 24h**", ...topCompleted);
    if (failedTop.length) parts.push("", "🚨 **Discord Failures**", ...failedTop);

    return parts.join("\n");
  }

  async function sendMorningBriefToDiscord() {
    try {
      const allianceCode = String(briefTargetAlliance || "").trim().toUpperCase();
      if (!allianceCode) {
        setStatus("Pick a target alliance first.");
        return;
      }

      setSendingBrief(true);
      setStatus("Queueing Morning Brief…");

      const message = buildMorningBriefMessage();

      const q = await supabase.rpc("queue_discord_send" as any, {
        p_kind: "discord_webhook",
        p_target: "alliance:" + allianceCode,
        p_channel_id: String(briefWebhookId || "default:announcements"),
        p_content: message,
        p_meta: {
          kind: "morning_brief",
          source: "OwnerMorningBriefPage",
          state_code: stateCode,
          alliance_code: allianceCode,
          webhook_id: String(briefWebhookId || ""),
        },
      });

      if (q.error) throw q.error;

      setStatus("Morning Brief queued ✅");
    } catch (e: any) {
      setStatus("Morning Brief failed: " + String(e?.message || e || "send failed"));
    } finally {
      setSendingBrief(false);
    }
  }
  return (
    <CommandCenterShell
      title="Owner • Morning Brief"
      subtitle="Daily operational snapshot for achievements, activity, and Discord health"
      modules={modules}
      activeModuleKey="owner"
      onSelectModule={onSelectModule}
      topRight={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/state-achievements")}>
            Achievements
          </button>
          <select
            value={briefTargetAlliance}
            onChange={(e) => setBriefTargetAlliance(String(e.target.value || "WOC"))}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(255,255,255,0.92)"
            }}
          >
            {allianceSummary.map((a) => (
              <option key={a.alliance} value={a.alliance}>{a.alliance}</option>
            ))}
          </select>
          <select
            value={briefWebhookId}
            onChange={(e) => setBriefWebhookId(String(e.target.value || ""))}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(255,255,255,0.92)"
            }}
          >
            <option value="">Alliance Default Channel</option>
            {briefWebhooks.map((w) => (
              <option key={String(w?.id || "")} value={String(w?.id || "")}>
                {String(w?.label || w?.id || "Webhook")}
              </option>
            ))}
          </select>
          <button className="zombie-btn" type="button" onClick={() => void sendMorningBriefToDiscord()} disabled={loading || sendingBrief}>
            Send Brief → Discord
          </button>
          <button className="zombie-btn" type="button" onClick={() => void loadAll()} disabled={loading}>
            Refresh
          </button>
        </div>
      }
    >
      {status ? (
        <div style={{ marginBottom: 10, border: "1px solid rgba(176,18,27,0.35)", background: "rgba(176,18,27,0.12)", borderRadius: 12, padding: 10 }}>
          {status}
        </div>
      ) : null}

      {loading ? <div style={{ opacity: 0.8, marginBottom: 12 }}>Loading…</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(180px, 1fr))", gap: 12 }}>
        {[
          { label: "Pending Now", value: summary.pendingCount },
          { label: "Completed Last 24h", value: summary.completed24hCount },
          { label: "Failed Discord Sends", value: summary.failedCount },
          { label: "Active Alliances", value: summary.activeAlliances },
        ].map((x) => (
          <div key={x.label} style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
            <div style={{ opacity: 0.72, fontSize: 12 }}>{x.label}</div>
            <div style={{ fontWeight: 950, fontSize: 28, marginTop: 6 }}>{x.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12, marginTop: 14 }}>
        <section style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, marginBottom: 8 }}>New Pending Achievements</div>
          <div style={{ display: "grid", gap: 8 }}>
            {pendingRows.length === 0 ? <div style={{ opacity: 0.7 }}>No pending rows.</div> : pendingRows.map((r, i) => (
              <div key={String(r?.id || i)} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>{getPlayerName(r)}</div>
                <div style={{ fontSize: 12, opacity: 0.78, marginTop: 4 }}>
                  {getAllianceCode(r)} • {getTypeName(r, typeNameById, optionNameById)} • {norm(r?.status || "pending")}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, marginBottom: 8 }}>Completed in Last 24 Hours</div>
          <div style={{ display: "grid", gap: 8 }}>
            {completed24h.length === 0 ? <div style={{ opacity: 0.7 }}>No recent completions.</div> : completed24h.map((r, i) => (
              <div key={String(r?.id || i)} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>{getPlayerName(r)}</div>
                <div style={{ fontSize: 12, opacity: 0.78, marginTop: 4 }}>
                  {getAllianceCode(r)} • {getTypeName(r, typeNameById, optionNameById)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
        <section style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, marginBottom: 8 }}>Players Closest to Finishing Key Types</div>
          <div style={{ display: "grid", gap: 8 }}>
            {closestToFinishing.length === 0 ? <div style={{ opacity: 0.7 }}>No near-completion players found.</div> : closestToFinishing.map((r, i) => (
              <div key={i} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>{r.player}</div>
                <div style={{ fontSize: 12, opacity: 0.78, marginTop: 4 }}>
                  {r.alliance} • {r.typeName} • {r.count}/{r.requiredCount} • missing {r.missing}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, marginBottom: 8 }}>Failed Discord Sends</div>
          <div style={{ display: "grid", gap: 8 }}>
            {failedQueueRows.length === 0 ? <div style={{ opacity: 0.7 }}>No failed sends.</div> : failedQueueRows.map((r, i) => (
              <div key={String(r?.id || i)} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>{norm(r?.kind || "queue")}</div>
                <div style={{ fontSize: 12, opacity: 0.78, marginTop: 4 }}>
                  {norm(r?.target || r?.channel_name || "—")}
                </div>
                <div style={{ fontSize: 12, opacity: 0.72, marginTop: 4 }}>
                  {norm(r?.status_detail || "Unknown error")}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section style={{ marginTop: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
        <div style={{ fontWeight: 950, marginBottom: 8 }}>Alliance Activity Summary</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          {allianceSummary.length === 0 ? <div style={{ opacity: 0.7 }}>No alliance activity found.</div> : allianceSummary.map((a) => (
            <div key={a.alliance} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 10 }}>
              <div style={{ fontWeight: 900 }}>{a.alliance}</div>
              <div style={{ fontSize: 12, opacity: 0.78, marginTop: 6 }}>Pending: {a.pending}</div>
              <div style={{ fontSize: 12, opacity: 0.78 }}>In Progress: {a.progress}</div>
              <div style={{ fontSize: 12, opacity: 0.78 }}>Completed 24h: {a.completed24h}</div>
              <div style={{ fontSize: 12, opacity: 0.62, marginTop: 4 }}>Total rows: {a.total}</div>
            </div>
          ))}
        </div>
      </section>
    </CommandCenterShell>
  );
}


