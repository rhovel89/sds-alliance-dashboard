import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getCanonicalPlayerIdForUser } from "../../utils/getCanonicalPlayerId";
import { useNavigate } from "react-router-dom";

type PlayerRow = { id: string; name: string | null; game_name: string | null; auth_user_id: string | null };
type AllianceRow = { alliance_code: string; role_key?: string | null; role?: string | null };

export default function MeAllianceSwitcherPanel() {
  const nav = useNavigate();
  const [status, setStatus] = useState("");
  const [player, setPlayer] = useState<PlayerRow | null>(null);
  const [alliances, setAlliances] = useState<AllianceRow[]>([]);
  const [selected, setSelected] = useState<string>("");

  async function load() {
    setStatus("Loading…");
    const u = await supabase.auth.getUser();
    const uid = u.data?.user?.id || null;
    if (!uid) { setStatus("Not logged in."); return; }    const pid = await getCanonicalPlayerIdForUser(uid);
    if (!pid) { setPlayer(null); setStatus("No player profile linked yet."); return; }

    const p2 = await supabase.from("players").select("*").eq("id", pid).maybeSingle();
    const prow: any = p2.error ? null : (p2.data ?? null);

    setPlayer(prow);if (!prow?.id) { setStatus("No player profile linked yet."); return; }

    const a = await supabase.from("player_alliances").select("*").eq("player_id", prow.id).order("alliance_code", { ascending: true });
    if (a.error) { setStatus(a.error.message); setAlliances([]); return; }

    const list = (a.data ?? []) as any as AllianceRow[];
    setAlliances(list);
    if (!selected && list.length) setSelected(String(list[0].alliance_code || ""));
    setStatus("");
  }

  useEffect(() => { void load(); }, []);

  return (
    <div className="zombie-card" style={{ padding: 14, borderRadius: 16 }}>
      <div style={{ fontWeight: 950 }}>🪪 My Alliance Profile</div>
      <div style={{ marginTop: 6, opacity: 0.85, fontSize: 12 }}>
        {status || (player ? `Player: ${(player.name || player.game_name || "Unknown")}` : "—")}
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          {alliances.map((a) => (
            <option key={a.alliance_code} value={a.alliance_code}>
              {String(a.alliance_code).toUpperCase()}
            </option>
          ))}
        </select>

        <button type="button" onClick={() => selected ? nav(`/dashboard/${selected}/guides`) : null}>📘 Guides</button>
        <button type="button" onClick={() => selected ? nav(`/dashboard/${selected}/announcements`) : null}>📢 Announcements</button>
        <button type="button" onClick={() => selected ? nav(`/dashboard/${selected}/calendar`) : null}>📅 Calendar</button>
      </div>

      <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>
        Tip: if you belong to multiple alliances, switch here to jump directly into that alliance’s tools.
      </div>
    </div>
  );
}


