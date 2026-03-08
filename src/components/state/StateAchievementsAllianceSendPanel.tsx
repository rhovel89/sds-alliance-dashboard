import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type RowAny = any;

export default function StateAchievementsAllianceSendPanel(props: {
  stateCode: string;
  allianceCode: string;   // expects ALL or a real alliance code
  requests: RowAny[];
}) {
  const stateCode = String(props.stateCode || "789");
  const alliance = String(props.allianceCode || "ALL").toUpperCase();
  const requests = (props.requests || []) as RowAny[];

  const [rows, setRows] = useState<RowAny[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    if (alliance === "ALL") return [];
    return requests.filter((r: RowAny) => {
      const ac = String(r?.alliance_code || r?.alliance_name || r?.alliance || "").toUpperCase();
      return ac === alliance;
    });
  }, [requests, alliance]);

  const content = useMemo(() => {
    if (alliance === "ALL") return "";
    const top = filtered.slice(0, 25);
    const now = new Date().toLocaleString();
    const header =
      `🩸 **${alliance} — ACHIEVEMENTS INTEL**\n` +
      `State: ${stateCode}\n` +
      `Generated: ${now}\n` +
      `Count: ${filtered.length}\n\n`;

    const lines = top.map((r: RowAny) => {
      const who = String(r?.player_name || r?.game_name || r?.name || "").trim();
      const title = String(r?.achievement_name || r?.title || r?.type_name || r?.kind || "Achievement").trim();
      return `• ${who ? who + " — " : ""}${title}`;
    });

    const link = `\n\nView: ${window.location.origin}/state/${encodeURIComponent(stateCode)}/achievements`;
    return (header + lines.join("\n") + link).slice(0, 1900);
  }, [alliance, stateCode, filtered]);

  async function loadWebhooks() {
    if (alliance === "ALL") { setRows([]); return; }
    setLoading(true);
    setStatus("");
    const r = await supabase
      .from("alliance_discord_webhooks")
      .select("*")
      .eq("alliance_code", alliance)
      .order("created_at", { ascending: false });

    setLoading(false);

    if (r.error) { setStatus(r.error.message); return; }
    const data = (r.data || []) as RowAny[];

    // Prefer kind='achievements' if the column exists; otherwise show all
    const filteredHooks = data.filter((x: RowAny) => {
      const k = String(x?.kind || "").toLowerCase();
      return k ? (k === "achievements") : true;
    });

    setRows(filteredHooks);
    const nextSel: Record<string, boolean> = {};
    for (const x of filteredHooks) nextSel[String(x.id)] = false;
    setSelectedIds(nextSel);
  }

  useEffect(() => { void loadWebhooks(); }, [alliance]);

  function toggle(id: string) {
    setSelectedIds((p) => ({ ...p, [id]: !p[id] }));
  }

  function selectAll(v: boolean) {
    const next: Record<string, boolean> = {};
    for (const x of rows) next[String(x.id)] = v;
    setSelectedIds(next);
  }

  async function queueSend(webhookId: string) {
    const payload = {
      p_state_code: stateCode,
      p_alliance_code: alliance,
      p_webhook_id: webhookId,
      p_content: content,
      p_payload_kind: "achievements",
      p_meta: { alliance_code: alliance,  state_code: stateCode, alliance_code: alliance }
    };

    const r = await supabase.rpc("queue_discord_webhook_send", payload as any);
    if (r.error) throw new Error(r.error.message);
  }

  async function sendDefault() {
    try {
      if (alliance === "ALL") { setStatus("Pick an alliance (not ALL) to send."); return; }
      setStatus("Queueing default…");
      await queueSend("default:achievements");
      setStatus("Queued ✅ (default:achievements)");
    } catch (e: any) {
      setStatus(String(e?.message || e));
    }
  }

  async function sendSelected() {
    try {
      if (alliance === "ALL") { setStatus("Pick an alliance (not ALL) to send."); return; }
      const picks = rows.filter((x: RowAny) => selectedIds[String(x.id)] === true);
      if (picks.length === 0) { setStatus("Select at least 1 channel."); return; }

      setStatus(`Queueing ${picks.length} send(s)…`);
      for (const x of picks) {
        await queueSend(String(x.id));
      }
      setStatus(`Queued ✅ (${picks.length})`);
    } catch (e: any) {
      setStatus(String(e?.message || e));
    }
  }

  if (alliance === "ALL") {
    return (
      <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>
        Choose an alliance filter above to send to that alliance’s Discord channels.
      </div>
    );
  }

  return (
    <div style={{ marginTop: 10, padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,0.14)" }}>
      <div style={{ fontWeight: 950 }}>🛰️ Send to Alliance Discord (Achievements)</div>
      <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
        Uses per-alliance webhooks (channels). Add/remove them in <code>/dashboard/{alliance}/discord-webhooks</code>.
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <button className="zombie-btn" type="button" onClick={sendDefault} disabled={!content}>
          Send to Alliance Default
        </button>
        <button className="zombie-btn" type="button" onClick={sendSelected} disabled={!content || rows.length === 0}>
          Send to Selected Channels
        </button>
        <button className="zombie-btn" type="button" onClick={() => void loadWebhooks()} disabled={loading}>
          Reload
        </button>
        <button className="zombie-btn" type="button" onClick={() => selectAll(true)} disabled={rows.length === 0}>
          Select All
        </button>
        <button className="zombie-btn" type="button" onClick={() => selectAll(false)} disabled={rows.length === 0}>
          Clear
        </button>
      </div>

      {status ? <div style={{ marginTop: 8, opacity: 0.9 }}>{status}</div> : null}

      <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
        {rows.length === 0 ? (
          <div style={{ opacity: 0.75, fontSize: 12 }}>
            No webhooks found for this alliance (or none tagged as achievements). Add one in the alliance webhook UI.
          </div>
        ) : rows.map((x: RowAny) => {
          const id = String(x.id);
          const label = String(x.name || x.label || x.channel_name || x.webhook_name || x.kind || id);
          return (
            <label key={id} style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
              <input type="checkbox" checked={selectedIds[id] === true} onChange={() => toggle(id)} />
              <span style={{ opacity: 0.95 }}>{label}</span>
              <span style={{ opacity: 0.6, fontSize: 12 }}>({String(x.kind || "kind?")})</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

