import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toPng } from "html-to-image";
import { supabase } from "../../lib/supabaseClient";
import AllianceHQMap from "./AllianceHQMap";

type WebhookRow = {
  id: string;
  alliance_code: string;
  label: string | null;
  webhook_url: string;
  active: boolean | null;
};

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

  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [selectedWebhookId, setSelectedWebhookId] = useState("");
  const [defaultWebhookId, setDefaultWebhookId] = useState("");

  const activeWebhooks = useMemo(
    () => webhooks.filter((w) => w.active !== false),
    [webhooks]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDiscordSettings() {
      try {
        const hooks = await supabase
          .from("alliance_discord_webhooks")
          .select("*")
          .eq("alliance_code", allianceCode)
          .order("created_at", { ascending: false });

        if (hooks.error) throw hooks.error;

        const rows = (hooks.data || []) as WebhookRow[];
        if (cancelled) return;

        setWebhooks(rows);

        const def = await supabase
          .from("alliance_discord_webhook_defaults")
          .select("webhook_id")
          .eq("alliance_code", allianceCode)
          .eq("kind", "hq_map")
          .maybeSingle();

        if (!cancelled) {
          const wid = String((def.data as any)?.webhook_id || "").trim();
          setDefaultWebhookId(wid);

          if (wid && rows.some((x) => String(x.id) === wid && x.active !== false)) {
            setSelectedWebhookId(wid);
          } else {
            const first = rows.find((x) => x.active !== false);
            setSelectedWebhookId(String(first?.id || ""));
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setMsg("Discord settings load failed: " + String(e?.message || e));
        }
      }
    }

    if (allianceCode) {
      void loadDiscordSettings();
    }

    return () => {
      cancelled = true;
    };
  }, [allianceCode]);

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

  async function handleSaveDefault() {
    const webhookId = String(selectedWebhookId || "").trim();
    if (!webhookId) {
      setMsg("Pick a webhook first.");
      return;
    }

    setBusy(true);
    setMsg("");

    try {
      const me = await supabase.auth.getUser();
      const uid = me.data?.user?.id || null;

      const up = await supabase
        .from("alliance_discord_webhook_defaults")
        .upsert(
          {
            alliance_code: allianceCode,
            kind: "hq_map",
            webhook_id: webhookId,
            updated_at: new Date().toISOString(),
            updated_by: uid,
          } as any,
          { onConflict: "alliance_code,kind" } as any
        );

      if (up.error) throw up.error;

      setDefaultWebhookId(webhookId);
      setMsg("HQ Map default saved ✅");
    } catch (e: any) {
      setMsg("Save default failed: " + String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function queueDiscordSend(url: string) {
    const webhookId = String(selectedWebhookId || "").trim();
    if (!webhookId) throw new Error("Choose a webhook first.");

    const label =
      activeWebhooks.find((x) => String(x.id) === webhookId)?.label ||
      webhookId;

    const content =
      `🗺️ **${allianceCode || "Alliance"} HQ Map Export**\n` +
      `Generated: ${new Date().toLocaleString()}\n` +
      url;

    const q = await supabase.rpc("queue_discord_send" as any, {
      p_kind: "discord_webhook",
      p_target: `alliance:${allianceCode}`,
      p_channel_id: webhookId,
      p_content: content,
      p_meta: {
        kind: "hq_map_export",
        source: "AllianceHQMapExportPage",
        alliance_code: allianceCode,
        webhook_id: webhookId,
        webhook_label: label,
        public_url: url,
      },
    } as any);

    if (q.error) throw q.error;
  }

  async function handleSendDiscord() {
    setBusy(true);
    setMsg("");

    try {
      const webhookId = String(selectedWebhookId || "").trim();
      if (!webhookId) throw new Error("Choose a webhook first.");

      const url = lastPublicUrl || (await exportPngAndUpload(false));
      await queueDiscordSend(url);

      const label =
        activeWebhooks.find((x) => String(x.id) === webhookId)?.label ||
        webhookId;

      setMsg(`Queued to Discord ✅\nWebhook: ${label}\n${url}`);
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
            minWidth: 360,
            maxWidth: 480,
            padding: 12,
            pointerEvents: "auto",
            background: "rgba(8,10,14,0.94)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 14 }}>🗺️ HQ Map Tools</div>
          <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4 }}>
            Export this exact page as PNG and send it using the same webhook system already used in Discord settings.
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div style={{ opacity: 0.75, fontSize: 12 }}>Webhook destination</div>

            <select
              className="zombie-input"
              value={selectedWebhookId}
              onChange={(e) => setSelectedWebhookId(e.target.value)}
              style={{ padding: "10px 12px", width: "100%" }}
            >
              <option value="">(select webhook)</option>
              {activeWebhooks.map((w) => (
                <option key={w.id} value={w.id}>
                  {String(w.label || w.id)}
                  {String(defaultWebhookId) === String(w.id) ? " — default" : ""}
                </option>
              ))}
            </select>

            <div style={{ opacity: 0.7, fontSize: 12 }}>
              Default for HQ Map:{" "}
              <b>
                {activeWebhooks.find((x) => String(x.id) === String(defaultWebhookId))?.label ||
                  (defaultWebhookId ? defaultWebhookId : "(none)")}
              </b>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="zombie-btn"
                type="button"
                style={{ padding: "10px 12px" }}
                onClick={handleSaveDefault}
                disabled={busy || !selectedWebhookId}
              >
                Save HQ Map Default
              </button>

              <button
                className="zombie-btn"
                type="button"
                style={{ padding: "10px 12px" }}
                disabled={busy}
                onClick={handleExport}
              >
                {busy ? "WORKING..." : "Export PNG"}
              </button>

              <button
                className="zombie-btn"
                type="button"
                style={{ padding: "10px 12px" }}
                disabled={busy}
                onClick={handleCopyLink}
              >
                Copy PNG Link
              </button>

              <button
                className="zombie-btn"
                type="button"
                style={{ padding: "10px 12px" }}
                disabled={busy || !selectedWebhookId}
                onClick={handleSendDiscord}
              >
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
