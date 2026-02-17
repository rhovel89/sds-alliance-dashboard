import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const STATE_NUM = Number(import.meta.env.VITE_STATE_ID ?? 789);
const DEFAULT_STATE_CODE = `S${STATE_NUM}`;

type AllianceRow = {
  code: string;
  name: string | null;
  enabled?: boolean | null;
};

function normCode(v: string) {
  return v.trim().toUpperCase();
}

function isMissingColumn(msg: string, col: string) {
  const m = (msg || "").toLowerCase();
  const c = col.toLowerCase();
  return m.includes(`could not find the '${c}' column`) || (m.includes("could not find") && m.includes(c));
}

export default function OwnerAlliancesPage() {
  const [rows, setRows] = useState<AllianceRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newEnabled, setNewEnabled] = useState(true);

  // cache the state's UUID (alliances.state_id is uuid in your DB)
  const [stateUuid, setStateUuid] = useState<string | null>(null);

  const loadStateUuid = async () => {
    // Try by state_id (int) first, then by state_code, then fallback to first row
    let res = await supabase.from("states").select("id,state_id,state_code").eq("state_id", STATE_NUM).maybeSingle();
    if (res.error && isMissingColumn(res.error.message, "state_id")) {
      res = await supabase.from("states").select("id,state_code").eq("state_code", DEFAULT_STATE_CODE).maybeSingle();
    }
    if (res.error && isMissingColumn(res.error.message, "state_code")) {
      res = await supabase.from("states").select("id").order("id", { ascending: true }).limit(1).maybeSingle();
    }
    if (res.error) {
      console.error(res.error);
      alert(`Could not load state UUID from states table: ${res.error.message}`);
      return;
    }
    setStateUuid((res.data as any)?.id ?? null);
  };

  const refetch = async () => {
    setLoading(true);

    const trySelect = async (cols: string) =>
      supabase.from("alliances").select(cols).order("code", { ascending: true });

    let res = await trySelect("code,name,enabled");
    if (res.error && isMissingColumn(res.error.message, "enabled")) {
      res = await trySelect("code,name");
    }
    if (res.error) {
      console.error(res.error);
      alert(res.error.message);
      setLoading(false);
      return;
    }

    const data = (res.data ?? []) as any[];
    const normalized = data.map((r) => ({
      code: r.code,
      name: r.name ?? null,
      enabled: "enabled" in r ? r.enabled : true,
    })) as AllianceRow[];

    setRows(normalized);
    setLoading(false);
  };

  useEffect(() => {
    loadStateUuid();
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createAlliance = async () => {
    const code = normCode(newCode);
    const name = newName.trim() || code;

    if (!code) return alert("Alliance code required (example: OZR)");
    if (!/^[A-Z0-9]{2,12}$/.test(code)) return alert("Code must be 2–12 chars (A–Z, 0–9).");

    if (!stateUuid) {
      await loadStateUuid();
      if (!stateUuid) return alert("State UUID not loaded yet. Try again in a moment.");
    }

    // Insert with state_id (uuid) + state_code if column exists + enabled if exists
    let payload: any = { code, name, enabled: newEnabled, state_id: stateUuid, state_code: DEFAULT_STATE_CODE };

    let ins = await supabase.from("alliances").insert(payload);
    if (ins.error && isMissingColumn(ins.error.message, "enabled")) {
      delete payload.enabled;
      ins = await supabase.from("alliances").insert(payload);
    }
    if (ins.error && isMissingColumn(ins.error.message, "state_code")) {
      delete payload.state_code;
      ins = await supabase.from("alliances").insert(payload);
    }
    if (ins.error) {
      console.error(ins.error);
      alert(ins.error.message);
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
    if (error) return alert(error.message);
    await refetch();
  };

  const toggleEnabled = async (code: string, enabled: boolean) => {
    const res = await supabase.from("alliances").update({ enabled }).eq("code", code);
    if (res.error) {
      if (isMissingColumn(res.error.message, "enabled")) {
        alert("This database does not have an 'enabled' column on alliances.");
        return;
      }
      alert(res.error.message);
      return;
    }
    await refetch();
  };

  const deleteAlliance = async (code: string) => {
    if (!confirm(`Delete alliance ${code}? This may fail if referenced by members/events.`)) return;
    const { error } = await supabase.from("alliances").delete().eq("code", code);
    if (error) return alert(error.message);
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
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
            />
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
    </div>
  );
}
