import React, { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { supabase } from "../../lib/supabaseClient";
import StateDiscordChannelSelect from "../discord/StateDiscordChannelSelect";

type ReqRow = Record<string, any>;
type ChannelRow = {
  id?: string;
  channel_id: string;
  channel_name: string | null;
  is_default?: boolean | null;
  active?: boolean | null;
};

function norm(s: any) { return String(s ?? "").trim(); }
function normLower(s: any) { return String(s ?? "").trim().toLowerCase(); }
function safeSlug(s: string) {
  return normLower(s).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function StateAchievementsExportPanel(props: { stateCode: string; requests?: ReqRow[] }) {
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
      const a = norm(r.alliance_name || r.alliance || r.allianceCode || r.alliance_code);
      if (a) s.add(a);
    }
    return ["ALL", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [requests]);

  const filtered = useMemo(() => {
    if (!allianceFilter || allianceFilter === "ALL") return requests;
    const needle = normLower(allianceFilter);
    return requests.filter((r) => normLower(r.alliance_name || r.alliance || r.allianceCode || r.alliance_code) === needle);
  }, [requests, allianceFilter]);

  const completed = useMemo(() => {
    return filtered.filter((r) => {
      const st = normLower(r.status);
      return st === "approved" || st === "complete" || st === "completed" || st === "done";
    });
  }, [filtered]);

  const pending = useMemo(() => {
    return filtered.filter((r) => {
      const st = normLower(r.status);
      return st === "submitted" || st === "pending" || st === "review" || st === "in_review";
    });
  }, [filtered]);

  const progress = useMemo(() => {
    return filtered.filter((r) => {
      const st = normLower(r.status);
      return st === "progress" || st === "in_progress" || st === "tracking";
    });
  }, [filtered]);

  async function loadChannelsAndDefaults() {
    setStatus("");
    setChannels([]);

    // 1) Channels — schema safe
    const r = await supabase
      .from("state_discord_channels")
      .select("*")
      .eq("state_code", stateCode)
      .order("channel_name", { ascending: true });

    if (!r.error) {
      const data = (r.data || []) as any[];

      const filtered = data.filter((x) => (typeof x.active === "boolean" ? x.active === true : true));
      filtered.sort((a, b) => {
        const da = a?.is_default ? 1 : 0;
        const db = b?.is_default ? 1 : 0;
        if (db !== da) return db - da;
        return String(a.channel_name || "").localeCompare(String(b.channel_name || ""));
      });

      setChannels(filtered as any);
    }

    // 2) Default export channel — schema safe
    try {
      const d = await supabase
        .from("state_discord_defaults")
        .select("*")
        .eq("state_code", stateCode)
        .maybeSingle();

      if (!d.error && d.data) {
        const obj: any = d.data || {};
        const v = String(
          obj.achievements_export_channel_id ?? obj.reports_channel_id ?? obj.alerts_channel_id ?? ""
        ).trim();
        if (v) setChannelId(v);
      }
    } catch {}
  }

  useEffect(() => {
    void loadChannelsAndDefaults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateCode]);

  async function exportPngDownload() {
    if (!exportRef.current) return;
    setBusy(true);
    setStatus("Rendering PNG…");

    try {
      const url = await toPng(exportRef.current, { cacheBust: true, pixelRatio: 2 });
      const a = document.createElement("a");
      a.href = url;
      a.download = `state-${stateCode}-achievements-${safeSlug(allianceFilter)}.png`;
      a.click();
      setStatus("Downloaded ✅");
    } catch (e: any) {
      setStatus("Export failed: " + (e?.message ?? String(e)));
    } finally {
      setBusy(false);
      window.setTimeout(() => setStatus(""), 1200);
    }
  }

  async function sendPngToDiscord() {
    if (!exportRef.current) return;
    const cid = String(channelId || "").trim();
    if (!cid) { setStatus("Pick a Discord channel first."); return; }

    setBusy(true);
    setStatus("Rendering PNG…");

    try {
      const dataUrl = await toPng(exportRef.current, { cacheBust: true, pixelRatio: 2 });
      const blob = await (await fetch(dataUrl)).blob();

      setStatus("Uploading…");
      const name = `state-${stateCode}/achievements-${safeSlug(allianceFilter)}-${Date.now()}.png`;

      const up = await supabase.storage.from("exports").upload(name, blob, { contentType: "image/png", upsert: true });
      if (up.error) throw up.error;

      const pub = supabase.storage.from("exports").getPublicUrl(name);
      const url = pub?.data?.publicUrl;
      if (!url) throw new Error("Public URL missing (exports bucket)");

      const msg =
        `🩸 **State ${stateCode} — Achievements Intel**` +
        `\nAlliance: **${allianceFilter}**` +
        `\nCompleted: **${completed.length}** • In Progress: **${progress.length}** • Pending: **${pending.length}**` +
        `\n` + url;

      setStatus("Queueing Discord send…");
      const q = await supabase.rpc("queue_discord_send" as any, {
        p_state_code: stateCode,
        p_alliance_code: "",
        p_kind: "state_achievements_export",
        p_channel_id: cid,
        p_message: msg,
      });

      if (q.error) throw q.error;

      // Save default export channel (schema safe)
      try {
        const payload: any = {
          state_code: stateCode,
          achievements_export_channel_id: cid,
          reports_channel_id: cid,
          alerts_channel_id: cid, // satisfies NOT NULL if present
        };

        let up2 = await supabase.from("state_discord_defaults").upsert(payload as any, { onConflict: "state_code" });

        // If alerts_channel_id column does not exist, retry without it
        if (up2.error && String(up2.error.message || "").toLowerCase().includes("alerts_channel_id") && String(up2.error.message || "").toLowerCase().includes("column")) {
          delete payload.alerts_channel_id;
          up2 = await supabase.from("state_discord_defaults").upsert(payload as any, { onConflict: "state_code" });
        }
      } catch {}

      setStatus("Queued ✅ (check Discord send log)");
    } catch (e: any) {
      setStatus("Export failed: " + (e?.message ?? String(e)));
    } finally {
      setBusy(false);
      window.setTimeout(() => setStatus(""), 1400);
    }
  }

  return (
    <div className="zombie-card" style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 950 }}>🧟 Achievements Export</div>
          <div style={{ opacity: 0.75, fontSize: 12 }}>
            {status ? status : `State ${stateCode} • filtered: ${filtered.length} • completed: ${completed.length}`}
          </div>
        </div>
        <button className="zombie-btn" type="button" onClick={() => void loadChannelsAndDefaults()} disabled={busy}>
          Refresh
        </button>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Alliance Filter</div>
        <select
          className="zombie-input"
          value={allianceFilter}
          onChange={(e) => setAllianceFilter(String(e.target.value || "ALL"))}
          style={{ padding: "10px 12px", width: "100%" }}
        >
          {allianceOptions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <StateDiscordChannelSelect
        stateCode={stateCode}
        value={channelId}
        onChange={setChannelId}
        label="Discord Channel (Export Target)"
      />

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={exportPngDownload} disabled={busy}>
          ⬇️ Export PNG (download)
        </button>
        <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={sendPngToDiscord} disabled={busy}>
          📤 Export PNG → Discord
        </button>
        <div style={{ opacity: 0.7, fontSize: 12 }}>
          If Discord posting fails with “Missing Access”, the bot needs permissions in that channel.
        </div>
      </div>

      <div style={{ marginTop: 12, border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14, padding: 10 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Preview</div>
        <div ref={exportRef} style={{ padding: 10, borderRadius: 12, background: "rgba(0,0,0,0.25)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
  <div>
    <div style={{ fontWeight: 950, fontSize: 16 }}>State {stateCode} — Achievements Intel</div>
    <div style={{ opacity: 0.72, marginTop: 4, fontSize: 12 }}>DOSSIER SHEET • export PNG • dispatch to Discord</div>
  </div>
  <div style={{
    padding:"6px 10px",
    borderRadius:999,
    border:"1px solid rgba(176,18,27,0.35)",
    background:"rgba(176,18,27,0.16)",
    fontWeight:900,
    letterSpacing:0.5,
    textTransform:"uppercase",
    fontSize:11
  }}>
    Z-OPS
  </div>
</div>
          <div style={{ opacity: 0.8, marginTop: 4, fontSize: 12 }}>Alliance: {allianceFilter}</div>

          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <div>
              <div style={{ fontWeight: 900 }}>✅ Completed ({completed.length})</div>
              <div style={{ opacity: 0.85, fontSize: 12, marginTop: 4 }}>
                {completed.slice(0, 12).map((r, i) => (
                  <div key={i}>• {String(r.achievement_name || r.title || r.type_name || "Achievement")}</div>
                ))}
                {completed.length > 12 ? <div>… +{completed.length - 12} more</div> : null}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 900 }}>🧬 In Progress ({progress.length})</div>
              <div style={{ opacity: 0.85, fontSize: 12, marginTop: 4 }}>
                {progress.slice(0, 12).map((r, i) => (
                  <div key={i}>• {String(r.achievement_name || r.title || r.type_name || "Achievement")}</div>
                ))}
                {progress.length > 12 ? <div>… +{progress.length - 12} more</div> : null}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 900 }}>⏳ Pending ({pending.length})</div>
              <div style={{ opacity: 0.85, fontSize: 12, marginTop: 4 }}>
                {pending.slice(0, 12).map((r, i) => (
                  <div key={i}>• {String(r.achievement_name || r.title || r.type_name || "Achievement")}</div>
                ))}
                {pending.length > 12 ? <div>… +{pending.length - 12} more</div> : null}
              </div>
            </div>
          </div>

          <div style={{ opacity: 0.65, fontSize: 11, marginTop: 10 }}>
            Generated: {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

