import React, { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toPng } from "html-to-image";
import { supabase } from "../../lib/supabaseClient";
import AllianceHQMap from "./AllianceHQMap";

function tsLabel() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export default function AllianceHQMapExportPage() {
  const { alliance_id } = useParams();
  const allianceCode = String(alliance_id || "").trim().toUpperCase();

  const captureRef = useRef<HTMLDivElement | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [lastPublicUrl, setLastPublicUrl] = useState("");

  async function exportPngAndUpload(downloadAlso = true) {
    if (!captureRef.current) {
      throw new Error("HQ map capture area not found.");
    }

    const dataUrl = await toPng(captureRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#0b1117",
    });

    if (downloadAlso) {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${allianceCode || "alliance"}-hq-map-${tsLabel()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    const blob = await (await fetch(dataUrl)).blob();
    const name = `alliance-${allianceCode || "unknown"}/hq-map-${tsLabel()}.png`;

    const up = await supabase.storage
      .from("exports")
      .upload(name, blob, { contentType: "image/png", upsert: true });

    if (up.error) throw up.error;

    const pub = supabase.storage.from("exports").getPublicUrl(name);
    const url = pub?.data?.publicUrl;
    if (!url) throw new Error("Public URL missing after upload.");

    setLastPublicUrl(url);
    return url;
  }

  async function handleExport() {
    setBusy(true);
    setMsg("");
    try {
      const url = await exportPngAndUpload(true);
      setMsg(`PNG exported ✅\n${url}`);
    } catch (e: any) {
      setMsg(`Export failed: ${String(e?.message || e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyLink() {
    setBusy(true);
    setMsg("");
    try {
      const url = lastPublicUrl || (await exportPngAndUpload(false));
      await navigator.clipboard.writeText(url);
      setMsg(`PNG link copied ✅\n${url}`);
    } catch (e: any) {
      setMsg(`Copy failed: ${String(e?.message || e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function queueDiscordSend(url: string) {
    const content =
      `🗺️ **${allianceCode || "Alliance"} HQ Map Export**\n` +
      `Generated: ${new Date().toLocaleString()}\n` +
      url;

    const tryQueue = async (channelId: string) => {
      return supabase.rpc("queue_discord_send" as any, {
        p_kind: "discord_webhook",
        p_target: "alliance:" + allianceCode,
        p_channel_id: channelId,
        p_content: content,
        p_meta: {
          kind: "hq_map_export",
          source: "AllianceHQMapExportPage",
          alliance_code: allianceCode,
          public_url: url,
        },
      } as any);
    };

    let q = await tryQueue("default:hq-map");
    if (q.error) {
      q = await tryQueue("default:announcements");
    }

    if (q.error) throw q.error;
  }

  async function handleSendDiscord() {
    setBusy(true);
    setMsg("");
    try {
      const url = lastPublicUrl || (await exportPngAndUpload(false));
      await queueDiscordSend(url);
      setMsg(`Queued to Discord ✅\n${url}`);
    } catch (e: any) {
      setMsg(`Discord send failed: ${String(e?.message || e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          position: "sticky",
          top: 12,
          zIndex: 30,
          display: "flex",
          justifyContent: "flex-end",
          pointerEvents: "none",
          paddingBottom: 12,
        }}
      >
        <div
          className="zombie-card"
          style={{
            minWidth: 320,
            maxWidth: 420,
            padding: 12,
            pointerEvents: "auto",
            background: "rgba(8,10,14,0.94)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 14 }}>🗺️ HQ Map Tools</div>
          <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4 }}>
            Export this exact page as PNG and send the PNG link to Discord.
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <button className="zombie-btn" type="button" style={{ padding: "10px 12px" }} disabled={busy} onClick={handleExport}>
              {busy ? "WORKING..." : "Export PNG"}
            </button>

            <button className="zombie-btn" type="button" style={{ padding: "10px 12px" }} disabled={busy} onClick={handleCopyLink}>
              Copy PNG Link
            </button>

            <button className="zombie-btn" type="button" style={{ padding: "10px 12px" }} disabled={busy} onClick={handleSendDiscord}>
              Send to Discord
            </button>
          </div>

          {msg ? (
            <div style={{ marginTop: 10, whiteSpace: "pre-wrap", fontSize: 12, opacity: 0.88 }}>
              {msg}
            </div>
          ) : null}
        </div>
      </div>

      <div ref={captureRef}>
        <AllianceHQMap />
      </div>
    </div>
  );
}
