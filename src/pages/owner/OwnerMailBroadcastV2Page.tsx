import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type MapRow = { alliance_code: string; alliance_id: string };

export default function OwnerMailBroadcastV2Page() {
  const [alliances, setAlliances] = useState<MapRow[]>([]);
  const [allianceCode, setAllianceCode] = useState("SDS");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      const r = await supabase.from("alliance_code_map").select("alliance_code,alliance_id").order("alliance_code", { ascending: true });
      if (!r.error) {
        setAlliances((r.data ?? []) as any);
        if ((r.data ?? []).length && !allianceCode) setAllianceCode(String((r.data as any)[0].alliance_code));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send() {
    if (!allianceCode) return alert("Pick an alliance.");
    if (!body.trim()) return alert("Body required.");
    setStatus("Sending…");

    const r = await supabase.rpc("mail_send_broadcast", {
      p_alliance_code: allianceCode,
      p_subject: subject || null,
      p_body: body,
    });

    if (r.error) { setStatus(r.error.message); return; }
    setStatus("Queued ✅ (shows in members' mail)");
    setSubject("");
    setBody("");
    window.setTimeout(() => setStatus(""), 1200);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>📣 Owner Mail Broadcast (v2)</h2>
        <SupportBundleButton />
      </div>

      <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>{status}</div>

      <div className="zombie-card" style={{ marginTop: 12, padding: 14, borderRadius: 16 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <label>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Alliance</div>
            <select value={allianceCode} onChange={(e) => setAllianceCode(e.target.value)}>
              {alliances.map((a) => (
                <option key={a.alliance_code} value={a.alliance_code}>{a.alliance_code}</option>
              ))}
            </select>
          </label>

          <label>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Subject (optional)</div>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>

          <label>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Message</div>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="button" onClick={() => void send()}>Send Broadcast</button>
          </div>
        </div>
      </div>
    </div>
  );
}
