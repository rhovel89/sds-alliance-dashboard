import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import StateAchievementsDossierSheet, { type DossierReqRow } from "./StateAchievementsDossierSheet";
import StateAchievementsAllianceSendPanel from "./StateAchievementsAllianceSendPanel";

// Local helpers (stable + avoids runtime crashes)
const norm = (v: any) => String(v ?? "").trim();
const normLower = (v: any) => norm(v).toLowerCase();


// Local helpers (stable + avoids runtime crashes)


const __norm = (v: any) => String(v ?? "").trim();
const __normLower = (v: any) => __norm(v).toLowerCase();

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




type ChannelRow = { id?: string; channel_name?: string | null; channel_id?: string | null };

function safeSlug(s: string) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "") || "all";
}

async function capturePng(el: HTMLElement): Promise<Blob> {
  // html2canvas is commonly used in this repo; import dynamically to avoid build-time issues if unused elsewhere.
  const mod: any = await import("html2canvas");
  const html2canvas = mod?.default || mod;
  const canvas = await html2canvas(el, { backgroundColor: null, scale: 2, useCORS: true });
  return await new Promise((resolve, reject) => {
    canvas.toBlob((b: any) => (b ? resolve(b) : reject(new Error("PNG blob failed"))), "image/png");
  });
}

export default function StateAchievementsExportPanelV2(props: { stateCode: string }) {
  const stateCode = String(props.stateCode || "");
  const captureRef = useRef<HTMLDivElement | null>(null);

  const [status, setStatus] = useState<string>("");
  const [rows, setRows] = useState<DossierReqRow[]>([]);
  const [allianceFilter, setAllianceFilter] = useState<string>("ALL");

  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [channelId, setChannelId] = useState<string>("");

  const allianceOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) set.add(String(r.alliance_name || r.alliance_code || "Unknown"));
    return ["ALL", ...Array.from(set.values()).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("");
      // 1) Requests (schema-safe)
      const q = await supabase
        .from("state_achievement_requests")
        .select("*")
        .eq("state_code", stateCode)
        .order("created_at", { ascending: false })
        .limit(500);

      if (!cancelled) {
        if (q.error) setStatus(q.error.message);
        setRows(((q.data || []) as any[]).map((r) => r as DossierReqRow));
      }

      // 2) Channels (schema-safe)
      const ch = await supabase
        .from("state_discord_channels")
        .select("*")
        .eq("state_code", stateCode)
        .order("channel_name", { ascending: true });

      if (!cancelled && !ch.error) setChannels((ch.data || []) as any[]);

      // 3) Defaults (schema-safe)
      const d = await supabase
        .from("state_discord_defaults")
        .select("*")
        .eq("state_code", stateCode)
        .maybeSingle();

      if (!cancelled && !d.error && d.data) {
        const obj: any = d.data || {};
        const v = String(obj.achievements_export_channel_id ?? obj.reports_channel_id ?? obj.alerts_channel_id ?? "");
        if (v && !channelId) setChannelId(v);
      }
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateCode]);

  async function downloadPng() {
    try {
      setStatus("Rendering PNG…");
      const el = captureRef.current?.querySelector("#dossier-capture") as HTMLElement | null;
      if (!el) throw new Error("Capture element missing.");

      const blob = await capturePng(el);

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `state-${stateCode}-dossier-${safeSlug(allianceFilter)}.png`;
      a.click();

      setStatus("Downloaded ✅");
      window.setTimeout(() => setStatus(""), 900);
    } catch (e: any) {
      setStatus(String(e?.message || e || "Export failed"));
    }
  }

  async function queueDiscordSend() {
    try {
      const cid = String(channelId || "").trim();
      if (!cid) { setStatus("Pick a Discord channel first."); return; }

      setStatus("Rendering PNG…");
      const el = captureRef.current?.querySelector("#dossier-capture") as HTMLElement | null;
      if (!el) throw new Error("Capture element missing.");
      const blob = await capturePng(el);

      setStatus("Uploading PNG…");
      const name = `state-${stateCode}/dossier-${safeSlug(allianceFilter)}-${Date.now()}.png`;

      // Try common buckets; if none work, we still send text-only
      const buckets = ["state-exports", "exports", "public"];
      let publicUrl = "";

      for (const b of buckets) {
        const up = await supabase.storage.from(b).upload(name, blob, { contentType: "image/png", upsert: true } as any);
        if (!up.error) {
          const pub = supabase.storage.from(b).getPublicUrl(name);
          publicUrl = String((pub as any)?.data?.publicUrl || "");
          break;
        }
      }

      const msg =
        `🩸 **State ${stateCode} — Achievements Dossier**\n` +
        `Filter: **${allianceFilter}**\n` +
        `Generated: ${new Date().toISOString()}\n` +
        (publicUrl ? `PNG: ${publicUrl}` : `PNG upload failed (text-only send).`);

      setStatus("Queueing Discord send…");
      const rpc = await supabase.rpc("queue_discord_send", {
        p_kind: "state_achievements_dossier",
        p_target: "channel",
    p_channel_id: "default:achievements", // per-alliance default
        p_content: msg,
p_meta: { state_code: stateCode, alliance_filter: allianceFilter }
      } as any);

      if (rpc.error) throw rpc.error;

      setStatus("Queued ✅");
      window.setTimeout(() => setStatus(""), 1200);
    } catch (e: any) {
      setStatus(String(e?.message || e || "Discord queue failed"));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontWeight: 950, fontSize: 16 }}>🧟 Dossier Export</div>
      <div style={{ fontSize: 12, opacity: 0.72 }}>
        Export a dossier PNG and dispatch it to Discord via the queue worker.
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ fontSize: 12, opacity: 0.85 }}>
          Alliance
          <select
            value={allianceFilter}
            onChange={(e) => setAllianceFilter(e.target.value)}
            style={{ marginLeft: 8, padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)", color: "rgba(255,255,255,0.92)" }}
          >
            {allianceOptions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>

        <label style={{ fontSize: 12, opacity: 0.85 }}>
          Discord Channel
          <select
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            style={{ marginLeft: 8, padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)", color: "rgba(255,255,255,0.92)" }}
          >
            <option value="">(select)</option>
            {channels.map((c) => (
              <option key={String(c.id || c.channel_id)} value={String(c.channel_id || "")}>
                {String(c.channel_name || c.channel_id || "")}
              </option>
            ))}
          </select>
        </label>

        <button className="zombie-btn" type="button" onClick={downloadPng}>Download PNG</button>
        <button className="zombie-btn" type="button" onClick={queueDiscordSend}>Queue to Discord</button>
      </div>

      {status ? <div style={{ fontSize: 12, opacity: 0.9 }}>{status}</div> : null}

      <div ref={captureRef} style={{ marginTop: 8 }}>
        <StateAchievementsDossierSheet stateCode={stateCode} allianceFilter={allianceFilter} rows={rows} />
      </div>
    </div>
  );
}




