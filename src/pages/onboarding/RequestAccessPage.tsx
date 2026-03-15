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

function Pill(props: { text: string }) {
  return (
    <div
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: "0.04em",
        opacity: 0.92,
      }}
    >
      {props.text}
    </div>
  );
}

function StatCard(props: { label: string; value: string; sub: string }) {
  return (
    <div
      className="zombie-card"
      style={{
        padding: 14,
        minHeight: 112,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ opacity: 0.72, fontSize: 11, fontWeight: 900, letterSpacing: "0.12em" }}>{props.label}</div>
      <div style={{ fontSize: 24, fontWeight: 950 }}>{props.value}</div>
      <div style={{ opacity: 0.72, fontSize: 12 }}>{props.sub}</div>
    </div>
  );
}

function SectionCard(props: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div
      className="zombie-card"
      style={{
        padding: 16,
        background: "rgba(0,0,0,0.22)",
      }}
    >
      <div style={{ fontWeight: 950, fontSize: 18 }}>{props.title}</div>
      {props.subtitle ? (
        <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4, marginBottom: 12 }}>{props.subtitle}</div>
      ) : (
        <div style={{ height: 12 }} />
      )}
      {props.children}
    </div>
  );
}

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

    if (res.error) {
      setStatus(res.error.message);
      return;
    }
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

  useEffect(() => {
    void loadDirectory();
    void loadMyRequests();
  }, [stateCode]);

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

    if (ins.error) {
      setStatus(ins.error.message);
      return;
    }

    setStatus(t("common.sent"));
    setAllianceCode("");
    setAllianceId(null);
    setNote("");
    await loadMyRequests();
    window.setTimeout(() => setStatus(""), 1200);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1240, margin: "0 auto", display: "grid", gap: 12 }}>
      <div
        className="zombie-card"
        style={{
          padding: 20,
          background: "linear-gradient(180deg, rgba(16,20,26,0.98), rgba(8,10,14,0.94))",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ minWidth: 280 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <Pill text="ONBOARDING" />
              <Pill text="ACCESS REQUEST" />
              <Pill text={`STATE ${stateCode}`} />
            </div>

            <h1 style={{ fontSize: 32, fontWeight: 950, margin: 0, lineHeight: 1.05 }}>
              {t("onboarding.title")}
            </h1>

            <div style={{ opacity: 0.84, marginTop: 10, lineHeight: 1.7, maxWidth: 820 }}>
              Request access to your alliance dashboard, attach your in-game details, and track approval status from one cleaner onboarding page.
            </div>

            <div style={{ opacity: 0.72, marginTop: 10, fontSize: 12 }}>
              {userId ? `${t("onboarding.signedIn")} ✅` : t("onboarding.notSignedIn")}
              {status ? " • " + status : ""}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" type="button" onClick={() => void loadDirectory()} style={{ padding: "10px 12px" }}>
              {t("onboarding.reloadDirectory")}
            </button>
            <button className="zombie-btn" type="button" onClick={() => void loadMyRequests()} style={{ padding: "10px 12px" }}>
              {t("common.reload")}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <StatCard label="STATE" value={stateCode} sub="Current onboarding state" />
        <StatCard label="ALLIANCES" value={String(directory.length)} sub="Available from directory" />
        <StatCard label="MY REQUESTS" value={String(myReqs.length)} sub="Recent onboarding history" />
        <StatCard label="SESSION" value={userId ? "READY" : "SIGN IN"} sub={userId ? "You can submit requests" : "Authentication required"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, 0.85fr)", gap: 12, alignItems: "start" }}>
        <SectionCard
          title={t("onboarding.request")}
          subtitle="Choose your alliance from the directory and send an onboarding request."
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ opacity: 0.75, fontSize: 12, fontWeight: 800 }}>{t("onboarding.state")}</div>
              <input
                className="zombie-input"
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                style={{ width: 100, padding: "10px 12px" }}
              />
              <button className="zombie-btn" type="button" onClick={() => void loadDirectory()} style={{ padding: "10px 12px" }}>
                {t("onboarding.reloadDirectory")}
              </button>
            </div>

            <div>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>{t("onboarding.allianceFromDirectory")}</div>
              <select
                className="zombie-input"
                value={allianceCode}
                onChange={(e) => setAllianceCode(e.target.value)}
                style={{ width: "100%", padding: "10px 12px" }}
              >
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

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
              <div>
                <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>{t("onboarding.displayName")}</div>
                <input
                  className="zombie-input"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Display name"
                  style={{ width: "100%", padding: "10px 12px" }}
                />
              </div>

              <div>
                <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>{t("onboarding.gameName")}</div>
                <input
                  className="zombie-input"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="In-game name"
                  style={{ width: "100%", padding: "10px 12px" }}
                />
              </div>
            </div>

            <div>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>{t("onboarding.discordName")}</div>
              <input
                className="zombie-input"
                value={discordName}
                onChange={(e) => setDiscordName(e.target.value)}
                placeholder="Discord name"
                style={{ width: "100%", padding: "10px 12px" }}
              />
            </div>

            <div>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>{t("onboarding.notes")}</div>
              <textarea
                className="zombie-input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder="Anything the owner team should know?"
                style={{ width: "100%", padding: "10px 12px" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <button
                className="zombie-btn"
                disabled={!userId}
                onClick={submit}
                style={{ padding: "12px 14px", fontWeight: 900 }}
              >
                {t("onboarding.submitRequest")}
              </button>
            </div>
          </div>
        </SectionCard>

        <div style={{ display: "grid", gap: 12 }}>
          <SectionCard
            title="How this works"
            subtitle="The request flow stays the same. Only the page design changes."
          >
            <div style={{ display: "grid", gap: 10 }}>
              <div className="zombie-card" style={{ padding: 12, background: "rgba(255,255,255,0.03)" }}>
                <div style={{ fontWeight: 900 }}>1. Choose your alliance</div>
                <div style={{ opacity: 0.78, marginTop: 6, lineHeight: 1.55 }}>
                  Pick your alliance from the live state directory so the request maps to the correct dashboard.
                </div>
              </div>

              <div className="zombie-card" style={{ padding: 12, background: "rgba(255,255,255,0.03)" }}>
                <div style={{ fontWeight: 900 }}>2. Add your player details</div>
                <div style={{ opacity: 0.78, marginTop: 6, lineHeight: 1.55 }}>
                  Give the owner team enough detail to verify who you are and where you belong.
                </div>
              </div>

              <div className="zombie-card" style={{ padding: 12, background: "rgba(255,255,255,0.03)" }}>
                <div style={{ fontWeight: 900 }}>3. Wait for approval</div>
                <div style={{ opacity: 0.78, marginTop: 6, lineHeight: 1.55 }}>
                  Your request stays visible below so you can track pending, approved, or rejected status.
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title={t("onboarding.myRequests")}
            subtitle="Your recent onboarding requests."
          >
            {myReqs.length === 0 ? (
              <div style={{ opacity: 0.75 }}>{t("onboarding.noRequests")}</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {myReqs.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: 12,
                      padding: 12,
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>
                      {r.state_code} • {r.alliance_code} • <span style={{ opacity: 0.92 }}>{r.status}</span> {r.provisioned ? "• ✅" : ""}
                    </div>
                    <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <button className="zombie-btn" type="button" onClick={() => void loadMyRequests()} style={{ padding: "10px 12px" }}>
                {t("common.reload")}
              </button>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
