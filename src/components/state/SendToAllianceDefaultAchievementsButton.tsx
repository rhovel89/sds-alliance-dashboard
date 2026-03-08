import React, { useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type AnyRow = any;

function s(v: any) { return v === null || v === undefined ? "" : String(v); }

export default function SendToAllianceDefaultAchievementsButton(props: {
  stateCode: string;
  allianceFilter: string;
  requests: AnyRow[];
}) {
  const { stateCode, allianceFilter, requests } = props;
  const [status, setStatus] = useState("");

  const allianceCode = useMemo(() => s(allianceFilter).trim().toUpperCase(), [allianceFilter]);
  const canSend = useMemo(() => {
    const a = s(allianceCode).trim().toLowerCase();
    if (!a) return false;
    if (a === "all" || a === "all alliances") return false;
    return true;
  }, [allianceCode]);

  async function send() {
    try {
      setStatus("");
      if (!canSend) {
        setStatus("Pick an alliance filter (not All) to use defaults.");
        return;
      }

      const items = (Array.isArray(requests) ? requests : [])
        .filter((r: any) => {
          const ac = s(r?.alliance_code || r?.alliance || r?.alliance_name).trim().toUpperCase();
          return !allianceCode || ac === allianceCode;
        })
        .slice(0, 25);

      const header = `🩸 State ${stateCode} — Achievements Intel (${allianceCode})`;
      const body = items
        .map((r: any) => {
          const title = s(r?.achievement_name || r?.title || r?.type_name || "Achievement").trim();
          const who = s(r?.player_name || r?.player || r?.name).trim();
          return who ? `• ${who}: ${title}` : `• ${title}`;
        })
        .join("\n");

      const msg = body ? `${header}\n${body}` : header;

      const q = await supabase.rpc("queue_discord_send", {
        p_kind: "discord_webhook",
        p_target: `alliance:${allianceCode}`,
        p_channel_id: "default:achievements",
        p_content: msg,
        p_meta: { alliance_code: allianceCode,  state_code: stateCode, alliance_code: allianceCode, kind: "achievements" },
      } as any);

      if ((q as any)?.error) {
        setStatus((q as any).error.message || "Queue failed");
        return;
      }

      setStatus("Queued ✅ (default webhook)");
      window.setTimeout(() => setStatus(""), 1200);
    } catch (e: any) {
      setStatus(String(e?.message || e || "Send failed"));
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
      <button className="zombie-btn" type="button" onClick={send} disabled={!canSend}>
        Send to Alliance Default (Achievements)
      </button>
      {!canSend ? (
        <div style={{ opacity: 0.72, fontSize: 12 }}>
          Pick an alliance filter (not All) to use defaults.
        </div>
      ) : null}
      {status ? <div style={{ opacity: 0.85, fontSize: 12 }}>{status}</div> : null}
    </div>
  );
}

