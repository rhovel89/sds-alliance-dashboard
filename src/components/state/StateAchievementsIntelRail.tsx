import React, { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { supabase } from "../../lib/supabaseClient";
import StateDiscordChannelSelect from "../discord/StateDiscordChannelSelect";

type AnyRow = Record<string, any>;
function norm(s: any) { return String(s ?? "").trim(); }
function upper(s: any) { return norm(s).toUpperCase(); }
function lower(s: any) { return norm(s).toLowerCase(); }

function pickAlliance(r: AnyRow) {
  return (
    r?.alliance_code ??
    r?.alliance_tag ??
    r?.alliance ??
    r?.alliance_name ??
    r?.tag ??
    r?.allianceCode ??
    r?.allianceName ??
    ""
  );
}
function pickStatus(r: AnyRow) { return (r?.status ?? r?.request_status ?? r?.approval_status ?? r?.state ?? ""); }
function pickPlayer(r: AnyRow) { return (r?.player_name ?? r?.game_name ?? r?.name ?? ""); }

function isDoneStatus(st: string) {
  const s = lower(st);
  return s === "completed" || s === "approved" || s === "done";
}
function tsLabel() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export default function StateAchievementsIntelRail(props: {
  stateCode: string;
  // older versions passed filterAlliance + visibleRequests
  filterAlliance?: string;
  // newer versions may pass activeFilterAlliance + requests
  activeFilterAlliance?: string;
  requests: AnyRow[];
}) {
  const stateCode = norm(props.stateCode);
  const activeFilter = upper(props.activeFilterAlliance ?? props.filterAlliance ?? "ALL");
  const allRequests = Array.isArray(props.requests) ? props.requests : [];

  // report scope selection
  // CURRENT = use activeFilter; ALL = all; or explicit alliance tag
  const [scope, setScope] = useState<string>("CURRENT");

  // discord channel id
  const [channelId, setChannelId] = useState<string>("");

  // export status
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const captureRef = useRef<HTMLDivElement | null>(null);

  const allianceOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of allRequests) {
      const a = upper(pickAlliance(r));
      if (a) s.add(a);
    }
    return ["ALL", ...Array.from(s).sort((a,b)=>a.localeCompare(b))];
  }, [allRequests]);

  const reportAlliance = useMemo(() => {
    if (scope === "CURRENT") return activeFilter || "ALL";
    if (scope === "ALL") return "ALL";
    return upper(scope || "ALL");
  }, [scope, activeFilter]);

  const scopedRequests = useMemo(() => {
    const a = upper(reportAlliance || "ALL");
    if (a === "ALL") return allRequests;
    return allRequests.filter(r => upper(pickAlliance(r)) === a);
  }, [allRequests, reportAlliance]);

  const completed = useMemo(() => scopedRequests.filter(r => isDoneStatus(String(pickStatus(r)))), [scopedRequests]);

  const leaderboard = useMemo(() => {
    const map = new Map<string, { alliance: string; completed: number; total: number }>();
    for (const r of scopedRequests) {
      const a = upper(pickAlliance(r) || "UNKNOWN");
      if (!map.has(a)) map.set(a, { alliance: a, completed: 0, total: 0 });
      const row = map.get(a)!;
      row.total += 1;
      if (isDoneStatus(String(pickStatus(r)))) row.completed += 1;
    }
    return Array.from(map.values())
      .sort((x, y) => (y.completed - x.completed) || (y.total - x.total) || x.alliance.localeCompare(y.alliance))
      .slice(0, 10);
  }, [scopedRequests]);

  const recentDone = useMemo(() => {
    const rows = completed.slice();
    rows.sort((a, b) => {
      const ta = Date.parse(String(a?.updated_at ?? a?.created_at ?? 0)) || 0;
      const tb = Date.parse(String(b?.updated_at ?? b?.created_at ?? 0)) || 0;
      return tb - ta;
    });
    return rows.slice(0, 10);
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
        <div style={{ opacity: 0.8, marginTop: 6 }}>
          Scope: <b>{reportAlliance || "ALL"}</b> • Generated: {new Date().toLocaleString()}
        </div>

        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14 }}>
            <div style={{ fontWeight: 950 }}>Summary</div>
            <div style={{ marginTop: 10, opacity: 0.85 }}>
              Total requests: <b>{scopedRequests.length}</b><br/>
              Completed: <b>{completed.length}</b><br/>
              Pending/Other: <b>{Math.max(0, scopedRequests.length - completed.length)}</b>
            </div>
          </div>

          <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14 }}>
            <div style={{ fontWeight: 950 }}>Top Alliances</div>
            <div style={{ marginTop: 8 }}>
              {leaderboard.length === 0 ? <div style={{ opacity: 0.7 }}>No data</div> : null}
              {leaderboard.map((r) => (
                <div key={r.alliance} style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <div style={{ fontWeight: 900 }}>{r.alliance}</div>
                  <div style={{ opacity: 0.85 }}>{r.completed}/{r.total}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14 }}>
          <div style={{ fontWeight: 950 }}>Recent Completions</div>
          <div style={{ marginTop: 8 }}>
            {recentDone.length === 0 ? <div style={{ opacity: 0.7 }}>None visible</div> : null}
            {recentDone.map((r, i) => (
              <div key={String(r.id || i)} style={{ marginTop: 8 }}>
                <div><b>{norm(pickPlayer(r)) || "Unknown"}</b> <span style={{ opacity: 0.75 }}>({upper(pickAlliance(r) || "UNKNOWN")})</span></div>
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

  async function exportAndSend() {
    if (!stateCode) return;
    setBusy(true);
    setMsg("");

    try {
      if (!captureRef.current) throw new Error("Report capture node not mounted.");

      const dataUrl = await toPng(captureRef.current, { cacheBust: true, pixelRatio: 2 });
      const blob = await (await fetch(dataUrl)).blob();

      const name = `state-${stateCode}/achievements-report-${reportAlliance || "ALL"}-${tsLabel()}.png`;
      const up = await supabase.storage.from("exports").upload(name, blob, {
        contentType: "image/png",
        upsert: true,
      });
      if (up.error) throw up.error;

      const pub = supabase.storage.from("exports").getPublicUrl(name);
      const url = pub?.data?.publicUrl;
      if (!url) throw new Error("Could not get public URL for export.");

      const text =
        `🩸 **STATE ${stateCode} — ACHIEVEMENT REPORT**\n` +
        `Scope: **${reportAlliance || "ALL"}**\n` +
        `Generated: ${new Date().toLocaleString()}\n` +
        url;

      const q = await supabase.rpc("queue_discord_send" as any, {
        p_state_code: stateCode,
        p_alliance_code: (reportAlliance || "ALL"),
        p_kind: "state_achievements_report",
        p_channel_id: channelId || "",
        p_message: text,
      } as any);

      if (q.error) throw q.error;

      setMsg(`Queued to Discord ✅\n${url}`);
    } catch (e: any) {
      setMsg(`Export/Send failed: ${e?.message ?? String(e)}\nIf it says "Bucket not found", create a public bucket named "exports" in Supabase Storage.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="zombie-card" style={{ marginTop: 12 }}>
      <div style={{ padding: 14 }}>
        <div style={{ opacity: 0.72, fontSize: 11, fontWeight: 950, letterSpacing: "0.12em" }}>INTEL RAIL</div>
        <div style={{ fontSize: 16, fontWeight: 950, marginTop: 6 }}>📡 Emergency Report Feed</div>

        <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
          <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
            <div style={{ fontWeight: 950 }}>Report Scope</div>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <select className="zombie-input" value={scope} onChange={(e) => setScope(e.target.value)} style={{ padding: "10px 12px" }}>
                <option value="CURRENT">CURRENT FILTER ({activeFilter || "ALL"})</option>
                <option value="ALL">ALL</option>
                {allianceOptions.filter(a => a !== "ALL").map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>

              <div style={{ opacity: 0.75, fontSize: 12 }}>
                Scope rows: <b>{scopedRequests.length}</b> • Completed: <b>{completed.length}</b>
              </div>
            </div>
          </div>

          <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
            <div style={{ fontWeight: 950 }}>Leaderboard</div>
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {leaderboard.length === 0 ? (
                <div style={{ opacity: 0.75 }}>No data yet.</div>
              ) : (
                leaderboard.map((r) => (
                  <div key={r.alliance} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900 }}>{r.alliance}</div>
                    <div style={{ opacity: 0.85 }}>{r.completed}/{r.total}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
            <div style={{ fontWeight: 950 }}>Recent Completions</div>
            <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
              {recentDone.length === 0 ? (
                <div style={{ opacity: 0.75 }}>No completions visible to you yet.</div>
              ) : (
                recentDone.map((r, i) => (
                  <div key={String(r.id || i)} style={{ opacity: 0.9 }}>
                    <b>{norm(pickPlayer(r)) || "Unknown"}</b>{" "}
                    <span style={{ opacity: 0.75 }}>({upper(pickAlliance(r) || "UNKNOWN")})</span>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>
                      status: {String(pickStatus(r) || "")}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
            <div style={{ fontWeight: 950 }}>Export → PNG → Discord</div>
            <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
              Sending scope: <b>{reportAlliance || "ALL"}</b>
            </div>

            <StateDiscordChannelSelect
              stateCode={stateCode}
              value={channelId}
              onChange={setChannelId}
              label="Discord Channel (for report)"
            />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              <button className="zombie-btn" style={{ padding: "10px 12px" }} disabled={busy} onClick={exportAndSend}>
                {busy ? "WORKING…" : "🩸 EXPORT PNG + QUEUE TO DISCORD"}
              </button>
            </div>

            {msg ? <div style={{ marginTop: 10, opacity: 0.85, whiteSpace: "pre-wrap" }}>{msg}</div> : null}

            <div style={{ marginTop: 12, opacity: 0.75, fontWeight: 900 }}>Preview</div>
            <div style={{ marginTop: 8, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.10)" }}>
              <div style={{ transform: "scale(0.38)", transformOrigin: "top left", width: 900 }}>
                <ReportView />
              </div>
              <div style={{ height: 10 }} />
            </div>

            {/* capture node offscreen (full-size) */}
            <div style={{ position: "absolute", left: -99999, top: -99999 }}>
              <div ref={captureRef}>
                <ReportView />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
