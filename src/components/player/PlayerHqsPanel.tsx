import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Props = {
  allianceCode: string;
};

const TIERS = ["T5","T6","T7","T8","T9","T10","T11","T12","T13","T14"];
const TYPES = ["Shooter","Rider","Fighter"];

export default function PlayerHqsPanel({ allianceCode }: Props) {
  const code = useMemo(() => String(allianceCode || "").trim().toUpperCase(), [allianceCode]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [profileId, setProfileId] = useState<string | null>(null);
  const [hqs, setHqs] = useState<any[]>([]);
  const [assignedSlots, setAssignedSlots] = useState<any[]>([]);

  // Add HQ form
  const [hqName, setHqName] = useState("");
  const [hqLevel, setHqLevel] = useState<number | "">("");
  const [troopType, setTroopType] = useState<string>("");
  const [troopTier, setTroopTier] = useState<string>("");
  const [marchSize, setMarchSize] = useState<number | "">("");
  const [rallySize, setRallySize] = useState<number | "">("");

  const ensureProfile = async (): Promise<string | null> => {
    if (!code) return null;

    const { data: uRes, error: uErr } = await supabase.auth.getUser();
    if (uErr) throw uErr;
    const uid = uRes?.user?.id;
    if (!uid) return null;

    const { data: p, error: pErr } = await supabase
      .from("players")
      .select("id")
      .eq("auth_user_id", uid)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!p?.id) return null;

    const { data: pr, error: prErr } = await supabase
      .from("player_alliance_profiles")
      .upsert({ player_id: p.id, alliance_code: code }, { onConflict: "player_id,alliance_code" })
      .select("id")
      .maybeSingle();
    if (prErr) throw prErr;

    return pr?.id ?? null;
  };

  const load = async () => {
    setMsg(null);
    if (!code) return;

    setLoading(true);
    try {
      const pid = await ensureProfile();
      setProfileId(pid);

      if (pid) {
        const { data, error } = await supabase
          .from("player_hqs")
          .select("*")
          .eq("profile_id", pid)
          .order("created_at", { ascending: true });

        if (error) throw error;
        setHqs(data ?? []);
      } else {
        setHqs([]);
      }

      // Assigned HQ slots (best effort — if RLS blocks it, we just hide)
      try {
        const { data: uRes } = await supabase.auth.getUser();
        const uid = uRes?.user?.id;
        if (uid) {
          const { data: slots } = await supabase
            .from("alliance_hq_map")
            .select("*")
            .eq("alliance_id", code)
            .eq("assigned_user_id", uid);

          setAssignedSlots(slots ?? []);
        }
      } catch {}
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [code]);

  const addHq = async () => {
    setMsg(null);
    if (!profileId) return;
    const name = hqName.trim();
    if (!name) return setMsg("HQ Name is required.");

    setLoading(true);
    try {
      const payload: any = {
        profile_id: profileId,
        hq_name: name,
        hq_level: hqLevel === "" ? null : Number(hqLevel),
        troop_type: troopType || null,
        troop_tier: troopTier || null,
        march_size_no_heroes: marchSize === "" ? null : Number(marchSize),
        rally_size: rallySize === "" ? null : Number(rallySize),
      };

      const { error } = await supabase.from("player_hqs").insert(payload);
      if (error) throw error;

      setHqName("");
      setHqLevel("");
      setTroopType("");
      setTroopTier("");
      setMarchSize("");
      setRallySize("");
      await load();
      setMsg("HQ added ✅");
      setTimeout(() => setMsg(null), 1800);
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const deleteHq = async (id: string) => {
    if (!confirm("Delete this HQ?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("player_hqs").delete().eq("id", id);
      if (error) throw error;
      await load();
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
          <div style={{ fontWeight: 900 }}>🏰 Your HQs</div>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Alliance: <b>{code || "—"}</b></div>
        </div>
        <button onClick={load} disabled={loading || !code} style={{ padding: "8px 10px", borderRadius: 10 }}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* Assigned slots (view-only) */}
      {assignedSlots.length > 0 ? (
        <div style={{ marginTop: 12, padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>📍 Assigned HQ Map Slots</div>
          <div style={{ display: "grid", gap: 6 }}>
            {assignedSlots.map((s: any) => (
              <div key={String(s.id)} style={{ display: "flex", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
                <div style={{ opacity: 0.9 }}>
                  <b>{String(s.label ?? "Slot")}</b>
                  <span style={{ opacity: 0.75 }}> (#{String(s.slot_number ?? "—")})</span>
                </div>
                <div style={{ opacity: 0.8, fontSize: 12 }}>
                  slot: ({String(s.slot_x ?? "—")},{String(s.slot_y ?? "—")}) — player: ({String(s.player_x ?? "—")},{String(s.player_y ?? "—")})
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Add HQ */}
      <div style={{ marginTop: 12, padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.10)" }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>➕ Add HQ</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ opacity: 0.85 }}>HQ Name</span>
            <input value={hqName} onChange={(e) => setHqName(e.target.value)} style={{ padding: 10, borderRadius: 10 }} />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ opacity: 0.85 }}>HQ Level</span>
            <input type="number" value={hqLevel} onChange={(e) => setHqLevel(e.target.value === "" ? "" : Number(e.target.value))} style={{ padding: 10, borderRadius: 10 }} />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ opacity: 0.85 }}>Troop Type</span>
            <select value={troopType} onChange={(e) => setTroopType(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>
              <option value="">—</option>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ opacity: 0.85 }}>Troop Tier</span>
            <select value={troopTier} onChange={(e) => setTroopTier(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>
              <option value="">—</option>
              {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ opacity: 0.85 }}>March Size (no heroes)</span>
            <input type="number" value={marchSize} onChange={(e) => setMarchSize(e.target.value === "" ? "" : Number(e.target.value))} style={{ padding: 10, borderRadius: 10 }} />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ opacity: 0.85 }}>Rally Size</span>
            <input type="number" value={rallySize} onChange={(e) => setRallySize(e.target.value === "" ? "" : Number(e.target.value))} style={{ padding: 10, borderRadius: 10 }} />
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <button onClick={addHq} disabled={loading || !profileId} style={{ padding: "8px 10px", borderRadius: 10 }}>
            Add HQ
          </button>
        </div>
      </div>

      {/* HQ List */}
      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {hqs.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No HQs yet.</div>
        ) : hqs.map((h: any) => (
          <div key={String(h.id)} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 900 }}>{String(h.hq_name)}</div>
                <div style={{ opacity: 0.8, fontSize: 12 }}>
                  Level: <b>{String(h.hq_level ?? "—")}</b> • Type: <b>{String(h.troop_type ?? "—")}</b> • Tier: <b>{String(h.troop_tier ?? "—")}</b>
                </div>
                <div style={{ opacity: 0.8, fontSize: 12 }}>
                  March: <b>{String(h.march_size_no_heroes ?? "—")}</b> • Rally: <b>{String(h.rally_size ?? "—")}</b>
                </div>
              </div>

              <button onClick={() => deleteHq(String(h.id))} style={{ padding: "8px 10px", borderRadius: 10 }}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {msg ? (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)" }}>
          {msg}
        </div>
      ) : null}
    </div>
  );
}
