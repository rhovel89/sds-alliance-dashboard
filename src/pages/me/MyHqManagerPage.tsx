import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";

type TroopType = "Fighter" | "Shooter" | "Rider";
type TierLevel = "T5" | "T6" | "T7" | "T8" | "T9" | "T10" | "T11" | "T12" | "T13" | "T14";

const TROOP_TYPES: TroopType[] = ["Fighter", "Shooter", "Rider"];
const TIERS: TierLevel[] = ["T5","T6","T7","T8","T9","T10","T11","T12","T13","T14"];

type PlayerRow = { id: string; name: string | null; game_name: string | null; auth_user_id: string | null };
type PlayerAllianceRow = { id: string; player_id: string; alliance_code: string; role: string | null; role_key: string | null };

type HQRow = {
  id: string;
  profile_id: string;
  hq_name: string;
  hq_level: number;
  lair_level: number;
  lair_percent: number;
  troop_size: number;
  march_size: number;
  rally_size: number;
  troop_type: TroopType;
  tier_level: TierLevel;
  is_primary: boolean;
  notes: string;
  updated_at?: string;
};

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function MyHqManagerPage() {
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState("");

  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [playerId, setPlayerId] = useState("");

  const [profiles, setProfiles] = useState<PlayerAllianceRow[]>([]);
  const [profileId, setProfileId] = useState("");

  const [rows, setRows] = useState<HQRow[]>([]);

  const selectedProfile = useMemo(() => profiles.find((p) => p.id === profileId) ?? null, [profiles, profileId]);

  useEffect(() => {
    (async () => {
      const u = await supabase.auth.getUser();
      const uid = u.data.user?.id ?? "";
      setUserId(uid);
      if (uid) await loadPlayers(uid);
    })();
  }, []);

  async function loadPlayers(uid: string) {
    setStatus("Loading players…");
    const links = await supabase.from("player_auth_links").select("player_id").eq("user_id", uid);
    const linkedIds = (links.data ?? []).map((x: any) => String(x.player_id)).filter(Boolean);

    const direct = await supabase.from("players").select("id,name,game_name,auth_user_id").eq("auth_user_id", uid);
    if (direct.error) { setStatus(direct.error.message); return; }

    let extra: PlayerRow[] = [];
    if (linkedIds.length) {
      const lp = await supabase.from("players").select("id,name,game_name,auth_user_id").in("id", linkedIds);
      if (!lp.error) extra = (lp.data ?? []) as any;
    }

    const map = new Map<string, PlayerRow>();
    (direct.data ?? []).forEach((p: any) => map.set(String(p.id), p));
    extra.forEach((p: any) => map.set(String(p.id), p));

    const list = Array.from(map.values());
    setPlayers(list);

    const pick = list[0]?.id ?? "";
    setPlayerId(pick);
    if (pick) await loadProfiles(pick);

    setStatus("");
  }

  async function loadProfiles(pid: string) {
    setStatus("Loading alliances…");
    const res = await supabase.from("player_alliances").select("*").eq("player_id", pid).order("alliance_code", { ascending: true });
    if (res.error) { setStatus(res.error.message); return; }

    const list = (res.data ?? []) as any as PlayerAllianceRow[];
    setProfiles(list);

    const pick = list[0]?.id ?? "";
    setProfileId(pick);
    if (pick) await loadHqs(pick);

    setStatus("");
  }

  async function loadHqs(pid: string) {
    setStatus("Loading HQs…");
    const res = await supabase.from("player_alliance_hqs").select("*").eq("profile_id", pid).order("is_primary", { ascending: false }).order("updated_at", { ascending: false });
    if (res.error) { setStatus(res.error.message); return; }
    setRows((res.data ?? []) as any);
    setStatus("");
  }

  function updateRow(id: string, patch: Partial<HQRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? ({ ...r, ...patch } as any) : r)));
  }

  async function saveRow(r: HQRow) {
    setStatus("Saving…");
    const payload: any = {
      hq_name: r.hq_name,
      hq_level: Number(r.hq_level) || 1,
      lair_level: Number(r.lair_level) || 1,
      lair_percent: Number(r.lair_percent) || 0,
      troop_size: Number(r.troop_size) || 0,
      march_size: Number(r.march_size) || 0,
      rally_size: Number(r.rally_size) || 0,
      troop_type: r.troop_type,
      tier_level: r.tier_level,
      is_primary: !!r.is_primary,
      notes: r.notes ?? "",
    };

    const up = await supabase.from("player_alliance_hqs").update(payload).eq("id", r.id);
    if (up.error) { setStatus(up.error.message); return; }
    await loadHqs(r.profile_id);
    setStatus("");
  }

  async function addNew() {
    if (!profileId) return alert("Select an alliance profile first.");
    const row: any = {
      profile_id: profileId,
      hq_name: "New HQ",
      hq_level: 1,
      lair_level: 1,
      lair_percent: 0,
      troop_size: 0,
      march_size: 0,
      rally_size: 0,
      troop_type: "Fighter",
      tier_level: "T10",
      is_primary: rows.length === 0,
      notes: "",
    };

    setStatus("Adding…");
    const ins = await supabase.from("player_alliance_hqs").insert(row).select("*").single();
    if (ins.error) { setStatus(ins.error.message); return; }
    await loadHqs(profileId);
    setStatus("");
  }

  async function remove(id: string) {
    const ok = confirm("Delete this HQ?");
    if (!ok) return;
    setStatus("Deleting…");
    const del = await supabase.from("player_alliance_hqs").delete().eq("id", id);
    if (del.error) { setStatus(del.error.message); return; }
    await loadHqs(profileId);
    setStatus("");
  }

  function exportJson() {
    if (!selectedProfile) return;
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: selectedProfile,
      hqs: rows,
    };
    downloadText(`hqs-${selectedProfile.alliance_code}.json`, JSON.stringify(payload, null, 2));
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const obj = JSON.parse(String(reader.result ?? "{}"));
        const list = Array.isArray(obj) ? obj : (obj.hqs ?? []);
        if (!Array.isArray(list)) throw new Error("Expected array or {hqs: []}");

        if (!profileId) throw new Error("Select an alliance profile first.");

        setStatus("Importing…");
        for (const x of list) {
          const payload: any = {
            profile_id: profileId,
            hq_name: String(x.hq_name ?? x.hqName ?? "HQ"),
            hq_level: Number(x.hq_level ?? x.hqLevel ?? 1),
            lair_level: Number(x.lair_level ?? x.lairLevel ?? 1),
            lair_percent: Number(x.lair_percent ?? x.lairPercent ?? 0),
            troop_size: Number(x.troop_size ?? x.troopSize ?? 0),
            march_size: Number(x.march_size ?? x.marchSize ?? 0),
            rally_size: Number(x.rally_size ?? x.rallySize ?? 0),
            troop_type: (x.troop_type ?? x.troopType ?? "Fighter"),
            tier_level: (x.tier_level ?? x.tierLevel ?? "T10"),
            is_primary: !!(x.is_primary ?? x.isPrimary ?? false),
            notes: String(x.notes ?? ""),
          };
          await supabase.from("player_alliance_hqs").insert(payload);
        }

        await loadHqs(profileId);
        setStatus("");
        alert("Imported ✅");
      } catch (e: any) {
        alert("Import failed: " + String(e?.message ?? e));
        setStatus("");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>HQ Manager</h1>
      <div style={{ opacity: 0.8, marginTop: 6 }}>
        {userId ? "Signed in ✅" : "Not signed in"}{status ? " • " + status : ""}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
        <label style={{ opacity: 0.75 }}>Player</label>
        <select value={playerId} onChange={async (e) => { const v = e.target.value; setPlayerId(v); await loadProfiles(v); }}>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {(p.name ?? "Player")} • {p.game_name ?? ""} ({p.id.slice(0, 6)}…)
            </option>
          ))}
        </select>

        <label style={{ opacity: 0.75 }}>Alliance</label>
        <select value={profileId} onChange={async (e) => { const v = e.target.value; setProfileId(v); await loadHqs(v); }}>
          {profiles.map((a) => <option key={a.id} value={a.id}>{a.alliance_code}</option>)}
        </select>

        <button onClick={() => profileId && loadHqs(profileId)}>Reload HQs</button>
        <button onClick={addNew} disabled={!profileId}>+ Add HQ</button>
        <button onClick={exportJson} disabled={!profileId}>Export</button>

        <label style={{ cursor: "pointer" }}>
          <input type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.currentTarget.value = ""; }} />
          <span style={{ padding: "6px 10px", border: "1px solid #666", borderRadius: 8 }}>Import</span>
        </label>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      <div style={{ display: "grid", gap: 12 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ border: "1px solid #333", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 900 }}>{r.is_primary ? "⭐ " : ""}{r.hq_name}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => saveRow(r)}>Save</button>
                <button onClick={() => remove(r.id)}>Delete</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
              <div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>HQ Name</div>
                <input value={r.hq_name} onChange={(e) => updateRow(r.id, { hq_name: e.target.value })} />
              </div>
              <div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>HQ Level</div>
                <input type="number" value={String(r.hq_level)} onChange={(e) => updateRow(r.id, { hq_level: Number(e.target.value) })} />
              </div>
              <div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>Lair Level</div>
                <input type="number" value={String(r.lair_level)} onChange={(e) => updateRow(r.id, { lair_level: Number(e.target.value) })} />
              </div>
              <div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>Lair %</div>
                <input type="number" value={String(r.lair_percent)} onChange={(e) => updateRow(r.id, { lair_percent: Number(e.target.value) })} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
              <div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>Troop Size</div>
                <input type="number" value={String(r.troop_size)} onChange={(e) => updateRow(r.id, { troop_size: Number(e.target.value) })} />
              </div>
              <div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>March Size</div>
                <input type="number" value={String(r.march_size)} onChange={(e) => updateRow(r.id, { march_size: Number(e.target.value) })} />
              </div>
              <div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>Rally Size</div>
                <input type="number" value={String(r.rally_size)} onChange={(e) => updateRow(r.id, { rally_size: Number(e.target.value) })} />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="checkbox" checked={!!r.is_primary} onChange={(e) => updateRow(r.id, { is_primary: e.target.checked })} />
                  primary
                </label>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
              <div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>Troop Type</div>
                <select value={r.troop_type} onChange={(e) => updateRow(r.id, { troop_type: e.target.value as any })}>
                  {TROOP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>Tier</div>
                <select value={r.tier_level} onChange={(e) => updateRow(r.id, { tier_level: e.target.value as any })}>
                  {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ opacity: 0.7, fontSize: 12 }}>Notes</div>
              <textarea value={r.notes ?? ""} onChange={(e) => updateRow(r.id, { notes: e.target.value })} rows={2} style={{ width: "100%" }} />
            </div>
          </div>
        ))}
        {rows.length === 0 ? <div style={{ opacity: 0.75 }}>No HQs yet.</div> : null}
      </div>
    </div>
  );
}
