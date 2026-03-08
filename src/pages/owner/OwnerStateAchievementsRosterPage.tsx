import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";
import { supabase } from "../../lib/supabaseClient";

function s(v: any) { return v === null || v === undefined ? "" : String(v); }

type PlayerRow = { id: string; name?: string | null; game_name?: string | null };
type TypeRow = { id: string; state_code?: string | null; name?: string | null; active?: boolean | null };
type OptionRow = { id: string; achievement_type_id?: string | null; label?: string | null; active?: boolean | null };

export default function OwnerStateAchievementsRosterPage() {
  const nav = useNavigate();
  const stateCode = "789";

  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);
  function onSelectModule(k: string) { const to = cc.find((m) => m.key === k)?.to; if (to) nav(to); }

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const [playerQ, setPlayerQ] = useState("");
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [selected, setSelected] = useState<PlayerRow | null>(null);

  const [types, setTypes] = useState<TypeRow[]>([]);
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [typeId, setTypeId] = useState("");
  const [optionId, setOptionId] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [notes, setNotes] = useState("");

  const [awards, setAwards] = useState<any[]>([]);

  const filteredPlayers = useMemo(() => {
    const t = s(playerQ).trim().toLowerCase();
    if (!t) return players.slice(0, 80);
    return players.filter(p => (`${s(p.game_name)} ${s(p.name)} ${p.id}`).toLowerCase().includes(t)).slice(0, 80);
  }, [players, playerQ]);

  const filteredOptions = useMemo(() => {
    const tid = s(typeId).trim();
    if (!tid) return [];
    return options.filter(o => String(o.achievement_type_id || "") === tid && (o.active !== false));
  }, [options, typeId]);

  async function loadCatalog() {
    const t = await supabase.from("state_achievement_types").select("*").eq("state_code", stateCode).order("name", { ascending: true });
    if (!t.error) setTypes((t.data || []) as any[]);
    const o = await supabase.from("state_achievement_options").select("*").order("label", { ascending: true });
    if (!o.error) setOptions((o.data || []) as any[]);
  }

  async function loadPlayers() {
    setLoading(true);
    const r = await supabase.from("players").select("id,name,game_name").order("created_at", { ascending: false }).limit(500);
    setLoading(false);
    if (r.error) { setStatus(r.error.message); return; }
    setPlayers((r.data || []) as any[]);
  }

  async function loadAwards(pid: string) {
    const r = await supabase
      .from("state_player_achievements")
      .select("*")
      .eq("state_code", stateCode)
      .eq("player_id", pid)
      .order("awarded_at", { ascending: false })
      .limit(200);

    if (r.error) { setStatus(r.error.message); setAwards([]); return; }
    setAwards((r.data || []) as any[]);
  }

  useEffect(() => {
    (async () => {
      setStatus("");
      await loadCatalog();
      await loadPlayers();
    })();
  }, []);

  useEffect(() => {
    if (selected?.id) loadAwards(selected.id);
    else setAwards([]);
  }, [selected?.id]);

  async function award() {
    try {
      setStatus("");
      if (!selected?.id) { setStatus("Select a player first."); return; }

      const u = await supabase.auth.getUser();
      const uid = u.data?.user?.id;

      const title =
        s(customTitle).trim() ||
        (types.find(t => String(t.id) === String(typeId))?.name ? String(types.find(t => String(t.id) === String(typeId))?.name) : "Achievement");

      const payload: any = {
        state_code: stateCode,
        player_id: selected.id,
        player_name: s(selected.game_name || selected.name),
        achievement_type_id: typeId || null,
        option_id: optionId || null,
        title,
        notes: s(notes).trim() || null,
        status: "completed",
        awarded_by: uid || null,
        awarded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const ins = await supabase.from("state_player_achievements").insert(payload).select("*").maybeSingle();
      if (ins.error) { setStatus(ins.error.message); return; }

      setCustomTitle("");
      setNotes("");
      setStatus("Awarded ✅");
      window.setTimeout(() => setStatus(""), 900);

      await loadAwards(selected.id);
    } catch (e: any) {
      setStatus(String(e?.message || e || "Award failed"));
    }
  }

  async function remove(id: string) {
    try {
      if (!confirm("Delete this awarded achievement?")) return;
      const del = await supabase.from("state_player_achievements").delete().eq("id", id);
      if (del.error) { setStatus(del.error.message); return; }
      if (selected?.id) await loadAwards(selected.id);
    } catch (e: any) {
      setStatus(String(e?.message || e || "Delete failed"));
    }
  }

  return (
    <CommandCenterShell
      title="Owner • State Achievements Roster"
      subtitle="Award achievements directly to players (shows on their dossier)"
      modules={modules}
      activeModuleKey="owner"
      onSelectModule={onSelectModule}
      topRight={
        <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/state-achievements")}>Legacy</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/dossier")}>Dossier Lookup</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/dashboard")}>Dashboard</button>
        </div>
      }
    >
      {status ? <div style={{ marginBottom: 10, border:"1px solid rgba(176,18,27,0.35)", background:"rgba(176,18,27,0.12)", borderRadius: 12, padding: 10 }}>{status}</div> : null}
      {loading ? <div style={{ opacity: 0.75 }}>Loading…</div> : null}

      <div style={{ display:"grid", gridTemplateColumns:"420px 1fr", gap: 12, alignItems:"start" }}>
        <div style={{ border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950 }}>Pick Player</div>
          <input value={playerQ} onChange={(e)=>setPlayerQ(e.target.value)} placeholder="Search player…"
            style={{ marginTop: 10, width:"100%", padding:"10px 12px", borderRadius: 12, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(0,0,0,0.25)", color:"rgba(255,255,255,0.92)" }} />

          <div style={{ display:"flex", flexDirection:"column", gap: 8, marginTop: 10, maxHeight: 520, overflow:"auto" }}>
            {filteredPlayers.map(p => (
              <button key={p.id} className="zombie-btn" type="button" style={{ textAlign:"left", whiteSpace:"normal", opacity: selected?.id === p.id ? 1 : 0.86 }}
                onClick={() => setSelected(p)}>
                <div style={{ fontWeight: 900 }}>{s(p.game_name || p.name || "Player")}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{p.id}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap: 12 }}>
          <div style={{ border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 950 }}>Award Achievement</div>
            <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
              Select type/option or enter a custom title.
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 10, marginTop: 10 }}>
              <select value={typeId} onChange={(e)=>{ setTypeId(e.target.value); setOptionId(""); }}
                style={{ padding:"10px 12px", borderRadius: 12, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(0,0,0,0.25)", color:"rgba(255,255,255,0.92)" }}>
                <option value="">Type (optional)</option>
                {types.filter(t => t.active !== false).map(t => (
                  <option key={t.id} value={t.id}>{s(t.name || "Type")}</option>
                ))}
              </select>

              <select value={optionId} onChange={(e)=>setOptionId(e.target.value)}
                style={{ padding:"10px 12px", borderRadius: 12, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(0,0,0,0.25)", color:"rgba(255,255,255,0.92)" }}>
                <option value="">Option (optional)</option>
                {filteredOptions.map(o => (
                  <option key={o.id} value={o.id}>{s(o.label || "Option")}</option>
                ))}
              </select>

              <input value={customTitle} onChange={(e)=>setCustomTitle(e.target.value)} placeholder="Custom title (optional)"
                style={{ gridColumn:"1 / -1", padding:"10px 12px", borderRadius: 12, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(0,0,0,0.25)", color:"rgba(255,255,255,0.92)" }} />

              <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Notes (optional)" rows={3}
                style={{ gridColumn:"1 / -1", padding:"10px 12px", borderRadius: 12, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(0,0,0,0.20)", color:"rgba(255,255,255,0.92)" }} />
            </div>

            <div style={{ display:"flex", gap: 10, marginTop: 10, flexWrap:"wrap" }}>
              <button className="zombie-btn" type="button" onClick={award}>Award</button>
              {selected?.id ? (
                <button className="zombie-btn" type="button" onClick={() => nav(`/dossier/${encodeURIComponent(selected.id)}`)}>
                  Open Dossier
                </button>
              ) : null}
            </div>
          </div>

          <div style={{ border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 950 }}>Awarded to selected player</div>
            {!selected ? <div style={{ opacity: 0.75, marginTop: 8 }}>Select a player.</div> : null}

            <div style={{ display:"flex", flexDirection:"column", gap: 8, marginTop: 10 }}>
              {awards.map((a: any) => (
                <div key={String(a.id)} style={{ border:"1px solid rgba(255,255,255,0.08)", background:"rgba(0,0,0,0.18)", borderRadius: 12, padding: 10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900 }}>{String(a.title || a.achievement_name || "Achievement")}</div>
                    <button className="zombie-btn" type="button" style={{ padding:"6px 10px", fontSize: 12 }} onClick={() => remove(String(a.id))}>
                      Delete
                    </button>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                    {a.awarded_at ? new Date(String(a.awarded_at)).toLocaleString() : ""}
                  </div>
                </div>
              ))}
              {selected && !awards.length ? <div style={{ opacity: 0.75 }}>No awards yet.</div> : null}
            </div>
          </div>
        </div>
      </div>
    </CommandCenterShell>
  );
}


