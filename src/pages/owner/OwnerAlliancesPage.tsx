import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// Prefer setting one of these:
// - VITE_STATE_UUID = <uuid>
// - VITE_STATE_ID   = 789   (we will look up states.state_code = S789 and use states.id/state_id)
const RAW_STATE = String(
  (import.meta as any).env?.VITE_STATE_UUID ??
  (import.meta as any).env?.VITE_STATE_ID ??
  ""
).trim();

type AllianceRow = {
  code: string;
  name: string | null;
  enabled?: boolean | null;
};

function normCode(v: string) {
  return v.trim().toUpperCase();
}

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

async function resolveStateIdForAlliance(): Promise<any | undefined> {
  // 1) If env provides a UUID directly, use it.
  if (RAW_STATE && isUuid(RAW_STATE)) return RAW_STATE;

  // 2) If env provides a number like 789, look up states.state_code = S789 and take states.id (uuid) if present.
  if (RAW_STATE && /^\d+$/.test(RAW_STATE)) {
    const stateCode = `S${RAW_STATE}`;
    const { data, error } = await supabase
      .from("states")
      .select("id,state_id,state_code")
      .eq("state_code", stateCode)
      .maybeSingle();

    if (!error && data) {
      const anyRow: any = data as any;
      return anyRow.id ?? anyRow.state_id ?? undefined;
    }

    // Some older schemas might use int ids — if so, returning int can help.
    return parseInt(RAW_STATE, 10);
  }

  // 3) If env provides something like S789, try state_code match.
  if (RAW_STATE) {
    const stateCode = RAW_STATE.toUpperCase().startsWith("S") ? RAW_STATE.toUpperCase() : `S${RAW_STATE.toUpperCase()}`;
    const { data, error } = await supabase
      .from("states")
      .select("id,state_id,state_code")
      .eq("state_code", stateCode)
      .maybeSingle();

    if (!error && data) {
      const anyRow: any = data as any;
      return anyRow.id ?? anyRow.state_id ?? undefined;
    }
  }

  // 4) Last fallback: pick the first state row (keeps UI working if env not set).
  const { data } = await supabase
    .from("states")
    .select("id,state_id,state_code")
    .order("state_code", { ascending: true })
    .limit(1)
    .maybeSingle();

  const anyRow: any = data as any;
  return anyRow?.id ?? anyRow?.state_id ?? undefined;
}

export default function OwnerAlliancesPage() {
  const [rows, setRows] = useState<AllianceRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newEnabled, setNewEnabled] = useState(true);

  const refetch = async () => {
    setLoading(true);

    // try with enabled; fallback if column doesn't exist
    let data: any[] | null = null;

    const resA = await supabase
      .from("alliances")
      .select("code,name,enabled")
      .order("code", { ascending: true });

    if (!resA.error) {
      data = resA.data as any[];
    } else {
      const msg = (resA.error.message || "").toLowerCase();
      if (msg.includes("enabled")) {
        const resB = await supabase
          .from("alliances")
          .select("code,name")
          .order("code", { ascending: true });

        if (resB.error) {
          console.error(resB.error);
          alert(resB.error.message);
          setLoading(false);
          return;
        }
        data = (resB.data as any[]).map((r) => ({ ...r, enabled: true }));
      } else {
        console.error(resA.error);
        alert(resA.error.message);
        setLoading(false);
        return;
      }
    }

    setRows((data || []) as AllianceRow[]);
    setLoading(false);
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const insertAllianceWithFallbacks = async (payload: any) => {
    // First attempt
    let res = await supabase.from("alliances").insert(payload);
    if (!res.error) return res;

    const msg1 = (res.error.message || "").toLowerCase();

    // If enabled column doesn't exist, retry without enabled
    if (msg1.includes("enabled")) {
      const p2 = { ...payload };
      delete p2.enabled;
      res = await supabase.from("alliances").insert(p2);
      if (!res.error) return res;
    }

    // If state_id mismatches schema, retry WITHOUT state_id (so creating alliances never blocks)
    const msg2 = (res.error.message || "").toLowerCase();
    if (msg2.includes("state_id") && (msg2.includes("uuid") || msg2.includes("integer") || msg2.includes("type"))) {
      const p3 = { ...payload };
      delete p3.state_id;
      delete p3.stateId;
      res = await supabase.from("alliances").insert(p3);
      if (!res.error) return res;
    }

    return res;
  };

  const createAlliance = async () => {
    const code = normCode(newCode);
    const name = newName.trim() || code;

    if (!code) return alert("Alliance code required (example: OZR)");
    if (!/^[A-Z0-9]{2,12}$/.test(code)) return alert("Code must be 2–12 chars (A–Z, 0–9).");

    // Build payload and try to attach a valid state_id if possible
    const payload: any = { code, name, enabled: newEnabled };

    try {
      const stateId = await resolveStateIdForAlliance();
      if (stateId !== undefined && stateId !== null && String(stateId).trim() !== "") {
        payload.state_id = stateId;
      }
    } catch (e) {
      // Ignore state lookup failures; we’ll still create the alliance
      console.warn("State resolve skipped:", e);
    }

    const res = await insertAllianceWithFallbacks(payload);

    if (res.error) {
      console.error(res.error);
      alert(res.error.message);
      return;
    }

    setNewCode("");
    setNewName("");
    setNewEnabled(true);
    await refetch();
  };

  const renameAlliance = async (code: string) => {
    const current = rows.find((r) => r.code === code);
    const next = prompt("Alliance name:", current?.name || code);
    if (next == null) return;
    const name = next.trim() || code;

    const { error } = await supabase.from("alliances").update({ name }).eq("code", code);
    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }
    await refetch();
  };

  const toggleEnabled = async (code: string, enabled: boolean) => {
    const res = await supabase.from("alliances").update({ enabled }).eq("code", code);
    if (res.error) {
      console.error(res.error);
      alert(res.error.message);
      return;
    }
    await refetch();
  };

  const deleteAlliance = async (code: string) => {
    if (!confirm(`Delete alliance ${code}? This may fail if referenced by members/events.`)) return;

    const { error } = await supabase.from("alliances").delete().eq("code", code);
    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }
    await refetch();
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>🧟 Owner — Alliances</h2>

      <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12, maxWidth: 900 }}>
        <h3 style={{ marginTop: 0 }}>Create Alliance</h3>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Code</span>
            <input
              type="text"
              inputMode="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="OZR"
              autoCapitalize="characters"
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Name</span>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="OzR MindHunters"
            />
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
            <input type="checkbox" checked={newEnabled} onChange={(e) => setNewEnabled(e.target.checked)} />
            Enabled
          </label>

          <button onClick={createAlliance}>➕ Create</button>
          <button onClick={refetch}>↻ Refresh</button>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
          New alliances immediately work at: <code>/dashboard/&lt;CODE&gt;/calendar</code> and <code>/dashboard/&lt;CODE&gt;/hq-map</code>
        </div>
      </div>

      <div style={{ marginTop: 14, border: "1px solid #333", borderRadius: 10, padding: 12, maxWidth: 900 }}>
        <h3 style={{ marginTop: 0 }}>Alliances</h3>

        {loading ? <div>Loading…</div> : null}

        {rows.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No alliances yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {rows.map((r) => {
              const enabled = r.enabled !== false;
              return (
                <div key={r.code} style={{ border: "1px solid #2a2a2a", borderRadius: 10, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 900 }}>{r.code}</div>
                      <div style={{ opacity: 0.85 }}>{r.name || r.code}</div>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      {"enabled" in r ? (
                        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => toggleEnabled(r.code, e.target.checked)}
                          />
                          Enabled
                        </label>
                      ) : null}

                      <button onClick={() => renameAlliance(r.code)}>✏️ Rename</button>
                      <button onClick={() => deleteAlliance(r.code)}>🗑 Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
        Direct link: <code>/owner/alliances</code>
      </div>
    </div>
  );
}
