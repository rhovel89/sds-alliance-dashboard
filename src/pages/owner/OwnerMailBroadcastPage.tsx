import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";

type Kind = "alliance_broadcast" | "state_broadcast";

async function copyToClipboard(text: string) {
  try { await navigator.clipboard.writeText(text); alert("Copied"); }
  catch { alert("Copy failed"); }
}

export default function OwnerMailBroadcastPage() {
  const [userId, setUserId] = useState<string>("");
  const [kind, setKind] = useState<Kind>("alliance_broadcast");
  const [allianceCode, setAllianceCode] = useState("");
  const [stateCode, setStateCode] = useState("789");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? "");
    })();
  }, []);

  async function send() {
    const b = body.trim();
    if (!b) return alert("Body required.");
    if (kind === "alliance_broadcast" && !allianceCode.trim()) return alert("Alliance code required.");
    if (kind === "state_broadcast" && !stateCode.trim()) return alert("State code required.");

    setLoading(true);
    setStatus("Sending…");

    const payload: any = {
      created_by_user_id: userId,
      kind,
      subject: subject.trim(),
      body: b,
      alliance_code: kind === "alliance_broadcast" ? allianceCode.trim() : null,
      state_code: kind === "state_broadcast" ? stateCode.trim() : null,
    };

    const ins = await supabase.from("mail_items").insert(payload).select("*").single();
    if (ins.error) {
      setStatus(ins.error.message);
      setLoading(false);
      return;
    }

    setStatus("Sent ✅ (payload copied)");
    window.setTimeout(() => setStatus(""), 1500);

    await copyToClipboard(JSON.stringify(ins.data, null, 2));
    setSubject("");
    setBody("");
    setLoading(false);
  }

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Owner Mail Broadcast</h1>
      <div style={{ opacity: 0.8, marginTop: 6 }}>
        Creates DB mail items for players to read in <code>/mail-v2</code>. {status ? " • " + status : ""}
      </div>

      <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden", marginTop: 12 }}>
        <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>Compose</div>
        <div style={{ padding: 12, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ opacity: 0.8 }}>Kind</label>
            <select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
              <option value="alliance_broadcast">alliance broadcast</option>
              <option value="state_broadcast">state broadcast</option>
            </select>

            {kind === "alliance_broadcast" ? (
              <>
                <label style={{ opacity: 0.8 }}>Alliance code</label>
                <input value={allianceCode} onChange={(e) => setAllianceCode(e.target.value)} placeholder="ex: ABC" />
              </>
            ) : (
              <>
                <label style={{ opacity: 0.8 }}>State</label>
                <input value={stateCode} onChange={(e) => setStateCode(e.target.value)} style={{ width: 120 }} />
              </>
            )}
          </div>

          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (optional)..." />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Broadcast message..." />

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button onClick={() => copyToClipboard(body)}>Copy body</button>
            <button disabled={loading || !userId} onClick={send}>Send to Mail DB</button>
          </div>
        </div>
      </div>
    </div>
  );
}
