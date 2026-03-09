import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";
import { supabase } from "../../lib/supabaseClient";

type AnyRow = any;

function s(v: any) {
  return v === null || v === undefined ? "" : String(v);
}
function norm(v: any) {
  return s(v).trim();
}
function normLower(v: any) {
  return norm(v).toLowerCase();
}
function getPlayerName(r: AnyRow): string {
  return norm(r?.player_name || r?.game_name || r?.player || r?.name || "Unknown");
}
function getAllianceCode(r: AnyRow): string {
  return norm(r?.alliance_code || r?.alliance || r?.alliance_name || "—").toUpperCase();
}
function getTypeName(r: AnyRow): string {
  return norm(r?.achievement_name || r?.type_name || r?.title || r?.label || r?.option_label || r?.option_name || r?.kind || "Achievement");
}

function buildAchievementSearchLink(r: AnyRow): string {
  const params = new URLSearchParams();
  const player = getPlayerName(r);
  const alliance = getAllianceCode(r);
  const type = getTypeName(r);

  if (player) params.set("player", player);
  if (alliance && alliance !== "—") params.set("alliance", alliance);
  if (type && type !== "Achievement") params.set("type", type);

  return `/owner/state-achievements?${params.toString()}`;
}

export default function OwnerSearchPage() {
  const nav = useNavigate();
  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);

  function onSelectModule(k: string) {
    const to = cc.find((m) => m.key === k)?.to;
    if (to) nav(to);
  }

  const [q, setQ] = useState("");
  const [resultType, setResultType] = useState("all");
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<AnyRow[]>([]);
  const [queueRows, setQueueRows] = useState<AnyRow[]>([]);
  const [players, setPlayers] = useState<AnyRow[]>([]);

  async function loadAll() {
    try {
      setLoading(true);

      const r = await supabase
        .from("state_achievement_requests")
        .select("*")
        .eq("state_code", "789")
        .order("created_at", { ascending: false })
        .limit(800);
      if (!r.error) setRequests((r.data || []) as AnyRow[]);

      const dq = await supabase
        .from("discord_send_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!dq.error) setQueueRows((dq.data || []) as AnyRow[]);

      const p = await supabase
        .from("players")
        .select("id,name,game_name")
        .order("created_at", { ascending: false })
        .limit(500);
      if (!p.error) setPlayers((p.data || []) as AnyRow[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const needle = normLower(q);

  const requestResults = useMemo(() => {
    if (!needle) return [];
    return requests.filter((r) =>
      `${getPlayerName(r)} ${getAllianceCode(r)} ${getTypeName(r)} ${s(r?.status)} ${s(r?.id)}`.toLowerCase().includes(needle)
    ).slice(0, 20);
  }, [requests, needle]);

  const queueResults = useMemo(() => {
    if (!needle) return [];
    return queueRows.filter((r) =>
      `${s(r?.kind)} ${s(r?.target)} ${s(r?.channel_name)} ${s(r?.channel_id)} ${s(r?.status)} ${s(r?.status_detail)}`.toLowerCase().includes(needle)
    ).slice(0, 20);
  }, [queueRows, needle]);

  const playerResults = useMemo(() => {
    if (!needle) return [];
    return players.filter((p) =>
      `${s(p?.id)} ${s(p?.name)} ${s(p?.game_name)}`.toLowerCase().includes(needle)
    ).slice(0, 20);
  }, [players, needle]);

  return (
    <CommandCenterShell
      title="Owner • Search Everywhere"
      subtitle="Search players, achievement requests, and Discord queue rows"
      modules={modules}
      activeModuleKey="owner"
      onSelectModule={onSelectModule}
      topRight={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/morning-brief")}>Morning Brief</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/queue-health")}>Queue Health</button>
        </div>
      }
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search players, alliances, achievement types, queue rows..."
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(0,0,0,0.25)",
          color: "rgba(255,255,255,0.92)"
        }}
      />

      {loading ? <div style={{ opacity: 0.75, marginTop: 12 }}>Loading…</div> : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <button className="zombie-btn" type="button" onClick={() => setResultType("all")}>All</button>
        <button className="zombie-btn" type="button" onClick={() => setResultType("requests")}>Requests</button>
        <button className="zombie-btn" type="button" onClick={() => setResultType("players")}>Players</button>
        <button className="zombie-btn" type="button" onClick={() => setResultType("queue")}>Queue</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 14 }}>
        {(resultType === "all" || resultType === "requests") ? <section style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, marginBottom: 8 }}>Achievement Requests</div>
          <div style={{ display: "grid", gap: 8 }}>
            {!needle ? <div style={{ opacity: 0.7 }}>Type to search.</div> : requestResults.length === 0 ? <div style={{ opacity: 0.7 }}>No request matches.</div> : requestResults.map((r, i) => (
              <button key={String(r?.id || i)} className="zombie-btn" type="button" style={{ textAlign: "left", whiteSpace: "normal" }} onClick={() => nav(buildAchievementSearchLink(r))}>
                <div style={{ fontWeight: 800 }}>{getPlayerName(r)}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>{getAllianceCode(r)} • {getTypeName(r)} • {s(r?.status)}</div>
              </button>
            ))}
          </div>
        </section> : null}

        {(resultType === "all" || resultType === "players") ? <section style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, marginBottom: 8 }}>Players</div>
          <div style={{ display: "grid", gap: 8 }}>
            {!needle ? <div style={{ opacity: 0.7 }}>Type to search.</div> : playerResults.length === 0 ? <div style={{ opacity: 0.7 }}>No player matches.</div> : playerResults.map((p, i) => (
              <button key={String(p?.id || i)} className="zombie-btn" type="button" style={{ textAlign: "left", whiteSpace: "normal" }} onClick={() => nav(`/owner/dossier?q=${encodeURIComponent(String(p?.game_name || p?.name || p?.id || ""))}`)}>
                <div style={{ fontWeight: 800 }}>{s(p?.game_name || p?.name || "Player")}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>{s(p?.id)}</div>
              </button>
            ))}
          </div>
        </section> : null}

        {(resultType === "all" || resultType === "queue") ? <section style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, marginBottom: 8 }}>Discord Queue</div>
          <div style={{ display: "grid", gap: 8 }}>
            {!needle ? <div style={{ opacity: 0.7 }}>Type to search.</div> : queueResults.length === 0 ? <div style={{ opacity: 0.7 }}>No queue matches.</div> : queueResults.map((r, i) => (
              <button key={String(r?.id || i)} className="zombie-btn" type="button" style={{ textAlign: "left", whiteSpace: "normal" }} onClick={() => nav("/owner/queue-health")}>
                <div style={{ fontWeight: 800 }}>{s(r?.kind || "queue")}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>{s(r?.target || r?.channel_name || r?.channel_id || "—")}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{s(r?.status)}</div>
              </button>
            ))}
          </div>
        </section> : null}
      </div>
    </CommandCenterShell>
  );
}


