import React, { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { supabase } from "../../lib/supabaseClient";
import StateDiscordChannelSelect from "../discord/StateDiscordChannelSelect";

type AnyRow = Record<string, any>;
const U = (v: any) => String(v ?? "").trim().toUpperCase();
const L = (v: any) => String(v ?? "").trim().toLowerCase();

function pickAlliance(r: AnyRow) {
  return r?.alliance_code ?? r?.alliance_tag ?? r?.alliance ?? r?.alliance_name ?? r?.tag ?? "";
}
function pickStatus(r: AnyRow) {
  return r?.status ?? r?.request_status ?? r?.approval_status ?? r?.state ?? "";
}
function pickPlayer(r: AnyRow) {
  return r?.player_name ?? r?.game_name ?? r?.name ?? "";
}
function isDone(st: any) {
  const s = L(st);
  return s === "completed" || s === "approved" || s === "done";
}
function tsLabel() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export default function StateAchievementsIntelRail(props: {
  stateCode: string;
  activeFilterAlliance: string;
  requests: AnyRow[];
}) {
  const stateCode = String(props.stateCode || "").trim();
  const activeFilter = U(props.activeFilterAlliance || "ALL");
  const allRequests = Array.isArray(props.requests) ? props.requests : [];

  const [scope, setScope] = useState<string>("CURRENT"); // CURRENT | ALL | alliance code/tag
  const [channelId, setChannelId] = useState<string>("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const captureRef = useRef<HTMLDivElement | null>(null);

  // auto-load owner default reports channel
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await supabase
          .from("state_discord_defaults")
          .select("reports_channel_id")
          .eq("state_code", stateCode)
          .maybeSingle();

        const cid = String((d.data as any)?.reports_channel_id ?? "").trim();
        if (!cancelled && cid && !String(channelId || "").trim()) setChannelId(cid);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [stateCode]);

  const allianceOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of allRequests) {
      const a = U(pickAlliance(r));
      if (a) s.add(a);
    }
    return ["ALL", ...Array.from(s).sort((a,b)=>a.localeCompare(b))];
  }, [allRequests]);

  const reportAlliance = useMemo(() => {
    if (scope === "CURRENT") return activeFilter || "ALL";
    if (scope === "ALL") return "ALL";
    return U(scope || "ALL");
  }, [scope, activeFilter]);

  const scoped = useMemo(() => {
    const a = U(reportAlliance || "ALL");
    if (a === "ALL") return allRequests;
    return allRequests.filter(r => U(pickAlliance(r)) === a);
  }, [allRequests, reportAlliance]);

  const completed = useMemo(() => scoped.filter(r => isDone(pickStatus(r))), [scoped]);

  const leaderboard = useMemo(() => {
    const m = new Map<string, { a: string; c: number; t: number }>();
    for (const r of scoped) {
      const a = U(pickAlliance(r) || "UNKNOWN");
      if (!m.has(a)) m.set(a, { a, c: 0, t: 0 });
      const row = m.get(a)!;
      row.t++;
      if (isDone(pickStatus(r))) row.c++;
    }
    return Array.from(m.values()).sort((x,y)=> (y.c-x.c) || (y.t-x.t) || x.a.localeCompare(y.a)).slice(0,10);
  }, [scoped]);

  const recentDone = useMemo(() => {
    const rows = completed.slice();
    rows.sort((a,b)=> (Date.parse(String(b.updated_at ?? b.created_at ?? 0))||0) - (Date.parse(String(a.updated_at ?? a.created_at ?? 0))||0));
    return rows.slice(0,10);
  }, [completed]);

  function ReportView() {
    return (
      <div style={{
        width: 900,
        padding: 24,
        borderRadius: 18,
        border: "2px solid rgba(176,21,38,0.55)",
        background: "linear-gradient(180deg, rgba(10,10,10,1), rgba(0,0,0,1))",
        color: "white",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial"
      }}>
        <div style={{ fontSize: 14, letterSpacing: "0.14em", opacity: 0.8, fontWeight: 950 }}>EMERGENCY BROADCAST</div>
        <div style={{ fontSize: 28, fontWeight: 950, marginTop: 10 }}>STATE {stateCode} — ACHIEVEMENT REPORT</div>
        <div style={{ opacity: 0.8, marginTop: 6 }}>Scope: <b>{reportAlliance}</b> • Generated: {new Date().toLocaleString()}</div>

        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14 }}>
            <div style={{ fontWeight: 950 }}>Summary</div>
            <div style={{ marginTop: 10, opacity: 0.85 }}>
              Total: <b>{scoped.length}</b><br/>
              Completed: <b>{completed.length}</b><br/>
              Other: <b>{Math.max(0, scoped.length - completed.length)}</b>
            </div>
          </div>

          <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14 }}>
            <div style={{ fontWeight: 950 }}>Top Alliances</div>
            <div style={{ marginTop: 8 }}>
              {leaderboard.map((r) => (
                <div key={r.a} style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <div style={{ fontWeight: 900 }}>{r.a}</div>
                  <div style={{ opacity: 0.85 }}>{r.c}/{r.t}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14 }}>
          <div style={{ fontWeight: 950 }}>Recent Completions</div>
          <div style={{ marginTop: 8 }}>
            {recentDone.map((r, i) => (
              <div key={String(r.id || i)} style={{ marginTop: 8 }}>
                <div><b>{String(pickPlayer(r) || "Unknown")}</b> <span style={{ opacity: 0.75 }}>({U(pickAlliance(r) || "UNKNOWN")})</span></div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>status: {String(pickStatus(r) || "")}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 14, opacity: 0.65, fontSize: 12 }}>
          Generated by State Alliance Dashboard • RLS enforced • Do not share outside leadership.
        </div>
      </div>
    );
  }

  async function exportAndQueue() {
    setBusy(true);
    setMsg("");
    try {
      if (!captureRef.current) throw new Error("Report capture not mounted.");

      const dataUrl = await toPng(captureRef.current, { cacheBust: true, pixelRatio: 2 });
      const blob = await (await fetch(dataUrl)).blob();

      const name = `state-${stateCode}/achievements-report-${reportAlliance}-${tsLabel()}.png`;
      const up = await supabase.storage.from("exports").upload(name, blob, { contentType: "image/png", upsert: true });
      if (up.error) throw up.error;

      const pub = supabase.storage.from("exports").getPublicUrl(name);
      const url = pub?.data?.publicUrl;
      if (!url) throw new Error("Public URL missing (exports bucket must be public).");

      const text =
        `🩸 **STATE ${stateCode} — ACHIEVEMENT REPORT**\n` +
        `Scope: **${reportAlliance}**\n` +
        `Generated: ${new Date().toLocaleString()}\n` +
        url;

      const q = await supabase.rpc("queue_discord_send" as any, {
        p_state_code: stateCode,
        p_alliance_code: reportAlliance,
        p_kind: "state_achievements_report",
        p_channel_id: String(channelId || ""),
        p_message: text,
      } as any);

      if (q.error) throw q.error;
      setMsg(`Queued ✅\n${url}`);
    } catch (e: any) {
      setMsg(`Export failed: ${e?.message ?? String(e)}\nIf it says "Bucket not found", create public bucket: exports`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="zombie-card" style={{ marginTop: 12 }}>
      <div style={{ padding: 14 }}>
        <div style={{ opacity: 0.72, fontSize: 11, fontWeight: 950, letterSpacing: "0.12em" }}>INTEL RAIL</div>
        <div style={{ fontSize: 16, fontWeight: 950, marginTop: 6 }}>📡 Emergency Report Feed</div>

        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
            <div style={{ fontWeight: 950 }}>Report Scope</div>
            <select className="zombie-input" value={scope} onChange={(e) => setScope(e.target.value)} style={{ padding: "10px 12px", width: "100%", marginTop: 10 }}>
              <option value="CURRENT">CURRENT FILTER ({activeFilter})</option>
              <option value="ALL">ALL</option>
              {allianceOptions.filter(a => a !== "ALL").map(a => (<option key={a} value={a}>{a}</option>))}
            </select>
            <div style={{ opacity: 0.75, fontSize: 12, marginTop: 8 }}>Rows: <b>{scoped.length}</b> • Completed: <b>{completed.length}</b></div>
          </div>

          <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
            <div style={{ fontWeight: 950 }}>Discord Channel</div>
            <StateDiscordChannelSelect stateCode={stateCode} value={channelId} onChange={setChannelId} label="Reports Channel" />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              <button className="zombie-btn" style={{ padding: "10px 12px" }} disabled={busy || !String(channelId||"").trim()} onClick={exportAndQueue}>
                {busy ? "WORKING…" : "🩸 EXPORT PNG + QUEUE TO DISCORD"}
              </button>
            </div>
            {msg ? <div style={{ marginTop: 10, opacity: 0.85, whiteSpace: "pre-wrap" }}>{msg}</div> : null}
          </div>

          <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
            <div style={{ fontWeight: 950 }}>Preview</div>
            <div style={{ marginTop: 10, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.10)" }}>
              <div style={{ transform: "scale(0.38)", transformOrigin: "top left", width: 900 }}>
                <ReportView />
              </div>
              <div style={{ height: 10 }} />
            </div>
            <div style={{ position: "absolute", left: -99999, top: -99999 }}>
              <div ref={captureRef}><ReportView /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
