import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseBrowserClient";

const LS_STATE_ALERTS_V2 = "sad_state_789_alerts_v2";
const LS_MAIL = "sad_my_mail_v1";
const LS_DIRECTORY = "sad_alliance_directory_v1";

type TroopType = "Fighter" | "Shooter" | "Rider";
type TierLevel = "T5" | "T6" | "T7" | "T8" | "T9" | "T10" | "T11" | "T12" | "T13" | "T14";
const TROOP_TYPES: TroopType[] = ["Fighter", "Shooter", "Rider"];
const TIERS: TierLevel[] = ["T5","T6","T7","T8","T9","T10","T11","T12","T13","T14"];

type PlayerRow = {
  id: string;
  auth_user_id: string | null;
  name: string | null;
  game_name: string | null;
  note: string | null;
  discord_name?: string | null;
  timezone?: string | null;
  state_code?: string | null;
  last_alliance_code?: string | null;
};

type PlayerAllianceRow = {
  id: string;
  player_id: string;
  alliance_code: string;
  role: string | null;
  role_key: string | null;
  in_game_name?: string | null;
  notes?: string | null;
};

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
  updated_at?: string;
};

type AlertsStore = {
  version: 1;
  updatedAt: string;
  items: Array<{ id: string; createdAt: string; severity: "info" | "warning" | "critical"; title: string; pinned: boolean; acknowledgedBy: string[] }>;
};

type MailStore = {
  version: 1;
  updatedAt: string;
  threads: Array<{ id: string; title: string; updatedAt: string }>;
};

function nowIso() {
  return new Date().toISOString();
}
function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function toNum(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function readDirectorySuggestions(): Array<{ alliance_id: string; tag: string; name: string }> {
  const raw = localStorage.getItem(LS_DIRECTORY);
  const obj = safeJsonParse<any>(raw, null);
  const list =
    Array.isArray(obj) ? obj :
    (obj && Array.isArray(obj.alliances)) ? obj.alliances :
    null;

  if (!Array.isArray(list)) return [];
  return list
    .map((x: any) => ({
      alliance_id: String(x.alliance_id ?? x.id ?? x.code ?? ""),
      tag: String(x.tag ?? ""),
      name: String(x.name ?? ""),
    }))
    .filter((x) => x.alliance_id && (x.tag || x.name));
}

export default function MeDashboardPage() {
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");

  const [alliances, setAlliances] = useState<PlayerAllianceRow[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(""); // player_alliances.id
  const [hqs, setHqs] = useState<HQRow[]>([]);

  const [hqDraft, setHqDraft] = useState<Partial<HQRow>>(() => ({
    hq_name: "",
    hq_level: 1,
    lair_level: 1,
    lair_percent: 0,
    troop_size: 0,
    march_size: 0,
    rally_size: 0,
    troop_type: "Fighter",
    tier_level: "T10",
  }));

  const dirSuggestions = useMemo(() => readDirectorySuggestions(), []);

  const stateAlerts = useMemo(() => {
    const store = safeJsonParse<AlertsStore>(localStorage.getItem(LS_STATE_ALERTS_V2), { version: 1, updatedAt: nowIso(), items: [] });
    const items = store.items ?? [];
    const pinned = items.filter((a) => a.pinned).slice(0, 3);
    const unacked = items.filter((a) => (a.acknowledgedBy ?? []).length === 0);
    return { total: items.length, pinned, unackedCount: unacked.length };
  }, []);

  const mailSummary = useMemo(() => {
    const store = safeJsonParse<MailStore>(localStorage.getItem(LS_MAIL), { version: 1, updatedAt: nowIso(), threads: [] });
    const threads = store.threads ?? [];
    const last = threads.slice().sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))[0];
    return { count: threads.length, lastTitle: last?.title ?? "", lastAt: last?.updatedAt ?? "" };
  }, []);

  const selectedPlayer = useMemo(() => players.find((p) => p.id === selectedPlayerId) ?? null, [players, selectedPlayerId]);
  const selectedAllianceProfile = useMemo(() => alliances.find((a) => a.id === selectedProfileId) ?? null, [alliances, selectedProfileId]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? "";
      if (!mounted) return;
      setUserId(uid);
      if (uid) await refreshAll(uid);
    }

    void init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? "";
      setUserId(uid);
      if (uid) void refreshAll(uid);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function refreshAll(uid: string) {
    setLoading(true);
    setStatus("Loading from Supabase…");
    try {
      // Linked players via player_auth_links
      const linksRes = await supabase
        .from("player_auth_links")
        .select("player_id")
        .eq("user_id", uid);

      if (linksRes.error) throw linksRes.error;
      const linkedIds = (linksRes.data ?? []).map((x: any) => String(x.player_id)).filter(Boolean);

      // Players where auth_user_id = uid
      const directRes = await supabase
        .from("players")
        .select("*")
        .eq("auth_user_id", uid);

      if (directRes.error) throw directRes.error;

      // Players via link IDs
      let linkedPlayers: PlayerRow[] = [];
      if (linkedIds.length) {
        const lpRes = await supabase
          .from("players")
          .select("*")
          .in("id", linkedIds);
        if (lpRes.error) throw lpRes.error;
        linkedPlayers = (lpRes.data ?? []) as any;
      }

      // Merge unique by id
      const map = new Map<string, PlayerRow>();
      (directRes.data ?? []).forEach((p: any) => map.set(String(p.id), p));
      linkedPlayers.forEach((p: any) => map.set(String(p.id), p));
      const list = Array.from(map.values());

      setPlayers(list);

      // pick selected player
      const pick = selectedPlayerId && map.has(selectedPlayerId) ? selectedPlayerId : (list[0]?.id ?? "");
      setSelectedPlayerId(pick);

      if (pick) {
        await refreshPlayer(pick);
      } else {
        setAlliances([]);
        setSelectedProfileId("");
        setHqs([]);
      }

      setStatus("Synced ✅");
      window.setTimeout(() => setStatus(""), 1200);
    } catch (e: any) {
      console.error(e);
      setStatus(`Load failed: ${String(e?.message ?? e)}`);
    } finally {
      setLoading(false);
    }
  }

  async function refreshPlayer(playerId: string) {
    // alliances
    const aRes = await supabase
      .from("player_alliances")
      .select("*")
      .eq("player_id", playerId);

    if (aRes.error) throw aRes.error;

    const list = (aRes.data ?? []) as any as PlayerAllianceRow[];
    // Sort by alliance_code
    list.sort((x, y) => String(x.alliance_code).localeCompare(String(y.alliance_code)));
    setAlliances(list);

    // default profile
    const lastCode = selectedPlayer?.last_alliance_code ?? null;
    const byLast = lastCode ? list.find((x) => x.alliance_code === lastCode) : null;
    const nextProfileId = (selectedProfileId && list.find((x) => x.id === selectedProfileId))
      ? selectedProfileId
      : (byLast?.id ?? list[0]?.id ?? "");

    setSelectedProfileId(nextProfileId);

    if (nextProfileId) {
      await refreshHqs(nextProfileId);
    } else {
      setHqs([]);
    }
  }

  async function refreshHqs(profileId: string) {
    const hRes = await supabase
      .from("player_alliance_hqs")
      .select("*")
      .eq("profile_id", profileId)
      .order("updated_at", { ascending: false });

    if (hRes.error) throw hRes.error;
    setHqs((hRes.data ?? []) as any);
  }

  async function createMyPlayer() {
    if (!userId) return;
    const name = prompt("Display name (shown in dashboard):")?.trim() || "Player";
    const game = prompt("Game name (in-game):")?.trim() || name;

    setLoading(true);
    setStatus("Creating player…");
    try {
      const ins = await supabase
        .from("players")
        .insert({
          auth_user_id: userId,
          name,
          game_name: game,
          note: "",
          discord_name: "",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
          state_code: "789",
          last_alliance_code: null,
        })
        .select("*")
        .single();

      if (ins.error) throw ins.error;

      const p = ins.data as any as PlayerRow;
      setPlayers((prev) => [p, ...prev]);
      setSelectedPlayerId(p.id);
      await refreshPlayer(p.id);

      setStatus("Created ✅");
      window.setTimeout(() => setStatus(""), 1200);
    } catch (e: any) {
      console.error(e);
      setStatus(`Create failed: ${String(e?.message ?? e)}`);
    } finally {
      setLoading(false);
    }
  }

  async function savePlayerField(field: keyof PlayerRow, value: string) {
    if (!userId || !selectedPlayerId) return;
    const next = { ...(selectedPlayer as any), [field]: value };
    setPlayers((prev) => prev.map((p) => (p.id === selectedPlayerId ? (next as any) : p)));

    const up = await supabase
      .from("players")
      .update({ [field]: value })
      .eq("id", selectedPlayerId);

    if (up.error) setStatus(`Save failed: ${up.error.message}`);
  }

  async function saveAllianceProfileField(field: keyof PlayerAllianceRow, value: string) {
    if (!selectedProfileId) return;
    setAlliances((prev) => prev.map((a) => (a.id === selectedProfileId ? ({ ...a, [field]: value } as any) : a)));

    const up = await supabase
      .from("player_alliances")
      .update({ [field]: value })
      .eq("id", selectedProfileId);

    if (up.error) setStatus(`Save failed: ${up.error.message}`);
  }

  async function selectAllianceProfile(profileId: string) {
    setSelectedProfileId(profileId);
    if (profileId) await refreshHqs(profileId);

    // store last alliance choice on players table
    const prof = alliances.find((a) => a.id === profileId);
    const code = prof?.alliance_code ?? null;

    if (code && selectedPlayerId) {
      await supabase.from("players").update({ last_alliance_code: code }).eq("id", selectedPlayerId);
      setPlayers((prev) => prev.map((p) => (p.id === selectedPlayerId ? ({ ...(p as any), last_alliance_code: code } as any) : p)));
    }
  }

  async function addHQ() {
    if (!selectedProfileId) return alert("Select an alliance first.");
    const name = String(hqDraft.hq_name ?? "").trim();
    if (!name) return alert("HQ Name is required.");

    const row = {
      profile_id: selectedProfileId,
      hq_name: name,
      hq_level: clamp(toNum(hqDraft.hq_level, 1), 1, 60),
      lair_level: clamp(toNum(hqDraft.lair_level, 1), 1, 60),
      lair_percent: clamp(toNum(hqDraft.lair_percent, 0), 0, 100),
      troop_size: clamp(toNum(hqDraft.troop_size, 0), 0, 999999999),
      march_size: clamp(toNum(hqDraft.march_size, 0), 0, 999999999),
      rally_size: clamp(toNum(hqDraft.rally_size, 0), 0, 999999999),
      troop_type: (hqDraft.troop_type as any) || "Fighter",
      tier_level: (hqDraft.tier_level as any) || "T10",
    };

    const ins = await supabase.from("player_alliance_hqs").insert(row).select("*").single();
    if (ins.error) return setStatus(`Add HQ failed: ${ins.error.message}`);

    setHqs((prev) => [ins.data as any, ...prev]);
    setHqDraft((p) => ({ ...p, hq_name: "" }));
  }

  async function deleteHQ(id: string) {
    const ok = confirm("Delete this HQ?");
    if (!ok) return;
    const del = await supabase.from("player_alliance_hqs").delete().eq("id", id);
    if (del.error) return setStatus(`Delete failed: ${del.error.message}`);
    setHqs((prev) => prev.filter((x) => x.id !== id));
  }

  async function editHQ(id: string) {
    const cur = hqs.find((x) => x.id === id);
    if (!cur) return;

    const nextName = prompt("HQ Name:", cur.hq_name)?.trim();
    if (!nextName) return;

    const next = {
      hq_name: nextName,
      hq_level: clamp(Number(prompt("HQ Level:", String(cur.hq_level)) ?? cur.hq_level), 1, 60),
      lair_level: clamp(Number(prompt("Lair Level:", String(cur.lair_level)) ?? cur.lair_level), 1, 60),
      lair_percent: clamp(Number(prompt("Lair % (0-100):", String(cur.lair_percent)) ?? cur.lair_percent), 0, 100),
      troop_size: clamp(Number(prompt("Troop Size:", String(cur.troop_size)) ?? cur.troop_size), 0, 999999999),
      march_size: clamp(Number(prompt("March Size:", String(cur.march_size)) ?? cur.march_size), 0, 999999999),
      rally_size: clamp(Number(prompt("Rally Size:", String(cur.rally_size)) ?? cur.rally_size), 0, 999999999),
      // troop_type + tier_level can be added to prompt later (keep current for now)
    };

    const up = await supabase.from("player_alliance_hqs").update(next).eq("id", id);
    if (up.error) return setStatus(`Update failed: ${up.error.message}`);

    setHqs((prev) => prev.map((x) => (x.id === id ? ({ ...x, ...next } as any) : x)));
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>My Dashboard</h1>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6, opacity: 0.85 }}>
        <div>Auth: {userId ? "Signed in ✅" : "Not signed in"}</div>
        {loading ? <div>• Loading…</div> : null}
        {status ? <div>• {status}</div> : null}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
        <Link to="/state/789/ops">State Ops Console</Link>
        <Link to="/state/789/alerts-v2">State Alerts (V2)</Link>
        <Link to="/mail">My Mail</Link>
        <button disabled={!userId} onClick={() => userId && refreshAll(userId)}>Refresh</button>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      {/* Player selection */}
      <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>Player Profile</div>
        <div style={{ padding: 12, display: "grid", gap: 12 }}>
          {players.length === 0 ? (
            <div style={{ opacity: 0.8 }}>
              No player profile is linked to this account yet.
              <div style={{ marginTop: 10 }}>
                <button disabled={!userId} onClick={createMyPlayer}>Create my player profile</button>
              </div>
              <div style={{ opacity: 0.7, fontSize: 12, marginTop: 8 }}>
                If you already have a player record created by an admin, ask to be linked (Owner can link you via the Players Link tool).
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <select value={selectedPlayerId} onChange={async (e) => {
                  const pid = e.target.value;
                  setSelectedPlayerId(pid);
                  if (pid) await refreshPlayer(pid);
                }} style={{ minWidth: 340 }}>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {(p.name ?? "Player")} • {p.game_name ?? ""} ({p.id.slice(0, 6)}…)
                    </option>
                  ))}
                </select>
              </div>

              {selectedPlayer ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <div style={{ opacity: 0.75, fontSize: 12 }}>Display name</div>
                      <input value={selectedPlayer.name ?? ""} onChange={(e) => void savePlayerField("name", e.target.value)} />
                    </div>
                    <div>
                      <div style={{ opacity: 0.75, fontSize: 12 }}>Game name</div>
                      <input value={selectedPlayer.game_name ?? ""} onChange={(e) => void savePlayerField("game_name", e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <div style={{ opacity: 0.75, fontSize: 12 }}>Discord name</div>
                      <input value={String(selectedPlayer.discord_name ?? "")} onChange={(e) => void savePlayerField("discord_name" as any, e.target.value)} />
                    </div>
                    <div>
                      <div style={{ opacity: 0.75, fontSize: 12 }}>Timezone</div>
                      <input value={String(selectedPlayer.timezone ?? "")} onChange={(e) => void savePlayerField("timezone" as any, e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <div style={{ opacity: 0.75, fontSize: 12 }}>State</div>
                      <input value={String(selectedPlayer.state_code ?? "789")} onChange={(e) => void savePlayerField("state_code" as any, e.target.value)} />
                    </div>
                    <div>
                      <div style={{ opacity: 0.75, fontSize: 12 }}>Notes</div>
                      <input value={selectedPlayer.note ?? ""} onChange={(e) => void savePlayerField("note", e.target.value)} />
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Alerts + Mail */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>State Alerts</div>
          <div style={{ padding: 12 }}>
            <div style={{ opacity: 0.8 }}>
              Unacked: <b>{stateAlerts.unackedCount}</b> • Total: <b>{stateAlerts.total}</b>
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 800 }}>Pinned (top 3)</div>
              {stateAlerts.pinned.length === 0 ? (
                <div style={{ opacity: 0.7 }}>None pinned.</div>
              ) : (
                stateAlerts.pinned.map((a) => (
                  <div key={a.id} style={{ border: "1px solid #222", borderRadius: 10, padding: 10, marginTop: 8 }}>
                    <div style={{ fontWeight: 900 }}>[{a.severity.toUpperCase()}] {a.title}</div>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>{new Date(a.createdAt).toLocaleString()}</div>
                  </div>
                ))
              )}
              <div style={{ marginTop: 10 }}>
                <Link to="/state/789/alerts-v2">Open Alerts Center</Link>
              </div>
            </div>
          </div>
        </div>

        <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>My Mail</div>
          <div style={{ padding: 12 }}>
            <div>Threads: <b>{mailSummary.count}</b></div>
            <div style={{ opacity: 0.8, marginTop: 6 }}>Last: <b>{mailSummary.lastTitle || "(none)"}</b></div>
            {mailSummary.lastAt ? <div style={{ opacity: 0.7, fontSize: 12 }}>{new Date(mailSummary.lastAt).toLocaleString()}</div> : null}
            <div style={{ marginTop: 10 }}><Link to="/mail">Open My Mail</Link></div>
          </div>
        </div>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      {/* Alliance selector */}
      <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>Alliance Profile</div>
        <div style={{ padding: 12, display: "grid", gap: 12 }}>
          {alliances.length === 0 ? (
            <div style={{ opacity: 0.8 }}>
              No alliance memberships found for this player.
              <div style={{ opacity: 0.7, fontSize: 12, marginTop: 8 }}>
                This is controlled by onboarding/admin provisioning (not self-added).
              </div>
              {dirSuggestions.length ? (
                <div style={{ opacity: 0.8, marginTop: 12 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Alliance Directory (reference)</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {dirSuggestions.slice(0, 8).map((s) => (
                      <span key={s.alliance_id} style={{ border: "1px solid #222", borderRadius: 10, padding: "6px 10px" }}>
                        {(s.tag ? `[${s.tag}] ` : "")}{s.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <select value={selectedProfileId} onChange={(e) => void selectAllianceProfile(e.target.value)} style={{ minWidth: 340 }}>
                <option value="">Select an alliance…</option>
                {alliances.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.alliance_code} {a.role ? `• ${a.role}` : ""}
                  </option>
                ))}
              </select>

              {selectedAllianceProfile ? (
                <>
                  <div style={{ opacity: 0.8 }}>
                    Alliance: <b>{selectedAllianceProfile.alliance_code}</b> {selectedAllianceProfile.role ? `• Role: ${selectedAllianceProfile.role}` : ""}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <div style={{ opacity: 0.75, fontSize: 12 }}>In-game name (for this alliance)</div>
                      <input
                        value={String(selectedAllianceProfile.in_game_name ?? "")}
                        onChange={(e) => void saveAllianceProfileField("in_game_name" as any, e.target.value)}
                      />
                    </div>
                    <div>
                      <div style={{ opacity: 0.75, fontSize: 12 }}>Notes</div>
                      <input
                        value={String(selectedAllianceProfile.notes ?? "")}
                        onChange={(e) => void saveAllianceProfileField("notes" as any, e.target.value)}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ opacity: 0.7 }}>Select an alliance to manage HQs.</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* HQ Manager */}
      <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden", marginTop: 16 }}>
        <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>
          HQs {selectedAllianceProfile ? `• ${hqs.length} in ${selectedAllianceProfile.alliance_code}` : ""}
        </div>

        <div style={{ padding: 12, display: "grid", gap: 12 }}>
          {!selectedProfileId ? (
            <div style={{ opacity: 0.7 }}>Select an alliance above to add HQs.</div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>HQ Name</div>
                  <input value={String(hqDraft.hq_name ?? "")} onChange={(e) => setHqDraft((p) => ({ ...p, hq_name: e.target.value }))} />
                </div>
                <div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>HQ Level</div>
                  <input type="number" value={String(hqDraft.hq_level ?? 1)} onChange={(e) => setHqDraft((p) => ({ ...p, hq_level: toNum(e.target.value, 1) }))} />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button onClick={() => void addHQ()}>+ Add HQ</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>Lair Level</div>
                  <input type="number" value={String(hqDraft.lair_level ?? 1)} onChange={(e) => setHqDraft((p) => ({ ...p, lair_level: toNum(e.target.value, 1) }))} />
                </div>
                <div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>Lair %</div>
                  <input type="number" value={String(hqDraft.lair_percent ?? 0)} onChange={(e) => setHqDraft((p) => ({ ...p, lair_percent: toNum(e.target.value, 0) }))} />
                </div>
                <div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>Troop Type</div>
                  <select value={String(hqDraft.troop_type ?? "Fighter")} onChange={(e) => setHqDraft((p) => ({ ...p, troop_type: e.target.value as any }))}>
                    {TROOP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>Troop Size</div>
                  <input type="number" value={String(hqDraft.troop_size ?? 0)} onChange={(e) => setHqDraft((p) => ({ ...p, troop_size: toNum(e.target.value, 0) }))} />
                </div>
                <div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>March Size</div>
                  <input type="number" value={String(hqDraft.march_size ?? 0)} onChange={(e) => setHqDraft((p) => ({ ...p, march_size: toNum(e.target.value, 0) }))} />
                </div>
                <div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>Rally Size</div>
                  <input type="number" value={String(hqDraft.rally_size ?? 0)} onChange={(e) => setHqDraft((p) => ({ ...p, rally_size: toNum(e.target.value, 0) }))} />
                </div>
                <div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>Tier</div>
                  <select value={String(hqDraft.tier_level ?? "T10")} onChange={(e) => setHqDraft((p) => ({ ...p, tier_level: e.target.value as any }))}>
                    {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {hqs.length === 0 ? (
                  <div style={{ opacity: 0.7 }}>No HQs for this alliance yet.</div>
                ) : (
                  hqs.map((hq) => (
                    <div key={hq.id} style={{ border: "1px solid #222", borderRadius: 10, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontWeight: 900 }}>{hq.hq_name} • HQ {hq.hq_level}</div>
                          <div style={{ opacity: 0.75, fontSize: 12 }}>
                            Lair {hq.lair_level} ({hq.lair_percent}%) • {hq.troop_type} • {hq.tier_level}
                          </div>
                          <div style={{ opacity: 0.75, fontSize: 12 }}>
                            Troop {hq.troop_size} • March {hq.march_size} • Rally {hq.rally_size}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => void editHQ(hq.id)}>Edit</button>
                          <button onClick={() => void deleteHQ(hq.id)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Achievements */}
      <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden", marginTop: 16 }}>
        <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>My Achievements</div>
        <div style={{ padding: 12, opacity: 0.85 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/state/789/achievements">Achievements Hub</Link>
            <Link to="/state/789/achievements-progress">Progress</Link>
            <Link to="/state/789/achievement-request">Submit request</Link>
          </div>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 10 }}>
            Next: show “my requests / my completed” here once the achievements schema is fully locked.
          </div>
        </div>
      </div>
    </div>
  );
}
