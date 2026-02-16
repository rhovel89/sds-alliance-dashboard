import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type AllianceRow = {
  code: string;
  name: string | null;
  enabled?: boolean | null;
};

function normCode(v: string) {
  return (v || "").trim().toUpperCase();
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
    const name = (newName || "").trim() || code;

    if (!code) return alert("Alliance code required (example: OZR)");
    // Code must be URL-safe: letters+numbers only
    if (!/^[A-Z0-9]{2,12}$/.test(code)) {
      return alert("Code must be 2–12 chars (A–Z, 0–9). Example: OZR");
    }

    // IMPORTANT:
    // Do NOT send state_id here. Your DB already allows NULL (you have rows with NULL),
    // and state_id type differs across environments causing 400s.
    const payloadWithEnabled: any = { code, name, enabled: newEnabled };

    const resA = await supabase.from("alliances").insert(payloadWithEnabled);
    if (resA.error) {
      const msg = (resA.error.message || "").toLowerCase();
      if (msg.includes("enabled")) {
        const resB = await supabase.from("alliances").insert({ code, name });
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
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="OZR"
            />
            <span style={{ fontSize: 12, opacity: 0.7 }}>
              Code is used in URLs, so it must be letters/numbers only.
            </span>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Name</span>
            <input
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
