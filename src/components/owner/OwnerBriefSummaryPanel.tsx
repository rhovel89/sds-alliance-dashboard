import React, { useEffect, useMemo, useState } from "react";
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

function getPlayerName(r: AnyRow): string {
  return norm(r?.player_name || r?.game_name || r?.player || r?.name || "Unknown");
}

function getAllianceCode(r: AnyRow): string {
  return norm(r?.alliance_code || r?.alliance || r?.alliance_name || "—").toUpperCase();
}

export default function OwnerBriefSummaryPanel(props: { stateCode?: string }) {
  const nav = useNavigate();
  const stateCode = norm(props.stateCode || "789");
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<AnyRow[]>([]);
  const [queueRows, setQueueRows] = useState<AnyRow[]>([]);

  async function loadAll() {
    try {
      setLoading(true);

      const r = await supabase
        .from("state_achievement_requests")
        .select("*")
        .eq("state_code", stateCode)
        .order("created_at", { ascending: false })
        .limit(500);

      if (!r.error) setRequests((r.data || []) as AnyRow[]);

      const q = await supabase
        .from("discord_send_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!q.error) setQueueRows((q.data || []) as AnyRow[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, [stateCode]);

  const now = Date.now();
  const last24h = now - 24 * 60 * 60 * 1000;

  const summary = useMemo(() => {
    const pendingCount = requests.filter((r) => isPendingStatus(r?.status)).length;
    const progressCount = requests.filter((r) => isProgressStatus(r?.status)).length;
    const completed24hCount = requests.filter((r) => {
      if (!isCompletedStatus(r?.status)) return false;
      const ts = parseDate(r?.completed_at) ?? parseDate(r?.updated_at) ?? parseDate(r?.created_at);
      return ts !== null && ts >= last24h;
    }).length;
    const failedCount = queueRows.filter((r) => normLower(r?.status) === "failed").length;

    const alliances = new Set<string>();
    for (const r of requests) {
      const a = getAllianceCode(r);
      if (a) alliances.add(a);
    }

    return {
      pendingCount,
      progressCount,
      completed24hCount,
      failedCount,
      allianceCount: alliances.size,
    };
  }, [requests, queueRows, last24h]);

  const recentPending = useMemo(
    () => requests.filter((r) => isPendingStatus(r?.status)).slice(0, 6),
    [requests]
  );

  const recentCompleted = useMemo(
    () => requests.filter((r) => {
      if (!isCompletedStatus(r?.status)) return false;
      const ts = parseDate(r?.completed_at) ?? parseDate(r?.updated_at) ?? parseDate(r?.created_at);
      return ts !== null && ts >= last24h;
    }).slice(0, 6),
    [requests, last24h]
  );

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {loading ? <div style={{ opacity: 0.7 }}>Loading summary…</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
  <button
    className="zombie-btn"
    type="button"
    style={{ textAlign: "left", whiteSpace: "normal" }}
    onClick={() => nav("/owner/state-achievements?status=pending")}
  >
    <div style={{ opacity: 0.72, fontSize: 12 }}>Pending Now</div>
    <div style={{ fontWeight: 950, fontSize: 26, marginTop: 6 }}>{summary.pendingCount}</div>
  </button>

  <button
    className="zombie-btn"
    type="button"
    style={{ textAlign: "left", whiteSpace: "normal" }}
    onClick={() => nav("/owner/state-achievements?status=in_progress")}
  >
    <div style={{ opacity: 0.72, fontSize: 12 }}>In Progress</div>
    <div style={{ fontWeight: 950, fontSize: 26, marginTop: 6 }}>{summary.progressCount}</div>
  </button>

  <button
    className="zombie-btn"
    type="button"
    style={{ textAlign: "left", whiteSpace: "normal" }}
    onClick={() => nav("/owner/state-achievements?status=completed")}
  >
    <div style={{ opacity: 0.72, fontSize: 12 }}>Completed 24h</div>
    <div style={{ fontWeight: 950, fontSize: 26, marginTop: 6 }}>{summary.completed24hCount}</div>
  </button>

  <button
    className="zombie-btn"
    type="button"
    style={{ textAlign: "left", whiteSpace: "normal" }}
    onClick={() => nav("/owner/queue-health?status=failed")}
  >
    <div style={{ opacity: 0.72, fontSize: 12 }}>Discord Failures</div>
    <div style={{ fontWeight: 950, fontSize: 26, marginTop: 6 }}>{summary.failedCount}</div>
  </button>

  <button
    className="zombie-btn"
    type="button"
    style={{ textAlign: "left", whiteSpace: "normal" }}
    onClick={() => nav("/owner/morning-brief")}
  >
    <div style={{ opacity: 0.72, fontSize: 12 }}>Active Alliances</div>
    <div style={{ fontWeight: 950, fontSize: 26, marginTop: 6 }}>{summary.allianceCount}</div>
  </button>
</div>
            <div style={{ fontWeight: 950, fontSize: 26, marginTop: 6 }}>{x.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Recent Pending</div>
          <div style={{ display: "grid", gap: 8 }}>
            {recentPending.length === 0 ? <div style={{ opacity: 0.7 }}>No pending rows.</div> : recentPending.map((r, i) => (
              <div key={String(r?.id || i)} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 10 }}>
                <div style={{ fontWeight: 800 }}>{getPlayerName(r)}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>{getAllianceCode(r)} • {norm(r?.status || "pending")}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Completed Last 24h</div>
          <div style={{ display: "grid", gap: 8 }}>
            {recentCompleted.length === 0 ? <div style={{ opacity: 0.7 }}>No recent completions.</div> : recentCompleted.map((r, i) => (
              <div key={String(r?.id || i)} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 10 }}>
                <div style={{ fontWeight: 800 }}>{getPlayerName(r)}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>{getAllianceCode(r)} • completed</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

