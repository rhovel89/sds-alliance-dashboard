import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type AllianceRow = {
  code: string;
  name: string | null;
  enabled?: boolean | null;
  state_id?: any;
};

function normCode(v: string) {
  return v.trim().toUpperCase();
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Detect whether alliances.state_id is uuid or int by looking at an existing non-null value.
// Then reuse that same state's id for new alliances (this app is single-state).
async function detectAllianceStateIdKind(): Promise<"uuid" | "int" | "unknown"> {
  const { data, error } = await supabase
    .from("alliances")
    .select("state_id")
    .not("state_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (error) return "unknown";
  const v: any = (data as any)?.state_id;
  if (typeof v === "number") return "int";
  if (typeof v === "string" && UUID_RE.test(v)) return "uuid";
  return "unknown";
}

// Returns a state_id value that matches the DB column type (uuid or int), or null if none exists.
async function resolveStateIdForAlliances(kind: "uuid" | "int" | "unknown"): Promise<string | number | null> {
  if (kind === "unknown") return null;

  const { data, error } = await supabase
    .from("alliances")
    .select("state_id")
    .not("state_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (error) return null;
  const v: any = (data as any)?.state_id;

  if (kind === "int") {
    if (typeof v === "number") return v;
    if (typeof v === "string" && /^[0-9]+$/.test(v.trim())) return parseInt(v.trim(), 10);
    return null;
  }

  // uuid
  if (typeof v === "string" && UUID_RE.test(v)) return v;
  return null;
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
      .select("code,name,enabled,state_id")
      .order("code", { ascending: true });

    if (!resA.error) {
      data = resA.data as any[];
    } else {
      const msg = (resA.error.message || "").toLowerCase();
      if (msg.includes("enabled")) {
        const resB = await supabase
          .from("alliances")
          .select("code,name,state_id")
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
    // Let you type OzR; we'll normalize to OZR automatically
    const code = normCode(newCode);
    const name = newName.trim() || code;

    if (!code) return alert("Alliance code required (example: SDS)");
    // Allow letters+numbers only, 2–12 chars
    if (!/^[A-Z0-9]{2,12}$/.test(code)) return alert("Code must be 2–12 chars (A–Z, 0–9).");

    // Determine state_id type and reuse a known-good state_id from an existing alliance
    const kind = await detectAllianceStateIdKind();
    const stateId = await resolveStateIdForAlliances(kind);

    // try with enabled, fallback without enabled
    const payloadA: any = { code, name, enabled: newEnabled };
    if (stateId !== null) payloadA.state_id = stateId;

    const resA = await supabase.from("alliances").insert(payloadA);

    if (resA.error) {
      const msg = (resA.error.message || "").toLowerCase();
      if (msg.includes("enabled")) {
        const payloadB: any = { code, name };
        if (stateId !== null) payloadB.state_id = stateId;

        const resB = await supabase.from("alliances").insert(payloadB);
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
            <input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="OzR" />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Name</span>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="OzR MindHunters" />
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
