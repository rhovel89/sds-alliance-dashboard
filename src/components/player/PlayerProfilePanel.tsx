import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Props = {
  allianceCode: string;
};

export default function PlayerProfilePanel({ allianceCode }: Props) {
  const code = useMemo(() => String(allianceCode || "").trim().toUpperCase(), [allianceCode]);
  const [loading, setLoading] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [gameName, setGameName] = useState("");

  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setMsg(null);
    if (!code) return;

    setLoading(true);
    try {
      const { data: uRes, error: uErr } = await supabase.auth.getUser();
      if (uErr) throw uErr;
      const uid = uRes?.user?.id;
      if (!uid) { setMsg("Not signed in."); return; }

      const { data: p, error: pErr } = await supabase
        .from("players")
        .select("id")
        .eq("auth_user_id", uid)
        .maybeSingle();

      if (pErr) throw pErr;
      if (!p?.id) { setMsg("No player record found."); return; }
      setPlayerId(p.id);

      const { data: pr, error: prErr } = await supabase
        .from("player_alliance_profiles")
        .select("id, game_name")
        .eq("player_id", p.id)
        .eq("alliance_code", code)
        .maybeSingle();

      if (prErr) throw prErr;

      if (pr?.id) {
        setProfileId(pr.id);
        setGameName(String(pr.game_name ?? ""));
      } else {
        // create empty shell profile (safe)
        const { data: created, error: cErr } = await supabase
          .from("player_alliance_profiles")
          .upsert({ player_id: p.id, alliance_code: code }, { onConflict: "player_id,alliance_code" })
          .select("id, game_name")
          .maybeSingle();
        if (cErr) throw cErr;

        setProfileId(created?.id ?? null);
        setGameName(String(created?.game_name ?? ""));
      }
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [code]);

  const save = async () => {
    setMsg(null);
    if (!code) return;
    if (!playerId) return;

    setLoading(true);
    try {
      const payload: any = {
        player_id: playerId,
        alliance_code: code,
        game_name: gameName.trim() || null,
      };

      const { data, error } = await supabase
        .from("player_alliance_profiles")
        .upsert(payload, { onConflict: "player_id,alliance_code" })
        .select("id, game_name")
        .maybeSingle();

      if (error) throw error;

      setProfileId(data?.id ?? profileId);
      setMsg("Saved ✅");
      setTimeout(() => setMsg(null), 1800);
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 900 }}>👤 Your Profile</div>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Alliance: <b>{code || "—"}</b></div>
        </div>
        <button onClick={save} disabled={loading || !code} style={{ padding: "8px 10px", borderRadius: 10 }}>
          {loading ? "Saving…" : "Save"}
        </button>
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ opacity: 0.85 }}>Game Name</span>
          <input
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            placeholder="Your in-game name"
            style={{ padding: 10, borderRadius: 10 }}
          />
        </label>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
        Profile ID: <code>{profileId || "—"}</code>
      </div>

      {msg ? (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)" }}>
          {msg}
        </div>
      ) : null}
    </div>
  );
}
