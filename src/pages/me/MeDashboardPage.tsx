import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const LS_PROFILE = "sad_me_profile_v1";
const LS_ALLIANCES = "sad_me_alliance_profiles_v1";
const LS_HQS = "sad_me_hqs_v1";
const LS_SELECTED = "sad_me_selected_alliance_v1";

// Reads from your Alerts V2 page
const LS_STATE_ALERTS_V2 = "sad_state_789_alerts_v2";

// Reads from your Mail UI store
const LS_MAIL = "sad_my_mail_v1";

// Directory suggestions (optional)
const LS_DIRECTORY = "sad_alliance_directory_v1";

type TroopType = "Fighter" | "Shooter" | "Rider";
type TierLevel =
  | "T5" | "T6" | "T7" | "T8" | "T9"
  | "T10" | "T11" | "T12" | "T13" | "T14";

const TROOP_TYPES: TroopType[] = ["Fighter", "Shooter", "Rider"];
const TIERS: TierLevel[] = ["T5","T6","T7","T8","T9","T10","T11","T12","T13","T14"];

type MeProfile = {
  version: 1;
  updatedAt: string;
  displayName: string;
  discordName: string;
  timezone: string;
  state: string; // default "789"
  notes: string;
};

type AllianceProfile = {
  alliance_id: string; // can be UUID or your internal id
  tag: string;
  name: string;
  inGameName: string;
  roleLabel: string; // R5/R4/etc (FYI only)
  notes: string;
};

type AllianceProfilesStore = {
  version: 1;
  updatedAt: string;
  items: Record<string, AllianceProfile>; // key = alliance_id
};

type HQ = {
  id: string;
  alliance_id: string;

  hqName: string;
  hqLevel: number;

  lairLevel: number;
  lairPercent: number; // 0-100

  troopSize: number;
  marchSize: number;
  rallySize: number;

  troopType: TroopType;
  tierLevel: TierLevel;

  updatedAt: string;
};

type AlertsStore = {
  version: 1;
  updatedAt: string;
  items: Array<{
    id: string;
    createdAt: string;
    createdBy: string;
    severity: "info" | "warning" | "critical";
    title: string;
    body: string;
    tags: string[];
    pinned: boolean;
    acknowledgedBy: string[];
  }>;
};

type MailStore = {
  version: 1;
  updatedAt: string;
  threads: Array<{
    id: string;
    title: string;
    updatedAt: string;
    pinned?: boolean;
    tags?: string[];
    messages: Array<{ id: string; at: string; author: string; body: string }>;
  }>;
};

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveLS(key: string, obj: any) {
  const raw = JSON.stringify(obj, null, 2);
  localStorage.setItem(key, raw);
  try {
    // eslint-disable-next-line no-new
    const ev = new StorageEvent("storage", { key, newValue: raw });
    window.dispatchEvent(ev);
  } catch {
    window.dispatchEvent(new CustomEvent("sad:localstorage", { detail: { key, newValue: raw } }));
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toNum(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function defaultMeProfile(): MeProfile {
  return {
    version: 1,
    updatedAt: nowIso(),
    displayName: "Player",
    discordName: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    state: "789",
    notes: "",
  };
}

function defaultAllianceStore(): AllianceProfilesStore {
  return { version: 1, updatedAt: nowIso(), items: {} };
}

function readDirectorySuggestions(): Array<{ alliance_id: string; tag: string; name: string; state?: string }> {
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
      state: x.state ? String(x.state) : undefined,
    }))
    .filter((x) => x.alliance_id && (x.tag || x.name));
}

function exportBundle() {
  const keys = [LS_PROFILE, LS_ALLIANCES, LS_HQS, LS_SELECTED];
  const items: Record<string, string> = {};
  keys.forEach((k) => {
    const v = localStorage.getItem(k);
    if (typeof v === "string") items[k] = v;
  });
  const bundle = { version: 1, exportedAt: nowIso(), items };
  return JSON.stringify(bundle, null, 2);
}

export default function MeDashboardPage() {
  const [me, setMe] = useState<MeProfile>(() => safeJsonParse<MeProfile>(localStorage.getItem(LS_PROFILE), defaultMeProfile()));
  const [alliances, setAlliances] = useState<AllianceProfilesStore>(() =>
    safeJsonParse<AllianceProfilesStore>(localStorage.getItem(LS_ALLIANCES), defaultAllianceStore())
  );
  const [selectedAllianceId, setSelectedAllianceId] = useState<string>(() => localStorage.getItem(LS_SELECTED) ?? "");

  const [hqs, setHqs] = useState<HQ[]>(() => safeJsonParse<HQ[]>(localStorage.getItem(LS_HQS), []));

  const [hqDraft, setHqDraft] = useState<Partial<HQ>>(() => ({
    hqName: "",
    hqLevel: 1,
    lairLevel: 1,
    lairPercent: 0,
    troopSize: 0,
    marchSize: 0,
    rallySize: 0,
    troopType: "Fighter",
    tierLevel: "T10",
  }));

  const dirSuggestions = useMemo(() => readDirectorySuggestions(), []);
  const allianceList = useMemo(() => Object.values(alliances.items ?? {}), [alliances]);

  const selectedAlliance = useMemo(() => {
    if (!selectedAllianceId) return null;
    return alliances.items?.[selectedAllianceId] ?? null;
  }, [alliances, selectedAllianceId]);

  const myHqs = useMemo(() => {
    if (!selectedAllianceId) return [];
    return (hqs ?? []).filter((x) => x.alliance_id === selectedAllianceId);
  }, [hqs, selectedAllianceId]);

  const stateAlerts = useMemo(() => {
    const store = safeJsonParse<AlertsStore>(localStorage.getItem(LS_STATE_ALERTS_V2), { version: 1, updatedAt: nowIso(), items: [] });
    const items = store.items ?? [];
    const pinned = items.filter((a) => a.pinned);
    const critical = items.filter((a) => a.severity === "critical");
    const unacked = items.filter((a) => (a.acknowledgedBy ?? []).length === 0);
    return {
      total: items.length,
      pinned: pinned.slice(0, 3),
      critical: critical.slice(0, 3),
      unackedCount: unacked.length,
    };
  }, []);

  const mailSummary = useMemo(() => {
    const store = safeJsonParse<MailStore>(localStorage.getItem(LS_MAIL), { version: 1, updatedAt: nowIso(), threads: [] });
    const threads = store.threads ?? [];
    const last = threads.slice().sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))[0];
    return { count: threads.length, lastTitle: last?.title ?? "", lastAt: last?.updatedAt ?? "" };
  }, []);

  function persistMe(next: MeProfile) {
    const withTs: MeProfile = { ...next, updatedAt: nowIso() };
    setMe(withTs);
    saveLS(LS_PROFILE, withTs);
  }

  function persistAlliances(next: AllianceProfilesStore) {
    const withTs: AllianceProfilesStore = { ...next, updatedAt: nowIso() };
    setAlliances(withTs);
    saveLS(LS_ALLIANCES, withTs);
  }

  function persistHqs(next: HQ[]) {
    setHqs(next);
    saveLS(LS_HQS, next);
  }

  function selectAlliance(id: string) {
    setSelectedAllianceId(id);
    localStorage.setItem(LS_SELECTED, id);
  }

  function addAllianceManual() {
    const alliance_id = prompt("Alliance id (uuid or internal id):")?.trim();
    if (!alliance_id) return;

    const tag = prompt("Alliance tag (ex: ABC):")?.trim() ?? "";
    const name = prompt("Alliance name:")?.trim() ?? "";

    const item: AllianceProfile = {
      alliance_id,
      tag,
      name,
      inGameName: me.displayName,
      roleLabel: "",
      notes: "",
    };

    persistAlliances({
      ...alliances,
      items: { ...(alliances.items ?? {}), [alliance_id]: item },
    });

    selectAlliance(alliance_id);
  }

  function addAllianceFromDirectory(s: { alliance_id: string; tag: string; name: string }) {
    const alliance_id = s.alliance_id;
    const item: AllianceProfile = {
      alliance_id,
      tag: s.tag,
      name: s.name,
      inGameName: me.displayName,
      roleLabel: "",
      notes: "",
    };

    persistAlliances({
      ...alliances,
      items: { ...(alliances.items ?? {}), [alliance_id]: item },
    });

    selectAlliance(alliance_id);
  }

  function removeAlliance(alliance_id: string) {
    const ok = confirm("Remove this alliance profile? (HQs under it will remain unless you delete them.)");
    if (!ok) return;

    const items = { ...(alliances.items ?? {}) };
    delete items[alliance_id];
    persistAlliances({ ...alliances, items });

    if (selectedAllianceId === alliance_id) {
      const next = Object.keys(items)[0] ?? "";
      selectAlliance(next);
    }
  }

  function saveAllianceField(k: keyof AllianceProfile, v: string) {
    if (!selectedAlliance) return;
    const next: AllianceProfile = { ...selectedAlliance, [k]: v };
    persistAlliances({
      ...alliances,
      items: { ...(alliances.items ?? {}), [selectedAlliance.alliance_id]: next },
    });
  }

  function addHQ() {
    if (!selectedAllianceId) return alert("Select an alliance first.");
    const name = String(hqDraft.hqName ?? "").trim();
    if (!name) return alert("HQ Name is required.");

    const entry: HQ = {
      id: uid("hq"),
      alliance_id: selectedAllianceId,
      hqName: name,
      hqLevel: clamp(toNum(hqDraft.hqLevel, 1), 1, 60),

      lairLevel: clamp(toNum(hqDraft.lairLevel, 1), 1, 60),
      lairPercent: clamp(toNum(hqDraft.lairPercent, 0), 0, 100),

      troopSize: clamp(toNum(hqDraft.troopSize, 0), 0, 999999999),
      marchSize: clamp(toNum(hqDraft.marchSize, 0), 0, 999999999),
      rallySize: clamp(toNum(hqDraft.rallySize, 0), 0, 999999999),

      troopType: (hqDraft.troopType as any) || "Fighter",
      tierLevel: (hqDraft.tierLevel as any) || "T10",

      updatedAt: nowIso(),
    };

    persistHqs([entry, ...(hqs ?? [])]);

    // keep most fields, clear name
    setHqDraft((prev) => ({ ...prev, hqName: "" }));
  }

  function deleteHQ(id: string) {
    const ok = confirm("Delete this HQ?");
    if (!ok) return;
    persistHqs((hqs ?? []).filter((x) => x.id !== id));
  }

  function editHQ(id: string) {
    const cur = (hqs ?? []).find((x) => x.id === id);
    if (!cur) return;

    const nextName = prompt("HQ Name:", cur.hqName)?.trim();
    if (!nextName) return;

    const next = (hqs ?? []).map((x) =>
      x.id === id
        ? {
            ...x,
            hqName: nextName,
            hqLevel: clamp(Number(prompt("HQ Level:", String(x.hqLevel)) ?? x.hqLevel), 1, 60),
            lairLevel: clamp(Number(prompt("Lair Level:", String(x.lairLevel)) ?? x.lairLevel), 1, 60),
            lairPercent: clamp(Number(prompt("Lair % (0-100):", String(x.lairPercent)) ?? x.lairPercent), 0, 100),
            troopSize: clamp(Number(prompt("Troop Size:", String(x.troopSize)) ?? x.troopSize), 0, 999999999),
            marchSize: clamp(Number(prompt("March Size:", String(x.marchSize)) ?? x.marchSize), 0, 999999999),
            rallySize: clamp(Number(prompt("Rally Size:", String(x.rallySize)) ?? x.rallySize), 0, 999999999),
            updatedAt: nowIso(),
          }
        : x
    );

    persistHqs(next);
  }

  function exportMyBundle() {
    const raw = exportBundle();
    void navigator.clipboard?.writeText(raw);
    alert("Export copied to clipboard (also available in Owner Data Vault).");
  }

  function importMyBundle() {
    const raw = prompt("Paste export JSON here:");
    if (!raw) return;
    try {
      const obj = JSON.parse(raw);
      const items = obj?.items ?? obj;
      if (!items || typeof items !== "object") throw new Error("No items found.");
      Object.keys(items).forEach((k) => {
        if (typeof items[k] === "string") localStorage.setItem(k, items[k]);
      });
      alert("Imported. Refresh /me.");
    } catch (e: any) {
      alert("Import failed: " + String(e?.message ?? e));
    }
  }

  const allianceDashboardLink = selectedAllianceId ? `/dashboard/${selectedAllianceId}` : "";
  const announcementsLink = selectedAllianceId ? `/dashboard/${selectedAllianceId}/announcements` : "";
  const calendarLink = selectedAllianceId ? `/dashboard/${selectedAllianceId}/calendar` : "";

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>My Dashboard</h1>
      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Personal + per-alliance profile (UI-only v1). Use <Link to="/owner/data-vault">Data Vault</Link> to back up settings.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
        <button onClick={exportMyBundle}>Copy my profile export</button>
        <button onClick={importMyBundle}>Import my profile export</button>
        <Link to="/state/789/ops">State Ops Console</Link>
        <Link to="/state/789/alerts-v2">State Alerts (V2)</Link>
        <Link to="/mail">My Mail</Link>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      {/* Profile */}
      <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>My Profile</div>
        <div style={{ padding: 12, display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>Display name</div>
              <input value={me.displayName} onChange={(e) => persistMe({ ...me, displayName: e.target.value })} />
            </div>
            <div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>Discord name</div>
              <input value={me.discordName} onChange={(e) => persistMe({ ...me, discordName: e.target.value })} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>Timezone</div>
              <input value={me.timezone} onChange={(e) => persistMe({ ...me, timezone: e.target.value })} />
            </div>
            <div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>State</div>
              <input value={me.state} onChange={(e) => persistMe({ ...me, state: e.target.value })} />
            </div>
          </div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12 }}>Notes</div>
            <textarea value={me.notes} onChange={(e) => persistMe({ ...me, notes: e.target.value })} rows={3} style={{ width: "100%" }} />
          </div>
        </div>
      </div>

      {/* Alerts + Mail quick summary */}
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
            <div>
              Threads: <b>{mailSummary.count}</b>
            </div>
            <div style={{ opacity: 0.8, marginTop: 6 }}>
              Last: <b>{mailSummary.lastTitle || "(none)"}</b>
            </div>
            {mailSummary.lastAt ? <div style={{ opacity: 0.7, fontSize: 12 }}>{new Date(mailSummary.lastAt).toLocaleString()}</div> : null}
            <div style={{ marginTop: 10 }}>
              <Link to="/mail">Open My Mail</Link>
            </div>
          </div>
        </div>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      {/* Alliance selector + profile */}
      <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>Alliance Profiles</div>
        <div style={{ padding: 12, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={selectedAllianceId}
              onChange={(e) => selectAlliance(e.target.value)}
              style={{ minWidth: 340 }}
            >
              <option value="">Select an alliance…</option>
              {allianceList.map((a) => (
                <option key={a.alliance_id} value={a.alliance_id}>
                  {(a.tag ? `[${a.tag}] ` : "")}{a.name || a.alliance_id}
                </option>
              ))}
            </select>

            <button onClick={addAllianceManual}>+ Add alliance</button>
          </div>

          {dirSuggestions.length ? (
            <div style={{ opacity: 0.85 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Suggestions (from directory)</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {dirSuggestions.slice(0, 8).map((s) => (
                  <button key={s.alliance_id} onClick={() => addAllianceFromDirectory(s)}>
                    {(s.tag ? `[${s.tag}] ` : "")}{s.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {!selectedAlliance ? (
            <div style={{ opacity: 0.7 }}>Select an alliance to edit your alliance-specific profile and HQs.</div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>
                  {(selectedAlliance.tag ? `[${selectedAlliance.tag}] ` : "")}{selectedAlliance.name || selectedAlliance.alliance_id}
                </div>
                <button onClick={() => removeAlliance(selectedAlliance.alliance_id)}>Remove profile</button>
                {allianceDashboardLink ? <Link to={allianceDashboardLink}>Open Alliance Dashboard</Link> : null}
                {announcementsLink ? <Link to={announcementsLink}>Alliance Announcements</Link> : null}
                {calendarLink ? <Link to={calendarLink}>Alliance Calendar</Link> : null}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>In-game name (for this alliance)</div>
                  <input value={selectedAlliance.inGameName} onChange={(e) => saveAllianceField("inGameName", e.target.value)} />
                </div>
                <div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>Role label (R5/R4/etc)</div>
                  <input value={selectedAlliance.roleLabel} onChange={(e) => saveAllianceField("roleLabel", e.target.value)} />
                </div>
              </div>

              <div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>Alliance notes</div>
                <textarea value={selectedAlliance.notes} onChange={(e) => saveAllianceField("notes", e.target.value)} rows={3} style={{ width: "100%" }} />
              </div>

              <div style={{ borderTop: "1px solid #222", paddingTop: 12 }}>
                <div style={{ fontWeight: 900 }}>Alliance Alerts (v1)</div>
                <div style={{ opacity: 0.75, marginTop: 6 }}>
                  For now, use <Link to={announcementsLink}>Alliance Announcements</Link>. (We can add a dedicated alliance-alerts composer next.)
                </div>
              </div>

              <div style={{ borderTop: "1px solid #222", paddingTop: 12 }}>
                <div style={{ fontWeight: 900 }}>Today’s Events</div>
                <div style={{ opacity: 0.75, marginTop: 6 }}>
                  Open <Link to={calendarLink}>Alliance Calendar</Link> for today’s schedule. (Next step: add “Today list” once the calendar schema/caching is locked.)
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* HQ manager */}
      <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden", marginTop: 16 }}>
        <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>
          HQs (per alliance) {selectedAlliance ? `• ${myHqs.length} in selected alliance` : ""}
        </div>

        <div style={{ padding: 12, display: "grid", gap: 12 }}>
          {!selectedAllianceId ? (
            <div style={{ opacity: 0.7 }}>Select an alliance above to add HQs.</div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>HQ Name</div>
                  <input value={String(hqDraft.hqName ?? "")} onChange={(e) => setHqDraft((p) => ({ ...p, hqName: e.target.value }))} />
                </div>
                <div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>HQ Level</div>
                  <input
                    type="number"
                    value={String(hqDraft.hqLevel ?? 1)}
                    onChange={(e) => setHqDraft((p) => ({ ...p, hqLevel: toNum(e.target.value, 1) }))}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button onClick={addHQ}>+ Add HQ</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>Lair Level</div>
                  <input type="number" value={String(hqDraft.lairLevel ?? 1)} onChange={(e) => setHqDraft((p) => ({ ...p, lairLevel: toNum(e.target.value, 1) }))} />
                </div>
                <div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>Lair %</div>
                  <input type="number" value={String(hqDraft.lairPercent ?? 0)} onChange={(e) => setHqDraft((p) => ({ ...p, lairPercent: toNum(e.target.value, 0) }))} />
                </div>
                <div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>Troop Type</div>
                  <select value={String(hqDraft.troopType ?? "Fighter")} onChange={(e) => setHqDraft((p) => ({ ...p, troopType: e.target.value as any }))}>
                    {TROOP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>Troop Size</div>
                  <input type="number" value={String(hqDraft.troopSize ?? 0)} onChange={(e) => setHqDraft((p) => ({ ...p, troopSize: toNum(e.target.value, 0) }))} />
                </div>
                <div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>March Size</div>
                  <input type="number" value={String(hqDraft.marchSize ?? 0)} onChange={(e) => setHqDraft((p) => ({ ...p, marchSize: toNum(e.target.value, 0) }))} />
                </div>
                <div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>Rally Size</div>
                  <input type="number" value={String(hqDraft.rallySize ?? 0)} onChange={(e) => setHqDraft((p) => ({ ...p, rallySize: toNum(e.target.value, 0) }))} />
                </div>
                <div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>Tier</div>
                  <select value={String(hqDraft.tierLevel ?? "T10")} onChange={(e) => setHqDraft((p) => ({ ...p, tierLevel: e.target.value as any }))}>
                    {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
                Tip: use “Edit” to quickly adjust numeric fields. Troop Type/Tier editing can be enhanced next.
              </div>

              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {myHqs.length === 0 ? (
                  <div style={{ opacity: 0.7 }}>No HQs for this alliance yet.</div>
                ) : (
                  myHqs.map((hq) => (
                    <div key={hq.id} style={{ border: "1px solid #222", borderRadius: 10, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontWeight: 900 }}>
                            {hq.hqName} • HQ {hq.hqLevel}
                          </div>
                          <div style={{ opacity: 0.75, fontSize: 12 }}>
                            Lair {hq.lairLevel} ({hq.lairPercent}%) • {hq.troopType} • {hq.tierLevel}
                          </div>
                          <div style={{ opacity: 0.75, fontSize: 12 }}>
                            Troop {hq.troopSize} • March {hq.marchSize} • Rally {hq.rallySize}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => editHQ(hq.id)}>Edit</button>
                          <button onClick={() => deleteHQ(hq.id)}>Delete</button>
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
          <div>Use the state pages for now:</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
            <Link to="/state/789/achievements">Achievements Hub</Link>
            <Link to="/state/789/achievements-progress">Progress</Link>
            <Link to="/state/789/achievement-request">Submit request</Link>
          </div>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 10 }}>
            Next step: wire this panel to your achievements tables for “my requests / my completed” once we confirm final schema columns.
          </div>
        </div>
      </div>
    </div>
  );
}
