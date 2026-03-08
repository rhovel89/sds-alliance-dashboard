import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

function s(v: any) { return v === null || v === undefined ? "" : String(v); }

type AllianceRow = { alliance_code: string; role: string | null };

export default function StateThreadsDefaultDiscordPanel(props: { stateCode: string }) {
  const stateCode = s(props.stateCode || "789") || "789";
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const [alliances, setAlliances] = useState<AllianceRow[]>([]);
  const [selected, setSelected] = useState("");
  const [msg, setMsg] = useState(`🧟 State ${stateCode} — Threads update`);

  const canSend = useMemo(() => !!selected, [selected]);

  async function loadAlliances() {
    setStatus("");
    setLoading(true);

    const me = await supabase.auth.getUser();
    const uid = me.data?.user?.id || "";
    if (!uid) { setLoading(false); setStatus("Not signed in."); return; }

    // Resolve player_id (canonical)
    const link = await supabase
      .from("player_auth_links")
      .select("player_id")
      .eq("user_id", uid)
      .maybeSingle();

    const pid = s(link.data?.player_id);
    if (!pid) { setLoading(false); setStatus("No player link found (player_auth_links)."); return; }

    const r = await supabase
      .from("player_alliances")
      .select("alliance_code,role")
      .eq("player_id", pid)
      .order("alliance_code", { ascending: true });

    setLoading(false);

    if (r.error) { setStatus(r.error.message); setAlliances([]); return; }

    const rows = (r.data || []) as any as AllianceRow[];
    setAlliances(rows);
    if (!selected && rows.length) setSelected(String(rows[0].alliance_code || "").toUpperCase());
  }

  useEffect(() => { loadAlliances(); }, []);

  async function queueSend() {
    try {
      setStatus("");
      if (!canSend) { setStatus("Pick an alliance first."); return; }

      const allianceCode = s(selected).trim().toUpperCase();
      const content = s(msg).trim();
      if (!content) { setStatus("Message is empty."); return; }

      const q = await supabase.rpc("queue_discord_send", {
        p_kind: "discord_webhook",
        p_target: `alliance:${allianceCode}`,
        p_channel_id: "default:threads",
        p_content: content,
        p_meta: { state_code: stateCode, alliance_code: allianceCode, kind: "threads", route: "/state/789/threads" },
      } as any);

      if ((q as any)?.error) { setStatus((q as any).error.message || "Queue failed"); return; }

      setStatus("Queued ✅ (default threads webhook)");
      window.setTimeout(() => setStatus(""), 1200);
    } catch (e: any) {
      setStatus(String(e?.message || e || "Send failed"));
    }
  }

  return (
    <div style={{
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(255,255,255,0.03)",
      borderRadius: 14,
      padding: 12,
      marginBottom: 12
    }}>
      <div style={{ fontWeight: 950 }}>🧵 Threads → Discord (Default)</div>
      <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
        Sends to this alliance’s default webhook for kind <b>threads</b>. (Multiple webhooks per alliance still supported.)
      </div>

      {status ? (
        <div style={{ marginTop: 10, border: "1px solid rgba(176,18,27,0.35)", background: "rgba(176,18,27,0.12)", borderRadius: 12, padding: 10 }}>
          {status}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginTop: 10 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            style={{
              minWidth: 240,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(255,255,255,0.92)"
            }}
          >
            <option value="">(pick alliance)</option>
            {alliances.map((a, i) => (
              <option key={i} value={String(a.alliance_code || "").toUpperCase()}>
                {String(a.alliance_code || "").toUpperCase()} {a.role ? `(${a.role})` : ""}
              </option>
            ))}
          </select>

          <button className="zombie-btn" type="button" onClick={loadAlliances} disabled={loading}>
            Refresh
          </button>

          <button className="zombie-btn" type="button" onClick={queueSend} disabled={!canSend}>
            Queue Send
          </button>
        </div>

        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          rows={3}
          placeholder="What should Discord receive?"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.25)",
            color: "rgba(255,255,255,0.92)",
            resize: "vertical"
          }}
        />
      </div>
    </div>
  );
}


