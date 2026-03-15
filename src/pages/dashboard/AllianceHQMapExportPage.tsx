import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toPng } from "html-to-image";
import { supabase } from "../../lib/supabaseClient";
import AllianceHQMap from "./AllianceHQMap";

function tsLabel() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function routeStorageKey(allianceCode: string) {
  return `hqMapDiscordRoute:${String(allianceCode || "").trim().toUpperCase()}`;
}

function loadSavedDiscordRoute(allianceCode: string) {
  try {
    const raw = localStorage.getItem(routeStorageKey(allianceCode));
    return String(raw || "").trim();
  } catch {
    return "";
  }
}

function saveDiscordRoute(allianceCode: string, route: string) {
  try {
    localStorage.setItem(routeStorageKey(allianceCode), String(route || "").trim());
  } catch {}
}

export default function AllianceHQMapExportPage() {
  const { alliance_id } = useParams();
  const allianceCode = String(alliance_id || "").trim().toUpperCase();

  const captureRef = useRef<HTMLDivElement | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [lastPublicUrl, setLastPublicUrl] = useState("");

  const [routePreset, setRoutePreset] = useState<"hq-map" | "announcements" | "custom">("hq-map");
  const [customRoute, setCustomRoute] = useState("");

  useEffect(() => {
    const saved = loadSavedDiscordRoute(allianceCode);

    if (saved === "default:hq-map") {
      setRoutePreset("hq-map");
      setCustomRoute("");
      return;
    }

    if (saved === "default:announcements") {
      setRoutePreset("announcements");
      setCustomRoute("");
      return;
    }

    if (saved) {
      setRoutePreset("custom");
      setCustomRoute(saved);
      return;
    }

    setRoutePreset("hq-map");
    setCustomRoute("");
  }, [allianceCode]);

  const sendRoute = useMemo(() => {
    if (routePreset === "hq-map") return "default:hq-map";
    if (routePreset === "announcements") return "default:announcements";
    return String(customRoute || "").trim();
  }, [routePreset, customRoute]);

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

  function handleSaveRoute() {
    const route = String(sendRoute || "").trim();
    if (!route) {
      setMsg("Enter a valid Discord route first.");
      return;
    }

    saveDiscordRoute(allianceCode, route);
    setMsg(`Discord destination saved ✅\nAlliance: ${allianceCode}\nRoute: ${route}`);
  }

  async function queueDiscordSend(url: string) {
    const route = String(sendRoute || "").trim();
    if (!route) throw new Error("Discord route is empty.");

    const content =
      `🗺️ **${allianceCode || "Alliance"} HQ Map Export**\n` +
      `Generated: ${new Date().toLocaleString()}\n` +
      url;

    const q = await supabase.rpc("queue_discord_send" as any, {
      p_kind: "discord_webhook",
      p_target: "alliance:" + allianceCode,
      p_channel_id: route,
      p_content: content,
      p_meta: {
        kind: "hq_map_export",
        source: "AllianceHQMapExportPage",
        alliance_code: allianceCode,
        public_url: url,
        route,
      },
    } as any);

    if (q.error) throw q.error;
  }

  async function handleSendDiscord() {
    setBusy(true);
    setMsg("");
    try {
      const route = String(sendRoute || "").trim();
      if (!route) throw new Error("Choose or enter a Discord route first.");

      const url = lastPublicUrl || (await exportPngAndUpload(false));
      await queueDiscordSend(url);
      setMsg(`Queued to Discord ✅\nRoute: ${route}\n${url}`);
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
            minWidth: 340,
            maxWidth: 460,
            padding: 12,
            pointerEvents: "auto",
            background: "rgba(8,10,14,0.94)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 14 }}>🗺️ HQ Map Tools</div>
          <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4 }}>
            Export this exact page as PNG and choose where the Discord send goes.
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div style={{ opacity: 0.75, fontSize: 12 }}>Discord destination</div>

            <select
              className="zombie-input"
              value={routePreset}
              onChange={(e) => setRoutePreset(e.target.value as any)}
              style={{ padding: "10px 12px", width: "100%" }}
            >
              <option value="hq-map">default:hq-map</option>
              <option value="announcements">default:announcements</option>
              <option value="custom">custom route…</option>
            </select>

            {routePreset === "custom" ? (
              <input
                className="zombie-input"
                value={customRoute}
                onChange={(e) => setCustomRoute(e.target.value)}
                placeholder="Enter route string"
                style={{ padding: "10px 12px", width: "100%" }}
              />
            ) : null}

            <div style={{ opacity: 0.7, fontSize: 12 }}>
              Current send route: <b>{sendRoute || "(none)"}</b>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="zombie-btn" type="button" style={{ padding: "10px 12px" }} onClick={handleSaveRoute} disabled={busy}>
                Save Route
              </button>

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
