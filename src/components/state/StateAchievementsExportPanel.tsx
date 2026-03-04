import React, { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { supabase } from "../../lib/supabaseClient";

type ReqRow = Record<string, any>;
type ChannelRow = { channel_id: string; channel_name: string | null; is_default?: boolean | null };

function norm(s: any) { return String(s ?? "").trim(); }
function normLower(s: any) { return String(s ?? "").trim().toLowerCase(); }
function safeSlug(s: string) {
  return normLower(s).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "all";
}

export default function StateAchievementsExportPanel(props: { stateCode: string; requests: ReqRow[] }) {
  const stateCode = norm(props.stateCode) || "789";
  const requests = Array.isArray(props.requests) ? props.requests : [];

  const [allianceFilter, setAllianceFilter] = useState<string>("ALL");
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [channelId, setChannelId] = useState<string>("");

  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const exportRef = useRef<HTMLDivElement | null>(null);

  const allianceOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of requests) {
      const a = norm(r.alliance_name || r.alliance || r.allianceCode);
      if (a) s.add(a);
    }
    return ["ALL", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [requests]);

  const filtered = useMemo(() => {
    if (!allianceFilter || allianceFilter === "ALL") return requests;
    const needle = normLower(allianceFilter);
    return requests.filter((r) => normLower(r.alliance_name || r.alliance || r.allianceCode) === needle);
  }, [requests, allianceFilter]);

  const completed = useMemo(() => {
    return filtered.filter((r) => {
      const st = normLower(r.status);
      if (st === "completed") return true;
      if (r.completed_at) return true;
      return false;
    });
  }, [filtered]);

  async function loadChannelsAndDefault() {
    setStatus("");
    // channels
    try {
      const r = await supabase
        .from("state_discord_channels")
        .select("*")
        .eq("state_code", stateCode)
        .order("channel_name", { ascending: true });

      if (!r.error) {
        const data = (r.data || []) as any[];
        // Filter active only if column exists
        const filtered = data.filter((x) => (typeof x.active === "boolean" ? x.active === true : true));
        // Sort default first only if column exists
        filtered.sort((a, b) => {
          const da = a?.is_default ? 1 : 0;
          const db = b?.is_default ? 1 : 0;
          if (db !== da) return db - da;
          return String(a.channel_name || "").localeCompare(String(b.channel_name || ""));
        });
        setChannels(filtered as any);
      }if (!r.error) setChannels((r.data || []) as any);
    } catch {}

    // default export channel (best-effort; table may not exist yet)
    try {
      const d = await supabase
        .from("state_discord_defaults").select("*")
        .eq("state_code", stateCode)
        .maybeSingle();

      if (!d.error) {
              const obj: any = d.data || {};
      const v = String(
        obj.achievements_export_channel_id ?? obj.reports_channel_id ?? obj.alerts_channel_id ?? ""
      ).trim();
      if (v) setChannelId(v);}
    } catch {}
  }

  useEffect(() => { void loadChannelsAndDefault(); }, [stateCode]);

  // If empty selection, use default from state_discord_channels
  useEffect(() => {
    if (channelId) return;
    const def = channels.find((c) => !!c.is_default)?.channel_id || "";
    if (def) setChannelId(def);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels]);

  async function saveDefaultExportChannel() {
    const v = String(channelId || "").trim();
    if (!v) return alert("Pick a Discord channel first.");

    setBusy(true);
    setStatus("Saving default export channel…");
    try {
      const payload: any = {
        state_code: stateCode,
        achievements_export_channel_id: v,
        reports_channel_id: v,
        alerts_channel_id: v, // satisfies NOT NULL if present
      };

      let up = await supabase
        .from("state_discord_defaults")
        .upsert(payload as any, { onConflict: "state_code" });

      // If alerts_channel_id column does not exist, retry without it
      if (up.error && String(up.error.message || "").toLowerCase().includes("alerts_channel_id") && String(up.error.message || "").toLowerCase().includes("column")) {
        delete payload.alerts_channel_id;
        up = await supabase
          .from("state_discord_defaults")
          .upsert(payload as any, { onConflict: "state_code" });
      }if (up.error) throw up.error;
      setStatus("Saved ✅");
    } catch (e: any) {
      setStatus("Save failed: " + String(e?.message || e || "Error"));
      alert("Save failed. If state_discord_defaults table doesn't exist yet, run the SQL setup script.");
    } finally {
      setBusy(false);
    }
  }

  async function renderPngBlob(): Promise<Blob> {
    const el = exportRef.current;
    if (!el) throw new Error("Export area not found.");

    const dataUrl = await toPng(el, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#07090b",
    });

    const resp = await fetch(dataUrl);
    return await resp.blob();
  }

  async function uploadPng(blob: Blob): Promise<string> {
    // Reuse existing bucket used by Guides (avoids bucket permission surprises)
    const bucket = "exports";
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const fname = `state-${stateCode}-achievements-${safeSlug(allianceFilter)}-${ts}.png`;
    const path = `exports/state/${stateCode}/achievements/${fname}`;

    const up = await supabase.storage.from(bucket).upload(path, blob, {
      contentType: "image/png",
      upsert: true,
    });
    if (up.error) throw up.error;

    const pub = supabase.storage.from(bucket).getPublicUrl(path);
    const url = (pub as any)?.data?.publicUrl || (pub as any)?.publicUrl || "";
    if (!url) throw new Error("Could not get public URL for uploaded PNG.");
    return url;
  }

  async function exportPngDownload() {
    setBusy(true);
    setStatus("Rendering PNG…");
    try {
      const blob = await renderPngBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `state-${stateCode}-achievements-${safeSlug(allianceFilter)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus("Downloaded ✅");
    } catch (e: any) {
      setStatus("Export failed: " + String(e?.message || e || "Error"));
      alert(String(e?.message || e || "Export failed"));
    } finally {
      setBusy(false);
    }
  }

  async function sendPngToDiscord() {
    setBusy(true);
    setStatus("Rendering PNG…");
    try {
      const blob = await renderPngBlob();
      setStatus("Uploading PNG…");
      const url = await uploadPng(blob);

      setStatus("Queueing Discord send…");
      const msg =
        `🏆 **State ${stateCode} — Achievements Export**\n` +
        `Alliance: **${allianceFilter || "ALL"}**\n` +
        `Completed shown: **${completed.length}**\n` +
        url;

      const q = await supabase.rpc("queue_discord_send" as any, {
        p_state_code: stateCode,
        p_alliance_code: "",
        p_kind: "state_achievements_export",
        p_channel_id: String(channelId || "").trim(),
        p_message: msg,
      } as any);

      if (q.error) throw q.error;
      setStatus("Queued ✅ (check Discord + Send Log)");
    } catch (e: any) {
      setStatus("Send failed: " + String(e?.message || e || "Error"));
      alert(String(e?.message || e || "Send failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="zombie-card" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 900 }}>📤 Export achievements to Discord</div>
        <div style={{ marginLeft: "auto", opacity: 0.75, fontSize: 12 }}>{status || " "}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginTop: 12 }}>
        <div>
          <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Alliance filter</div>
          <select className="zombie-input" value={allianceFilter} onChange={(e) => setAllianceFilter(e.target.value)} style={{ padding: "10px 12px", width: "100%" }}>
            {allianceOptions.map((a) => (<option key={a} value={a}>{a}</option>))}
          </select>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 8 }}>
            Filtered requests: <b>{filtered.length}</b> • Completed: <b>{completed.length}</b>
          </div>
        </div>

        <div>
          <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Discord channel</div>
          <select className="zombie-input" value={channelId} onChange={(e) => setChannelId(e.target.value)} style={{ padding: "10px 12px", width: "100%" }}>
            <option value="">(Default / leave blank)</option>
            {channels.map((c) => (
              <option key={c.channel_id} value={c.channel_id}>
                {c.channel_name ? `${c.channel_name} (${c.channel_id})` : c.channel_id}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={saveDefaultExportChannel} disabled={busy}>
              Save as default export channel
            </button>
          </div>

          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 8 }}>
            Saving requires <code>state_discord_defaults</code> (SQL script below).
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={exportPngDownload} disabled={busy}>
            ⬇️ Export PNG (download)
          </button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={sendPngToDiscord} disabled={busy}>
            📤 Export PNG → Discord
          </button>
          <div style={{ opacity: 0.7, fontSize: 12 }}>
            If Discord posting fails with “Missing Access”, the bot needs permission in that channel.
          </div>
        </div>
      </div>

      <div
        ref={exportRef}
        style={{
          marginTop: 14,
          padding: 14,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
          <div style={{ fontSize: 16, fontWeight: 900 }}>State {stateCode} Achievements</div>
          <div style={{ opacity: 0.75 }}>•</div>
          <div style={{ opacity: 0.9 }}>Alliance: <b>{allianceFilter}</b></div>
          <div style={{ marginLeft: "auto", opacity: 0.75, fontSize: 12 }}>{new Date().toLocaleString()}</div>
        </div>

        <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
          Completed shown: {completed.length} (top 40)
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {completed.slice(0, 40).map((r) => {
            const player = norm(r.player_name || r.requester_name || "Player");
            const ach =
              norm(r.type_name) ||
              norm(r.achievement_name) ||
              norm(r.achievement_type_name) ||
              norm(r.achievement_type_id) ||
              "Achievement";
            const opt = norm(r.option_name || r.option_label || "");
            const cur = Number(r.current_count ?? r.progress_count ?? 0) || 0;
            const req = Number(r.required_count ?? 1) || 1;

            return (
              <div key={String(r.id)} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 220, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player}</div>
                <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ach}{opt ? (" — " + opt) : ""}
                </div>
                <div style={{ width: 90, textAlign: "right", fontWeight: 900 }}>{cur}/{req}</div>
              </div>
            );
          })}
          {completed.length === 0 ? <div style={{ opacity: 0.75 }}>No completed achievements match this filter yet.</div> : null}
        </div>
      </div>
    </div>
  );
}

