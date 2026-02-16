import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// Accepts VITE_STATE_ID as either:
// - a UUID (preferred if you have it), OR
// - "789" / "S789" (we’ll resolve it via states table)
const RAW_STATE = String(import.meta.env.VITE_STATE_ID ?? "789").trim();
const STATE_CODE = RAW_STATE.toUpperCase().startsWith("S")
  ? RAW_STATE.toUpperCase()
  : `S${RAW_STATE}`;

type AllianceRow = {
  code: string;
  name: string | null;
  enabled?: boolean | null;
};

function normCode(v: string) {
  return v.trim().toUpperCase();
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function detectAllianceStateIdKind(): Promise<"uuid" | "int" | "unknown"> {
  const { data, error } = await supabase
    .from("alliances")
    .select("state_id")
    .limit(1)
    .maybeSingle();

  if (error) return "unknown";

  const v: any = (data as any)?.state_id;
  if (typeof v === "number") return "int";
  if (typeof v === "string" && UUID_RE.test(v)) return "uuid";
  return "unknown";
}

async function resolveStateIdForAlliances(
  kind: "uuid" | "int" | "unknown"
): Promise<string | number | null> {
  // If env is a UUID and we need UUID, use it
  if (kind === "uuid" && UUID_RE.test(RAW_STATE)) return RAW_STATE;

  const tryByCol = async (col: string) => {
    const { data, error } = await supabase
      .from("states")
      .select("*")
      .eq(col as any, STATE_CODE)
      .limit(1);

    if (error) return null;
    return (data || [])[0] ?? null;
  };

  // Try likely columns without assuming schema
  let row: any =
    (await tryByCol("state_code")) ??
    (await tryByCol("code")) ??
    null;

  // Fallback: first row
  if (!row) {
    const { data, error } = await supabase.from("states").select("*").limit(1);
    if (error) throw error;
    row = (data || [])[0] ?? null;
  }
  if (!row) return null;

  if (kind === "uuid") {
    for (const k of Object.keys(row)) {
      const val = row[k];
      if (typeof val === "string" && UUID_RE.test(val)) return val;
    }
    return null;
  }

  if (kind === "int") {
    for (const k of Object.keys(row)) {
      const val = row[k];
      if (typeof val === "number" && Number.isFinite(val)) return val;
      if (typeof val === "string" && /^[0-9]+$/.test(val.trim())) return parseInt(val.trim(), 10);
    }
    if (/^[0-9]+$/.test(RAW_STATE)) return parseInt(RAW_STATE, 10);
    return null;
  }

  // unknown: try env numeric first, then uuid
  if (/^[0-9]+$/.test(RAW_STATE)) return parseInt(RAW_STATE, 10);
  if (UUID_RE.test(RAW_STATE)) return RAW_STATE;
  return null;
}


const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let _cachedStateUuid: string | null = null;

async function resolveStateUuid(): Promise<string> {
  if (_cachedStateUuid) return _cachedStateUuid;

  // 1) If env already is a UUID, use it directly
  if (UUID_RE.test(RAW_STATE)) {
    _cachedStateUuid = RAW_STATE;
    return _cachedStateUuid;
  }

  // 2) Best guess: states.code = 'S789'
  {
    const { data, error } = await supabase
      .from("states")
      .select("id,code")
      .eq("code", STATE_CODE)
      .maybeSingle();

    if (!error && (data as any)?.id) {
      _cachedStateUuid = (data as any).id;
      return _cachedStateUuid;
    }
  }

  // 3) Fallback: first row from states (works if you only have one state configured)
  {
    const { data, error } = await supabase.from("states").select("*").limit(1);
    if (error) throw error;

    const row: any = (data || [])[0];
    const id = row?.id ?? row?.state_id ?? row?.uuid;
    if (!id || !UUID_RE.test(String(id))) {
      throw new Error(
        "Could not resolve state UUID from states table. Ensure states has a UUID column (usually id) and at least one row."
      );
    }

    _cachedStateUuid = String(id);
    return _cachedStateUuid;
  }
}

export default function OwnerAlliancesPage() {
  const [rows, setRows] = useState<AllianceRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newEnabled, setNewEnabled] = useState(true);

  const refetch = async () => {
    setLoading(true);

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
  }, []);

  const createAlliance = async () => {
    const code = normCode(newCode);
    const name = newName.trim() || code;

    if (!code) return alert("Alliance code required (example: SDS)");
    if (!/^[A-Z0-9]{2,12}$/.test(code))
      return alert("Code must be 2–12 chars (A–Z, 0–9).");

    let state_id: string;
    try {
      state_id = await resolveStateUuid();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Could not resolve state id. Check states table.");
      return;
    }

    const base = { code, name, state_id };

    // try with enabled; fallback without enabled if column doesn't exist
    const resA = await supabase
      .from("alliances")
      .insert({ ...base, enabled: newEnabled });

    if (resA.error) {
      const msg = (resA.error.message || "").toLowerCase();
      if (msg.includes("enabled")) {
        const resB = await supabase.from("alliances").insert(base);
        if (resB.error) {
          console.error(resB.error);
          alert(resB.error.message);
          return;
        }
      } else {
        console.error(resA.error);
        alert(resA.error.message);
        return;
      }
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
              autoCapitalize="characters"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="OZR"
              style={{ textTransform: "uppercase" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Name</span>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Seven Deadly Sins" />
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
            <input type="checkbox" checked={newEnabled} onChange={(e) => setNewEnabled(e.target.checked)} />
            Enabled
          </label>

          <button onClick={createAlliance}>➕ Create</button>
          <button onClick={refetch}>↻ Refresh</button>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
          New alliances immediately work at: <code>/dashboard/&lt;CODE&gt;/calendar</code> and{" "}
          <code>/dashboard/&lt;CODE&gt;/hq-map</code>
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
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 900 }}>{r.code}</div>
                      <div style={{ opacity: 0.85 }}>{r.name || r.code}</div>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      {"enabled" in r ? (
                        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input type="checkbox" checked={enabled} onChange={(e) => toggleEnabled(r.code, e.target.checked)} />
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

