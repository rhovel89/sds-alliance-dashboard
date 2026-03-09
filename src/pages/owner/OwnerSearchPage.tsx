import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";
import { supabase } from "../../lib/supabaseClient";

type AnyRow = any;

function rankSearchMatch(haystack: string, needle: string): number {
  const h = String(haystack || "").toLowerCase().trim();
  const n = String(needle || "").toLowerCase().trim();
  if (!n) return 0;
  if (h === n) return 100;
  if (h.startsWith(n)) return 80;
  if (h.includes(` ${n} `)) return 70;
  if (h.includes(n)) return 50;
  return 0;
}

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem("ownerRecentSearches");
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.map((x) => String(x || "")).filter(Boolean).slice(0, 8) : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(arr: string[]) {
  try {
    localStorage.setItem("ownerRecentSearches", JSON.stringify((arr || []).slice(0, 8)));
  } catch {}
}

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

function buildPlayerProgressLink(p: AnyRow): string {
  const params = new URLSearchParams();
  const player = String(p?.game_name || p?.name || p?.id || "").trim();
  if (player) params.set("player", player);
  return `/owner/player-progress?${params.toString()}`;
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
  const [allianceFilter, setAllianceFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<AnyRow[]>([]);
  const [queueRows, setQueueRows] = useState<AnyRow[]>([]);
  const [players, setPlayers] = useState<AnyRow[]>([]);

  async function copyText(txt: string) {
    try {
      await navigator.clipboard.writeText(String(txt || ""));
    } catch {}
  }

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
    setRecentSearches(loadRecentSearches());
  }, []);

  const needle = normLower(q);

  const allianceOptions = useMemo(() => {
    const vals = Array.from(new Set(requests.map((r) => getAllianceCode(r)).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    return ["ALL", ...vals];
  }, [requests]);

  const statusOptions = useMemo(() => {
    const vals = Array.from(new Set(requests.map((r) => s(r?.status)).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    return ["ALL", ...vals];
  }, [requests]);

  const typeOptions = useMemo(() => {
    const vals = Array.from(new Set(requests.map((r) => getTypeName(r)).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    return ["ALL", ...vals];
  }, [requests]);

  const requestResults = useMemo(() => {
    if (!needle) return [];

    return requests
      .map((r) => {
        const player = getPlayerName(r);
        const alliance = getAllianceCode(r);
        const type = getTypeName(r);
        const status = s(r?.status);

        const textOk = `${player} ${alliance} ${type} ${status} ${s(r?.id)}`.toLowerCase().includes(needle);
        const allianceOk = allianceFilter === "ALL" || alliance === allianceFilter;
        const statusOk = statusFilter === "ALL" || status === statusFilter;
        const typeOk = typeFilter === "ALL" || type === typeFilter;

        if (!(textOk && allianceOk && statusOk && typeOk)) return null;

        const score =
          rankSearchMatch(player, needle) * 4 +
          rankSearchMatch(alliance, needle) * 3 +
          rankSearchMatch(type, needle) * 3 +
          rankSearchMatch(status, needle);

        return { row: r, score };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.score - a.score || String(getPlayerName(a.row)).localeCompare(String(getPlayerName(b.row))))
      .slice(0, 20)
      .map((x: any) => x.row);
  }, [requests, needle, allianceFilter, statusFilter, typeFilter]);

  const queueResults = useMemo(() => {
    if (!needle) return [];

    return queueRows
      .map((r) => {
        const kind = s(r?.kind);
        const target = s(r?.target);
        const channel = s(r?.channel_name || r?.channel_id);
        const status = s(r?.status);
        const detail = s(r?.status_detail);
        const text = `${kind} ${target} ${channel} ${status} ${detail}`.toLowerCase();

        if (!text.includes(needle)) return null;

        const score =
          rankSearchMatch(target, needle) * 4 +
          rankSearchMatch(channel, needle) * 3 +
          rankSearchMatch(status, needle) * 2 +
          rankSearchMatch(kind, needle) +
          rankSearchMatch(detail, needle);

        return { row: r, score };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.score - a.score || String(a.row?.target || "").localeCompare(String(b.row?.target || "")))
      .slice(0, 20)
      .map((x: any) => x.row);
  }, [queueRows, needle]);

  const playerResults = useMemo(() => {
    if (!needle) return [];

    return players
      .map((p) => {
        const gameName = s(p?.game_name);
        const name = s(p?.name);
        const id = s(p?.id);
        const text = `${id} ${name} ${gameName}`.toLowerCase();

        if (!text.includes(needle)) return null;

        const score =
          rankSearchMatch(gameName, needle) * 5 +
          rankSearchMatch(name, needle) * 4 +
          rankSearchMatch(id, needle);

        return { row: p, score };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.score - a.score || String(a.row?.game_name || a.row?.name || "").localeCompare(String(b.row?.game_name || b.row?.name || "")))
      .slice(0, 20)
      .map((x: any) => x.row);
  }, [players, needle]);

  const requestCount = requestResults.length;
  const playerCount = playerResults.length;
  const queueCount = queueResults.length;

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
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/player-progress")}>Player Progress</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/player-progress-compare")}>Player Compare</button>
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

      {recentSearches.length ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.7, alignSelf: "center" }}>Recent:</div>
          {recentSearches.map((x) => (
            <button
              key={x}
              className="zombie-btn"
              type="button"
              style={{ padding: "6px 10px", fontSize: 12 }}
              onClick={() => setQ(x)}
            >
              {x}
            </button>
          ))}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <button className="zombie-btn" type="button" onClick={() => setResultType("all")}>All</button>
        <button className="zombie-btn" type="button" onClick={() => setResultType("requests")}>Requests</button>
        <button className="zombie-btn" type="button" onClick={() => setResultType("players")}>Players</button>
        <button className="zombie-btn" type="button" onClick={() => setResultType("queue")}>Queue</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
        <select
          value={allianceFilter}
          onChange={(e) => setAllianceFilter(String(e.target.value || "ALL"))}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.25)",
            color: "rgba(255,255,255,0.92)"
          }}
        >
          {allianceOptions.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(String(e.target.value || "ALL"))}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.25)",
            color: "rgba(255,255,255,0.92)"
          }}
        >
          {statusOptions.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(String(e.target.value || "ALL"))}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.25)",
            color: "rgba(255,255,255,0.92)"
          }}
        >
          {typeOptions.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 14 }}>
        {(resultType === "all" || resultType === "requests") ? <section style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, marginBottom: 8 }}>Achievement Requests {needle ? `(${requestCount})` : ""}</div>
          <div style={{ display: "grid", gap: 8 }}>
            {!needle ? <div style={{ opacity: 0.7 }}>Type to search.</div> : requestResults.length === 0 ? <div style={{ opacity: 0.7 }}>No request matches.</div> : requestResults.map((r, i) => (
              <div key={String(r?.id || i)} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 10, background: "rgba(0,0,0,0.12)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800 }}>{getPlayerName(r)}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)" }}>
                        {getAllianceCode(r)}
                      </span>
                      <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)" }}>
                        {getTypeName(r)}
                      </span>
                      <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)" }}>
                        {s(r?.status)}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button
                      className="zombie-btn"
                      type="button"
                      style={{ padding: "6px 10px", fontSize: 12 }}
                      onClick={() => nav(buildAchievementSearchLink(r))}
                    >
                      Open
                    </button>
                    <button
                      className="zombie-btn"
                      type="button"
                      style={{ padding: "6px 10px", fontSize: 12 }}
                      onClick={() => void copyText(window.location.origin + buildAchievementSearchLink(r))}
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section> : null}

        {(resultType === "all" || resultType === "players") ? <section style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, marginBottom: 8 }}>Players {needle ? `(${playerCount})` : ""}</div>
          <div style={{ display: "grid", gap: 8 }}>
            {!needle ? <div style={{ opacity: 0.7 }}>Type to search.</div> : playerResults.length === 0 ? <div style={{ opacity: 0.7 }}>No player matches.</div> : playerResults.map((p, i) => (
              <div key={String(p?.id || i)} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 10, background: "rgba(0,0,0,0.12)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800 }}>{s(p?.game_name || p?.name || "Player")}</div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{s(p?.id)}</div>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button
                      className="zombie-btn"
                      type="button"
                      style={{ padding: "6px 10px", fontSize: 12 }}
                      onClick={() => nav(buildPlayerProgressLink(p))}
                    >
                      Open Progress
                    </button>
                    <button
                      className="zombie-btn"
                      type="button"
                      style={{ padding: "6px 10px", fontSize: 12 }}
                      onClick={() => void copyText(window.location.origin + buildPlayerProgressLink(p))}
                    >
                      Copy Progress Link
                    </button>
                    <button
                      className="zombie-btn"
                      type="button"
                      style={{ padding: "6px 10px", fontSize: 12 }}
                      onClick={() => nav(`/owner/dossier?q=${encodeURIComponent(String(p?.game_name || p?.name || p?.id || ""))}`)}
                    >
                      Dossier
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section> : null}

        {(resultType === "all" || resultType === "queue") ? <section style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, marginBottom: 8 }}>Discord Queue {needle ? `(${queueCount})` : ""}</div>
          <div style={{ display: "grid", gap: 8 }}>
            {!needle ? <div style={{ opacity: 0.7 }}>Type to search.</div> : queueResults.length === 0 ? <div style={{ opacity: 0.7 }}>No queue matches.</div> : queueResults.map((r, i) => (
              <div key={String(r?.id || i)} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 10, background: "rgba(0,0,0,0.12)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800 }}>{s(r?.kind || "queue")}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)" }}>
                        {s(r?.status || "unknown")}
                      </span>
                      <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)" }}>
                        {s(r?.target || r?.channel_name || r?.channel_id || "—")}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                      {s(r?.status_detail || "")}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button
                      className="zombie-btn"
                      type="button"
                      style={{ padding: "6px 10px", fontSize: 12 }}
                      onClick={() => nav("/owner/queue-health")}
                    >
                      Open
                    </button>
                    <button
                      className="zombie-btn"
                      type="button"
                      style={{ padding: "6px 10px", fontSize: 12 }}
                      onClick={() => void copyText(window.location.origin + "/owner/queue-health")}
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section> : null}
      </div>
    </CommandCenterShell>
  );
}









