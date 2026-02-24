import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";

type DirEntry = {
  id: string;
  state_code: string;
  alliance_code: string;
  tag: string;
  name: string;
  alliance_id: string | null;
  active: boolean;
  sort_order: number;
};

type Req = {
  id: string;
  created_at: string;
  state_code: string;
  alliance_code: string;
  player_name: string;
  game_name: string;
  discord_name: string;
  note: string;
  status: "pending" | "approved" | "rejected";
  provisioned: boolean;
};

export default function RequestAccessPage() {
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState("");

  const [stateCode, setStateCode] = useState("789");
  const [directory, setDirectory] = useState<DirEntry[]>([]);
  const [allianceCode, setAllianceCode] = useState("");
  const [allianceId, setAllianceId] = useState<string | null>(null);

  const [playerName, setPlayerName] = useState("");
  const [gameName, setGameName] = useState("");
  const [discordName, setDiscordName] = useState("");
  const [note, setNote] = useState("");

  const [myReqs, setMyReqs] = useState<Req[]>([]);

  useEffect(() => {
    (async () => {
      const u = await supabase.auth.getUser();
      setUserId(u.data.user?.id ?? "");
    })();
  }, []);

  async function loadDirectory() {
    setStatus("Loading directory…");
    const res = await supabase
      .from("alliance_directory_entries")
      .select("*")
      .eq("state_code", stateCode)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("alliance_code", { ascending: true });

    if (res.error) { setStatus(res.error.message); return; }
    setDirectory((res.data ?? []) as any);
    setStatus("");
  }

  async function loadMyRequests() {
    const res = await supabase.from("v_my_onboarding_requests").select("*").order("created_at", { ascending: false }).limit(25);
    if (!res.error) setMyReqs((res.data ?? []) as any);
  }

  useEffect(() => { void loadDirectory(); void loadMyRequests(); }, [stateCode]);

  const selectedDir = useMemo(() => directory.find((d) => d.alliance_code === allianceCode) ?? null, [directory, allianceCode]);

  useEffect(() => {
    if (selectedDir) setAllianceId(selectedDir.alliance_id);
    else setAllianceId(null);
  }, [selectedDir]);

  async function submit() {
    if (!userId) return alert("Please sign in first.");
    const code = allianceCode.trim();
    if (!code) return alert("Select an alliance.");
    if (!playerName.trim() && !gameName.trim()) return alert("Enter at least a display name or game name.");

    setStatus("Submitting…");

    const ins = await supabase.from("onboarding_requests").insert({
      state_code: stateCode,
      alliance_code: code,
      alliance_id: allianceId,
      requester_user_id: userId,
      player_name: playerName.trim(),
      game_name: gameName.trim(),
      discord_name: discordName.trim(),
      note: note.trim(),
      status: "pending",
    });

    if (ins.error) { setStatus(ins.error.message); return; }

    setStatus("Submitted ✅");
    setAllianceCode("");
    setAllianceId(null);
    setNote("");
    await loadMyRequests();
    window.setTimeout(() => setStatus(""), 1200);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Request Access</h1>
      <div style={{ opacity: 0.8, marginTop: 6 }}>
        {userId ? "Signed in ✅" : "Not signed in"} {status ? " • " + status : ""}
      </div>

      <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden", marginTop: 12 }}>
        <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>Request</div>
        <div style={{ padding: 12, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ opacity: 0.75 }}>State</label>
            <input value={stateCode} onChange={(e) => setStateCode(e.target.value)} style={{ width: 90 }} />
            <button onClick={loadDirectory}>Reload Directory</button>
          </div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12 }}>Alliance (from Directory)</div>
            <select value={allianceCode} onChange={(e) => setAllianceCode(e.target.value)}>
              <option value="">(select)</option>
              {directory.map((d) => (
                <option key={d.id} value={d.alliance_code}>
                  {d.alliance_code}{d.tag ? ` [${d.tag}]` : ""}{d.name ? ` — ${d.name}` : ""}
                </option>
              ))}
            </select>
            <div style={{ opacity: 0.6, fontSize: 12, marginTop: 6 }}>
              alliance_id: <code>{allianceId ?? "(none)"}</code>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>Display Name</div>
              <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="What we call you in the app…" />
            </div>
            <div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>Game Name</div>
              <input value={gameName} onChange={(e) => setGameName(e.target.value)} placeholder="In-game name…" />
            </div>
          </div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12 }}>Discord Name (optional)</div>
            <input value={discordName} onChange={(e) => setDiscordName(e.target.value)} placeholder="Discord handle…" />
          </div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12 }}>Notes (optional)</div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Any context for the owner/admin…" />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button disabled={!userId} onClick={submit}>Submit Request</button>
          </div>

          <div style={{ opacity: 0.65, fontSize: 12 }}>
            Your request is not auto-approved. Owner/admin provisions membership manually (RLS enforced).
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden", marginTop: 16 }}>
        <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>My Requests</div>
        <div style={{ padding: 12 }}>
          {myReqs.length === 0 ? (
            <div style={{ opacity: 0.75 }}>No requests yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {myReqs.map((r) => (
                <div key={r.id} style={{ border: "1px solid #222", borderRadius: 10, padding: 10 }}>
                  <div style={{ fontWeight: 900 }}>
                    {r.state_code} • {r.alliance_code} • <span style={{ opacity: 0.9 }}>{r.status}</span> {r.provisioned ? "• ✅ provisioned" : ""}
                  </div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>{new Date(r.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            <button onClick={loadMyRequests}>Refresh My Requests</button>
          </div>
        </div>
      </div>
    </div>
  );
}
