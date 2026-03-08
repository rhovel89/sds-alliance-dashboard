import React, { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { supabase } from "../../lib/supabaseClient";
import StateDiscordChannelSelect from "../discord/StateDiscordChannelSelect";
import SendToAllianceDefaultAchievementsButton from "./SendToAllianceDefaultAchievementsButton";

// Helpers (local, avoid runtime crashes)
const norm = (v: any) => String(v ?? "").trim();
const normLower = (v: any) => norm(v).toLowerCase();
const safeSlug = (v: any) => {
  const s = normLower(v);
  const slug = s
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (slug.length ? slug.slice(0, 60) : "x");
};


// Local helpers (stable + avoids runtime crashes)


// Local helpers (stable + avoids runtime crashes)


const __norm = (v: any) => String(v ?? "").trim();
const __normLower = (v: any) => __norm(v).toLowerCase();


function getPlayerName(r: any): string {
  return __norm(r?.player_name || r?.player || r?.game_name || r?.name || r?.player_display || r?.player_tag || "Unknown");
}
function formatAchievementLine(r: any): string {
  const player = __norm(r?.player_name || r?.player || r?.game_name || r?.name || r?.player_display || r?.player_tag);
  const ach = __norm(
    r?.achievement_name ||
    r?.type_name ||
    r?.title ||
    r?.achievement ||
    r?.label ||
    r?.option_label ||
    r?.kind
  );

  // Prefer showing player name always
  if (player && ach && __normLower(ach) !== "achievement") return `${player} — ${ach}`;
  if (player) return player;
  return ach || "Achievement";
}


// Local text helpers (keep UI resilient)
const normUpper = (v: any) => norm(v).toUpperCase();






type ReqRow = Record<string, any>;
type ChannelRow = {
  id?: string;
    channel_id: "default:achievements", // per-alliance default
}

export default function StateAchievementsExportPanel(props: { stateCode: string; requests?: ReqRow[] }) {
  const stateCode = norm(props.stateCode) || "789";
  const requests = Array.isArray(props.requests) ? props.requests : [];

  const [allianceFilter, setAllianceFilter] = useState<string>("ALL");
  const [achievementTypeFilter, setAchievementTypeFilter] = useState<string>("ALL");
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [channelId, setChannelId] = useState<string>("");

  const [status, setStatus] = useState<string>("");
  

  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [selectedWebhookIds, setSelectedWebhookIds] = useState<string[]>([]);

  async function loadAllianceWebhooks(allianceCode: string) {
    const a = String(allianceCode || "").toUpperCase().trim();
    if (!a || a === "ALL") { setWebhooks([]); setSelectedWebhookIds([]); return; }
    const { data, error } = await supabase
      .from("alliance_discord_webhooks")
      .select("id, label, webhook_url, alliance_code")
      .eq("alliance_code", a)
      .order("label", { ascending: true });
    if (error) throw error;
    setWebhooks(data || []);
  }

  function toggleWebhook(id: string) {
    setSelectedWebhookIds((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function sendToSelectedWebhooks(message: string, meta: any) {
    const allianceCode = String(allianceFilter || "").trim().toUpperCase();
    if (!allianceCode || allianceCode === "ALL") {
      setStatus("Pick one alliance before sending to selected Discord webhooks.");
      return;
    }
    if (!selectedWebhookIds.length) {
      setStatus("Pick at least one webhook/channel first.");
      return;
    }
    setStatus("Queueing Discord sends...");
    for (const wid of selectedWebhookIds) {
      const { data, error } = await supabase.rpc("queue_discord_send", {
        p_kind: "discord_webhook",
        p_target: "alliance:" + allianceCode,
        p_channel_id: String(wid),
        p_content: message,
        p_meta: { ...meta, alliance_code: allianceCode, kind: "achievements", webhook_id: String(wid) }
      });
      if (error) { setStatus("Queue error: " + error.message); return; }
    }
    setStatus("Queued ✅");
  }const [busy, setBusy] = useState(false);

  const exportRef = useRef<HTMLDivElement | null>(null);

  const allianceOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of requests) {
      const a = norm(r.alliance_name || r.alliance || r.allianceCode || r.alliance_code);
      if (a) s.add(a);
    }
    return ["ALL", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [requests]);

  const achievementTypeOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of requests) {
      const t = norm(
        r.achievement_name ||
        r.type_name ||
        r.title ||
        r.achievement ||
        r.label ||
        r.option_label ||
        r.kind
      );
      if (t) s.add(t);
    }
    return ["ALL", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [requests]);
  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const allianceOk =
        !allianceFilter ||
        allianceFilter === "ALL" ||
        normLower(r.alliance_name || r.alliance || r.allianceCode || r.alliance_code) === normLower(allianceFilter);

      const rowType = norm(
        r.achievement_name ||
        r.type_name ||
        r.title ||
        r.achievement ||
        r.label ||
        r.option_label ||
        r.kind
      );

      const typeOk =
        !achievementTypeFilter ||
        achievementTypeFilter === "ALL" ||
        normLower(rowType) === normLower(achievementTypeFilter);

      return allianceOk && typeOk;
    });
  }, [requests, allianceFilter, achievementTypeFilter]);

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

  useEffect(() => {
    void loadAllianceWebhooks(allianceFilter);
  }, [allianceFilter]);

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
      const completedLines = completed.slice(0, 8).map((r) => `• ${formatAchievementLine(r)}`).join("\n");
      const progressLines = progress.slice(0, 5).map((r) => `• ${formatAchievementLine(r)}`).join("\n");
      const pendingLines = pending.slice(0, 5).map((r) => `• ${formatAchievementLine(r)}`).join("\n");

      const parts: string[] = [
        `🩸 **State ${stateCode} — Achievements Intel v3**`,
        `Alliance: **${allianceFilter}**`,
        `Completed: **${completed.length}** • In Progress: **${progress.length}** • Pending: **${pending.length}**`,
      ];

      if (completedLines) parts.push("", "✅ **Completed**", completedLines);
      if (progressLines) parts.push("", "🧬 **In Progress**", progressLines);
      if (pendingLines) parts.push("", "⏳ **Pending**", pendingLines);

      parts.push("", "📎 Export Image:", url);

      const msg = parts.join("\n");


      setStatus("Queueing Discord send…");
      const q = await supabase.rpc("queue_discord_send" as any, {
        p_kind: "discord_webhook",
        p_target: "alliance:" + String(allianceFilter || "").toUpperCase(),
        p_channel_id: "default:achievements", // per-alliance default
        p_content: msg,
        p_meta: {
          state_code: stateCode,
          alliance_code: String(allianceFilter || "").toUpperCase(),
          kind: "achievements",
          source: "StateAchievementsExportPanel",
        },
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
    <SendToAllianceDefaultAchievementsButton stateCode={stateCode} allianceFilter={allianceFilter} requests={requests as any} />
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

      <div style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Achievement Type Filter</div>
        <select
          className="zombie-input"
          value={achievementTypeFilter}
          onChange={(e) => setAchievementTypeFilter(String(e.target.value || "ALL"))}
          style={{ padding: "10px 12px", width: "100%" }}
        >
          {achievementTypeOptions.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button
            className="zombie-btn"
            type="button"
            style={{ padding: "10px 12px" }}
            onClick={sendPngToDiscord}
            disabled={busy || String(allianceFilter || "").toUpperCase() === "ALL"}
          >
            Send to Alliance Default (Achievements)
          </button>

          <button
            className="zombie-btn"
            type="button"
            style={{ padding: "10px 12px" }}
            onClick={() => void sendToSelectedWebhooks(
              [
                `🩸 **State ${stateCode} — Achievements Intel v3**`,
                `Alliance: **${allianceFilter}**`,
                `Completed: **${completed.length}** • In Progress: **${progress.length}** • Pending: **${pending.length}**`,
                ...(completed.length ? ["", "✅ **Completed**", ...completed.slice(0, 8).map((r) => `• ${formatAchievementLine(r)}`)] : []),
                ...(progress.length ? ["", "🧬 **In Progress**", ...progress.slice(0, 5).map((r) => `• ${formatAchievementLine(r)}`)] : []),
                ...(pending.length ? ["", "⏳ **Pending**", ...pending.slice(0, 5).map((r) => `• ${formatAchievementLine(r)}`)] : []),
              ].join("\n"),
              {
                state_code: stateCode,
                alliance_code: String(allianceFilter || "").toUpperCase(),
                kind: "achievements",
                source: "StateAchievementsExportPanel"
              }
            )}
            disabled={busy || !selectedWebhookIds.length || String(allianceFilter || "").toUpperCase() === "ALL"}
          >
            Send to Selected Webhooks
          </button>

          <button
            className="zombie-btn"
            type="button"
            style={{ padding: "10px 12px" }}
            onClick={() => void loadAllianceWebhooks(String(allianceFilter || ""))}
            disabled={busy}
          >
            Reload Webhooks
          </button>

          <button
            className="zombie-btn"
            type="button"
            style={{ padding: "10px 12px" }}
            onClick={exportPngDownload}
            disabled={busy}
          >
            ⬇️ Export PNG (download)
          </button>
        </div>

        <div style={{ opacity: 0.7, fontSize: 12 }}>
          Pick one alliance, then send to that alliance default webhook or to one or more selected webhooks.
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          {!webhooks.length ? (
            <div style={{ opacity: 0.7, fontSize: 12 }}>
              No webhooks found for this alliance. Add them in the alliance Discord webhooks page.
            </div>
          ) : webhooks.map((w: any) => {
            const id = String(w.id || "");
            const label = String((w.label || w.name || "Webhook") + " • " + id);
            return (
              <label key={id} style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={selectedWebhookIds.includes(id)}
                  onChange={() => toggleWebhook(id)}
                />
                <span>{label}</span>
              </label>
            );
          })}
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
                  <div key={i}>• {formatAchievementLine(r)}</div>
                ))}
                {completed.length > 12 ? <div>… +{completed.length - 12} more</div> : null}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 900 }}>🧬 In Progress ({progress.length})</div>
              <div style={{ opacity: 0.85, fontSize: 12, marginTop: 4 }}>
                {progress.slice(0, 12).map((r, i) => (
                  <div key={i}>• {formatAchievementLine(r)}</div>
                ))}
                {progress.length > 12 ? <div>… +{progress.length - 12} more</div> : null}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 900 }}>⏳ Pending ({pending.length})</div>
              <div style={{ opacity: 0.85, fontSize: 12, marginTop: 4 }}>
                {pending.slice(0, 12).map((r, i) => (
                  <div key={i}>• {formatAchievementLine(r)}</div>
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


































// deploy tick 2026-03-08T12:06:12



// cf redeploy tick 2026-03-08T12:48:48

// deploy check 2026-03-08T12:51:56

// pages stamp 2026-03-08T12:58:58


