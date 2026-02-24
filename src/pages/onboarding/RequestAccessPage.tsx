import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
    setStatus(t("common.loading"));
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
    const res = await supabase
      .from("v_my_onboarding_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25);

    if (!res.error) setMyReqs((res.data ?? []) as any);
  }

  useEffect(() => { void loadDirectory(); void loadMyRequests(); }, [stateCode]);

  const selectedDir = useMemo(
    () => directory.find((d) => d.alliance_code === allianceCode) ?? null,
    [directory, allianceCode]
  );

  useEffect(() => {
    if (selectedDir) setAllianceId(selectedDir.alliance_id);
    else setAllianceId(null);
  }, [selectedDir]);

  async function submit() {
    if (!userId) return alert("Please sign in first.");
    const code = allianceCode.trim();
    if (!code) return alert("Select an alliance.");
    if (!playerName.trim() && !gameName.trim()) return alert("Enter at least a display name or game name.");

    setStatus(t("common.sending"));

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

    setStatus(t("common.sent"));
    setAllianceCode("");
    setAllianceId(null);
    setNote("");
    await loadMyRequests();
    window.setTimeout(() => setStatus(""), 1200);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>{t("onboarding.title")}</h1>
      <div style={{ opacity: 0.8, marginTop: 6 }}>
        {userId ? `${t("onboarding.signedIn")} ✅` : t("onboarding.notSignedIn")}
        {status ? " • " + status : ""}
      </div>

      <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden", marginTop: 12 }}>
        <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>{t("onboarding.request")}</div>
        <div style={{ padding: 12, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ opacity: 0.75 }}>{t("onboarding.state")}</label>
            <input value={stateCode} onChange={(e) => setStateCode(e.target.value)} style={{ width: 90 }} />
            <button onClick={loadDirectory}>{t("onboarding.reloadDirectory")}</button>
          </div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12 }}>{t("onboarding.allianceFromDirectory")}</div>
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
              <div style={{ opacity: 0.75, fontSize: 12 }}>{t("onboarding.displayName")}</div>
              <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="…" />
            </div>
            <div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>{t("onboarding.gameName")}</div>
              <input value={gameName} onChange={(e) => setGameName(e.target.value)} placeholder="…" />
            </div>
          </div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12 }}>{t("onboarding.discordName")}</div>
            <input value={discordName} onChange={(e) => setDiscordName(e.target.value)} placeholder="…" />
          </div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12 }}>{t("onboarding.notes")}</div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="…" />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button disabled={!userId} onClick={submit}>{t("onboarding.submitRequest")}</button>
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden", marginTop: 16 }}>
        <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>{t("onboarding.myRequests")}</div>
        <div style={{ padding: 12 }}>
          {myReqs.length === 0 ? (
            <div style={{ opacity: 0.75 }}>{t("onboarding.noRequests")}</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {myReqs.map((r) => (
                <div key={r.id} style={{ border: "1px solid #222", borderRadius: 10, padding: 10 }}>
                  <div style={{ fontWeight: 900 }}>
                    {r.state_code} • {r.alliance_code} • <span style={{ opacity: 0.9 }}>{r.status}</span> {r.provisioned ? "• ✅" : ""}
                  </div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>{new Date(r.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            <button onClick={loadMyRequests}>{t("common.reload")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
