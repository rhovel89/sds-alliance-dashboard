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
    ""
  );
}

function pickStatus(r: AnyRow) {
  return (r?.status ?? r?.request_status ?? r?.approval_status ?? r?.state ?? "");
}

function pickPlayer(r: AnyRow) {
  return (r?.player_name ?? r?.game_name ?? r?.name ?? "");
}

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
  filterAlliance: string;
  requests: AnyRow[];
}) {
  const stateCode = norm(props.stateCode);
  const filterAlliance = upper(props.filterAlliance || "ALL");
  const requests = Array.isArray(props.requests) ? props.requests : [];

  // Discord channel selection (default is auto-filled by StateDiscordChannelSelect)
  const [channelId, setChannelId] = useState<string>("");

  // Export status
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const reportRef = useRef<HTMLDivElement | null>(null);

  const completed = useMemo(() => {
    return requests.filter(r => isDoneStatus(String(pickStatus(r))));
  }, [requests]);

  const leaderboard = useMemo(() => {
    const map = new Map<string, { alliance: string; completed: number; total: number }>();
    for (const r of requests) {
      const a = upper(pickAlliance(r) || "UNKNOWN");
      if (!map.has(a)) map.set(a, { alliance: a, completed: 0, total: 0 });
      const row = map.get(a)!;
      row.total += 1;
      if (isDoneStatus(String(pickStatus(r)))) row.completed += 1;
    }
    return Array.from(map.values())
      .sort((x, y) => (y.completed - x.completed) || (y.total - x.total) || x.alliance.localeCompare(y.alliance))
      .slice(0, 10);
  }, [requests]);

  const recentDone = useMemo(() => {
    const rows = completed.slice();
    rows.sort((a, b) => {
      const ta = Date.parse(String(a?.updated_at ?? a?.created_at ?? 0)) || 0;
      const tb = Date.parse(String(b?.updated_at ?? b?.created_at ?? 0)) || 0;
      return tb - ta;
    });
    return rows.slice(0, 10);
  }, [completed]);

  async function exportAndSend() {
    if (!stateCode) return;
    setBusy(true);
    setMsg("");

    try {
      if (!reportRef.current) throw new Error("Report view not mounted.");

      // Render to PNG (high-res)
      const dataUrl = await toPng(reportRef.current, { cacheBust: true, pixelRatio: 2 });

      // Convert to Blob
      const blob = await (await fetch(dataUrl)).blob();

      // Upload to Supabase Storage (public bucket "exports")
      const name = `state-${stateCode}/achievements-report-${filterAlliance || "ALL"}-${tsLabel()}.png`;
      const up = await supabase.storage.from("exports").upload(name, blob, {
        contentType: "image/png",
        upsert: true,
      });

      if (up.error) throw up.error;

      const pub = supabase.storage.from("exports").getPublicUrl(name);
      const url = pub?.data?.publicUrl;
      if (!url) throw new Error("Could not get public URL for export.");

      // Queue message to Discord (worker posts link)
      const text =
        `🩸 **STATE ${stateCode} — ACHIEVEMENT REPORT**\n` +
        `Filter: **${filterAlliance || "ALL"}**\n` +
        `Generated: ${new Date().toLocaleString()}\n` +
        url;

      const q = await supabase.rpc("queue_discord_send" as any, {
        p_state_code: stateCode,
        p_alliance_code: (filterAlliance || "ALL"),
        p_kind: "state_achievements_report",
        p_channel_id: channelId || "",
        p_message: text,
      } as any);

      if (q.error) throw q.error;

      setMsg(`Queued to Discord ✅  (${url})`);
    } catch (e: any) {
      setMsg(`Export/Send failed: ${e?.message ?? String(e)}. If it says "Bucket not found", create a public bucket named "exports" in Supabase Storage.`);
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
            <div style={{ fontWeight: 950 }}>Leaderboard (Top Alliances)</div>
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
              Uses current filter: <b>{filterAlliance || "ALL"}</b>
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

            {/* Hidden report render target */}
            <div style={{ position: "absolute", left: -99999, top: -99999 }}>
              <div ref={reportRef} style={{
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
                <div style={{ opacity: 0.8, marginTop: 6 }}>Filter: <b>{filterAlliance || "ALL"}</b> • Generated: {new Date().toLocaleString()}</div>

                <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
                  <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14 }}>
                    <div style={{ fontWeight: 950 }}>Top Alliances</div>
                    <div style={{ marginTop: 8 }}>
                      {leaderboard.map((r) => (
                        <div key={r.alliance} style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                          <div style={{ fontWeight: 900 }}>{r.alliance}</div>
                          <div style={{ opacity: 0.85 }}>{r.completed}/{r.total}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14 }}>
                    <div style={{ fontWeight: 950 }}>Recent Completions</div>
                    <div style={{ marginTop: 8 }}>
                      {recentDone.map((r, i) => (
                        <div key={String(r.id || i)} style={{ marginTop: 8 }}>
                          <div><b>{norm(pickPlayer(r)) || "Unknown"}</b> <span style={{ opacity: 0.75 }}>({upper(pickAlliance(r) || "UNKNOWN")})</span></div>
                          <div style={{ opacity: 0.75, fontSize: 12 }}>status: {String(pickStatus(r) || "")}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 16, opacity: 0.65, fontSize: 12 }}>
                  Generated by State Alliance Dashboard • RLS enforced • Do not share outside leadership.
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
