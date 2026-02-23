import React, { useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import { supabase } from "../../lib/supabaseClient";

type ChannelEntry = { id: string; name: string; channelId: string; createdUtc: string };
type ChannelMapStore = { version: 1; global: ChannelEntry[]; alliances: Record<string, ChannelEntry[]> };

const CHANNEL_MAP_KEY = "sad_discord_channel_map_v1";

function loadChannelStore(): ChannelMapStore {
  try {
    const raw = localStorage.getItem(CHANNEL_MAP_KEY);
    if (raw) {
      const s = JSON.parse(raw) as ChannelMapStore;
      if (s && s.version === 1) return s;
    }
  } catch {}
  return { version: 1, global: [], alliances: {} };
}

export default function OwnerDiscordEdgeSendTestPage() {
  const store = useMemo(() => loadChannelStore(), []);
  const channels = useMemo(() => (store.global || []).slice(0, 50), [store]);

  const [channelId, setChannelId] = useState<string>(channels[0]?.channelId || "");
  const [content, setContent] = useState<string>("Test message from Supabase Edge Function ✅");
  const [dryRun, setDryRun] = useState<boolean>(true);
  const [result, setResult] = useState<string>("");

  async function send() {
    setResult("Sending...");
    try {
      const { data, error } = await supabase.functions.invoke("discord-broadcast", {
        body: { channelId, content, dryRun },
      });
      if (error) throw error;
      setResult(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setResult(String(e?.message || e));
    }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🧪 Owner — Discord Edge Send Test</h2>
        <SupportBundleButton />
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ opacity: 0.75, fontSize: 12 }}>Channel</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          <select className="zombie-input" value={channelId} onChange={(e) => setChannelId(e.target.value)} style={{ padding: "10px 12px", minWidth: 280 }}>
            {channels.map((c) => (
              <option key={c.id} value={c.channelId}>
                #{c.name} — {c.channelId || "(no id)"}
              </option>
            ))}
          </select>
          <input
            className="zombie-input"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            placeholder="Or paste Channel ID"
            style={{ padding: "10px 12px", minWidth: 260 }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.85 }}>
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
            Dry-run (no Discord send)
          </label>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={send}>
            Send via Edge Function
          </button>
        </div>

        <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>Content</div>
        <textarea className="zombie-input" value={content} onChange={(e) => setContent(e.target.value)} style={{ width: "100%", minHeight: 120, padding: "10px 12px", marginTop: 6 }} />

        <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>Result</div>
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)", marginTop: 6 }}>
{result}
        </pre>
      </div>

      <div style={{ marginTop: 12, opacity: 0.7, fontSize: 12 }}>
        Deploy the function + set DISCORD_BOT_TOKEN, then uncheck Dry-run to actually send.
      </div>
    </div>
  );
}
