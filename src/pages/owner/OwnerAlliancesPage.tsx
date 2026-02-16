import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type AllianceRow = {
  code: string;
  name: string | null;
  enabled?: boolean | null;
};

function normCode(v: string) {
  return v.trim().toUpperCase();
}

function looksLikeMissingColumn(msg: string, col: string) {
  const m = (msg || "").toLowerCase();
  const c = (col || "").toLowerCase();
  return (
    m.includes("'" + c + "'") ||
    m.includes('"' + c + '"') ||
    (m.includes("could not find") && m.includes(c)) ||
    (m.includes("column") && m.includes(c) && m.includes("does not exist"))
  );
}

export default function OwnerAlliancesPage() {
  const [rows, setRows] = useState<AllianceRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newEnabled, setNewEnabled] = useState(true);

  const [codeCol, setCodeCol] = useState<"code" | "id">("code");
  const [hasEnabled, setHasEnabled] = useState(true);

  const refetch = async () => {
    setLoading(true);

    // 1) try: code + enabled
    let r1 = await supabase.from("alliances").select("code,name,enabled").order("code", { ascending: true });
    if (!r1.error) {
      setCodeCol("code");
      setHasEnabled(true);
      setRows((r1.data ?? []) as any);
      setLoading(false);
      return;
    }

    // 2) fallback: code only (no enabled column)
    if (looksLikeMissingColumn(r1.error.message || "", "enabled")) {
      const r2 = await supabase.from("alliances").select("code,name").order("code", { ascending: true });
      if (!r2.error) {
        setCodeCol("code");
        setHasEnabled(false);
        setRows(((r2.data ?? []) as any[]).map((x) => ({ ...x, enabled: true })));
        setLoading(false);
        return;
      }
      r1 = r2 as any;
    }

    // 3) if no "code" column, try "id"
    if (looksLikeMissingColumn(r1.error?.message || "", "code")) {
      let r3 = await supabase.from("alliances").select("id,name,enabled").order("id", { ascending: true });
      if (!r3.error) {
        setCodeCol("id");
        setHasEnabled(true);
        setRows(((r3.data ?? []) as any[]).map((x) => ({ code: x.id, name: x.name, enabled: x.enabled })));
        setLoading(false);
        return;
      }

      if (looksLikeMissingColumn(r3.error.message || "", "enabled")) {
        const r4 = await supabase.from("alliances").select("id,name").order("id", { ascending: true });
        if (!r4.error) {
          setCodeCol("id");
          setHasEnabled(false);
          setRows(((r4.data ?? []) as any[]).map((x) => ({ code: x.id, name: x.name, enabled: true })));
          setLoading(false);
          return;
        }
        r3 = r4 as any;
      }

      console.error(r3.error);
      alert(r3.error?.message || "Failed to load alliances");
      setLoading(false);
      return;
    }

    console.error(r1.error);
    alert(r1.error?.message || "Failed to load alliances");
    setLoading(false);
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createAlliance = async () => {
    const code = normCode(newCode);
    const name = newName.trim() || code;

    if (!code) return alert("Alliance code required (example: OZR, TYZ)");
    if (!/^[A-Z0-9]{2,12}$/.test(code)) return alert("Code must be 2–12 chars (A–Z, 0–9).");

    // IMPORTANT: do NOT send state_id at all
    const base: any = { [codeCol]: code, name };

    // try with enabled if supported, else without
    const attempts: any[] = [];
    if (hasEnabled) attempts.push({ ...base, enabled: newEnabled });
    attempts.push({ ...base });

    let lastErr: any = null;
    for (const payload of attempts) {
      const res = await supabase.from("alliances").insert(payload);
      if (!res.error) {
        setNewCode("");
        setNewName("");
        setNewEnabled(true);
        await refetch();
        return;
      }
      lastErr = res.error;
      if (looksLikeMissingColumn(res.error.message || "", "enabled")) continue;
      break;
    }

    console.error(lastErr);
    alert(lastErr?.message || "Failed to create alliance");
  };

  const renameAlliance = async (code: string) => {
    const current = rows.find((r) => r.code === code);
    const next = prompt("Alliance name:", current?.name || code);
    if (next == null) return;
    const name = next.trim() || code;

    const { error } = await supabase.from("alliances").update({ name }).eq(codeCol, code);
    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }
    await refetch();
  };

  const toggleEnabled = async (code: string, enabled: boolean) => {
    if (!hasEnabled) return alert("Enabled flag is not supported by your alliances table schema.");
    const res = await supabase.from("alliances").update({ enabled }).eq(codeCol, code);
    if (res.error) {
      console.error(res.error);
      alert(res.error.message);
      return;
    }
    await refetch();
  };

  const deleteAlliance = async (code: string) => {
    if (!confirm(`Delete alliance ${code}? This may fail if referenced by members/events.`)) return;
    const { error } = await supabase.from("alliances").delete().eq(codeCol, code);
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
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Name</span>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="OzR MindHunters" />
          </label>

          {hasEnabled ? (
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
              <input type="checkbox" checked={newEnabled} onChange={(e) => setNewEnabled(e.target.checked)} />
              Enabled
            </label>
          ) : null}

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
                      {hasEnabled ? (
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
