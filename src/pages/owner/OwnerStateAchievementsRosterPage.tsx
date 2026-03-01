import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";

type PlayerRow = { id: string; name: string | null; game_name: string | null };
type AchRow = {
  id: string;
  state_code: string;
  player_id: string;
  title: string;
  status: string;
  progress_percent: number | null;
  note: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

function labelForPlayer(p: PlayerRow) {
  const a = (p.game_name || "").trim();
  const b = (p.name || "").trim();
  if (a && b && a.toLowerCase() !== b.toLowerCase()) return `${a} (${b})`;
  return a || b || p.id.slice(0, 8);
}

export default function OwnerStateAchievementsRosterPage() {
  const stateCode = "789";

  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [playerId, setPlayerId] = useState<string>("");

  const [rows, setRows] = useState<AchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string>("");

  const [title, setTitle] = useState("");
  const [achStatus, setAchStatus] = useState<"in_progress" | "completed" | "revoked">("completed");
  const [progress, setProgress] = useState<string>("100");
  const [note, setNote] = useState("");

  const selectedPlayer = useMemo(() => players.find(p => p.id === playerId) ?? null, [players, playerId]);

  async function loadPlayers() {
    const res = await supabase
      .from("players")
      .select("id, name, game_name")
      .order("game_name", { ascending: true });

    if (res.error) {
      setStatusMsg(res.error.message);
      setPlayers([]);
      return;
    }

    const list = (res.data ?? []) as any as PlayerRow[];
    setPlayers(list);

    if (!playerId && list.length) setPlayerId(list[0].id);
  }

  async function loadAchievements(pid: string) {
    setLoading(true);
    setStatusMsg("");

    const res = await supabase
      .from("state_player_achievements")
      .select("*")
      .eq("state_code", stateCode)
      .eq("player_id", pid)
      .order("created_at", { ascending: false });

    setLoading(false);

    if (res.error) {
      setStatusMsg(res.error.message);
      setRows([]);
      return;
    }

    setRows((res.data ?? []) as any);
  }

  useEffect(() => { void loadPlayers(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (playerId) void loadAchievements(playerId); /* eslint-disable-next-line */ }, [playerId]);

  async function addAchievement() {
    const t = title.trim();
    if (!t) return alert("Title required.");

    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id ?? "";
    if (!uid) return alert("Please sign in.");

    const pp = progress.trim();
    const pInt = pp ? Number(pp) : null;
    const progress_percent = Number.isFinite(pInt as any) ? Math.max(0, Math.min(100, Math.floor(pInt as any))) : null;

    setStatusMsg("Saving…");

    const ins = await supabase.from("state_player_achievements").insert({
      state_code: stateCode,
      player_id: playerId,
      title: t,
      status: achStatus,
      progress_percent,
      note: note.trim() || null,
      created_by: uid,
    } as any);

    if (ins.error) {
      setStatusMsg(ins.error.message);
      return;
    }

    setTitle("");
    setAchStatus("completed");
    setProgress("100");
    setNote("");
    setStatusMsg("Saved ✅");
    await loadAchievements(playerId);
    window.setTimeout(() => setStatusMsg(""), 1200);
  }

  async function updateRow(id: string, patch: Partial<AchRow>) {
    setStatusMsg("Updating…");
    const up = await supabase.from("state_player_achievements").update({
      status: patch.status,
      progress_percent: patch.progress_percent,
      note: patch.note,
      updated_at: new Date().toISOString(),
    } as any).eq("id", id);

    if (up.error) { setStatusMsg(up.error.message); return; }
    setStatusMsg("Updated ✅");
    await loadAchievements(playerId);
    window.setTimeout(() => setStatusMsg(""), 1200);
  }

  async function removeRow(id: string) {
    const ok = confirm("Delete this achievement record?");
    if (!ok) return;
    setStatusMsg("Deleting…");
    const del = await supabase.from("state_player_achievements").delete().eq("id", id);
    if (del.error) { setStatusMsg(del.error.message); return; }
    setStatusMsg("Deleted ✅");
    await loadAchievements(playerId);
    window.setTimeout(() => setStatusMsg(""), 1200);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>🏆 State {stateCode} Achievements Roster</h1>
        <div style={{ opacity: 0.8, fontSize: 12 }}>{statusMsg || "Record achievements for any player (does not affect your /me unless you select yourself)."}</div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "360px 1fr", gap: 14 }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Select player</div>
          <select value={playerId} onChange={(e) => setPlayerId(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 10 }}>
            {players.map((p) => <option key={p.id} value={p.id}>{labelForPlayer(p)}</option>)}
          </select>

          <div style={{ marginTop: 14, fontWeight: 900 }}>Add achievement</div>

          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Achievement title" />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select value={achStatus} onChange={(e) => setAchStatus(e.target.value as any)} style={{ padding: 10, borderRadius: 10 }}>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="revoked">Revoked</option>
              </select>
              <input value={progress} onChange={(e) => setProgress(e.target.value)} placeholder="Progress % (0-100)" style={{ width: 160 }} />
            </div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" rows={4} />
            <button onClick={addAchievement} disabled={!playerId || !title.trim()} style={{ padding: "10px 12px", borderRadius: 10 }}>
              Add to roster
            </button>
          </div>

          {selectedPlayer ? (
            <div style={{ marginTop: 12, opacity: 0.75, fontSize: 12 }}>
              Target: <b>{labelForPlayer(selectedPlayer)}</b>
            </div>
          ) : null}
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontWeight: 900 }}>Records</div>
            <button onClick={() => playerId && loadAchievements(playerId)} disabled={!playerId}>Refresh</button>
          </div>

          {loading ? (
            <div style={{ padding: 10 }}>Loading…</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 10, opacity: 0.85 }}>No achievement records for this player yet.</div>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {rows.map((r) => (
                <div key={r.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>{r.title}</div>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>
                      {r.created_at ? new Date(r.created_at).toLocaleString() : ""}
                    </div>
                  </div>

                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <select
                      value={(r.status || "completed") as any}
                      onChange={(e) => updateRow(r.id, { status: e.target.value as any, progress_percent: r.progress_percent, note: r.note })}
                      style={{ padding: "8px 10px", borderRadius: 10 }}
                    >
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="revoked">Revoked</option>
                    </select>

                    <input
                      value={r.progress_percent ?? ""}
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        const n = v ? Math.max(0, Math.min(100, Math.floor(Number(v)))) : null;
                        updateRow(r.id, { status: r.status as any, progress_percent: Number.isFinite(n as any) ? (n as any) : null, note: r.note });
                      }}
                      placeholder="%"
                      style={{ width: 90, padding: "8px 10px", borderRadius: 10 }}
                    />

                    <button onClick={() => removeRow(r.id)} style={{ padding: "8px 10px", borderRadius: 10 }}>
                      Delete
                    </button>
                  </div>

                  {r.note ? <div style={{ marginTop: 8, whiteSpace: "pre-wrap", opacity: 0.9 }}>{r.note}</div> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
