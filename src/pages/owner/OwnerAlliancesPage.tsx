import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type AllianceRow = {
  code: string;
  name: string | null;
  enabled?: boolean | null;
  // Keep as any because your DB might be uuid OR int OR null
  state_id?: any;
};

function normCode(v: string) {
  return String(v ?? "").trim().toUpperCase();
}

function isMissingColumn(msg: string, col: string) {
  const m = (msg || "").toLowerCase();
  const c = col.toLowerCase();
  return (
    m.includes(`could not find the '${c}' column`) ||
    m.includes(`could not find the "${c}" column`) ||
    m.includes(`column "${c}" does not exist`) ||
    (m.includes("could not find") && m.includes("column") && m.includes(c)) ||
    (m.includes("schema cache") && m.includes(c))
  );
}

export default function OwnerAlliancesPage() {
  const [rows, setRows] = useState<AllianceRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newEnabled, setNewEnabled] = useState(true);

  // Some schemas use alliances.code, others use alliances.id as the text code.
  const [pkCol, setPkCol] = useState<"code" | "id">("code");

  // Some schemas may not have enabled
  const [hasEnabled, setHasEnabled] = useState(true);

  // Reuse an existing state_id value (uuid OR int) to avoid type mismatch,
  // but ONLY if it exists and is non-null in at least one existing row.
  const [defaultStateId, setDefaultStateId] = useState<any>(null);

  const refetch = async () => {
    setLoading(true);

    // Strategy:
    // 1) Try pkCol=code select code,name,enabled,state_id
    // 2) If code missing -> switch to id
    // 3) If enabled missing -> retry without enabled and assume enabled=true in UI
    // 4) If state_id missing -> retry without it (still OK)
    let data: any[] | null = null;
    let localPk: "code" | "id" = pkCol;
    let localHasEnabled = hasEnabled;

    const trySelect = async (col: "code" | "id", includeEnabled: boolean, includeStateId: boolean) => {
      const cols: string[] = [];
      cols.push(col);
      cols.push("name");
      if (includeEnabled) cols.push("enabled");
      if (includeStateId) cols.push("state_id");
      return await supabase
        .from("alliances")
        .select(cols.join(","))
        .order(col, { ascending: true });
    };

    // First attempt
    let res = await trySelect(localPk, localHasEnabled, true);

    // Handle missing pk column (code vs id)
    if (res.error && isMissingColumn(res.error.message, localPk)) {
      localPk = localPk === "code" ? "id" : "code";
      setPkCol(localPk);
      res = await trySelect(localPk, localHasEnabled, true);
    }

    // Handle missing enabled
    if (res.error && localHasEnabled && isMissingColumn(res.error.message, "enabled")) {
      localHasEnabled = false;
      setHasEnabled(false);
      res = await trySelect(localPk, false, true);
    }

    // Handle missing state_id
    if (res.error && isMissingColumn(res.error.message, "state_id")) {
      res = await trySelect(localPk, localHasEnabled, false);
    }

    if (res.error) {
      console.error(res.error);
      alert(res.error.message);
      setLoading(false);
      return;
    }

    data = (res.data as any[]) || [];

    // Normalize to UI shape with "code" always present
    const normalized: AllianceRow[] = data.map((r: any) => ({
      code: String(r?.code ?? r?.id ?? "").toUpperCase(),
      name: r?.name ?? null,
      enabled: typeof r?.enabled === "boolean" ? r.enabled : true,
      state_id: r?.state_id,
    }));

    setRows(normalized);

    // Pick a non-null state_id from existing rows, if any
    const ds = normalized.map((x) => x.state_id).find((v) => v !== null && v !== undefined);
    setDefaultStateId(ds ?? null);

    setLoading(false);
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createAlliance = async () => {
    const code = normCode(newCode);
    const name = (newName.trim() || code).trim();

    if (!code) return alert("Alliance code required (example: OZ, OZR, TYZ)");
    if (!/^[A-Z0-9]{2,12}$/.test(code)) {
      return alert("Code must be 2–12 chars (A–Z, 0–9). Example: OZR");
    }

    // IMPORTANT:
    // - Always insert using the TEXT code field (code OR id depending on schema)
    // - Do NOT send UUIDs from the UI
    // - Avoid state_id mismatches:
    //     * Prefer omitting state_id entirely
    //     * If DB requires it, reuse an existing state_id value (uuid/int) from current rows
    const payload: any = {};
    payload[pkCol] = code;
    payload["name"] = name;
    if (hasEnabled) payload["enabled"] = newEnabled;

    // Try WITHOUT state_id first (most compatible; your SDS row shows state_id can be NULL)
    let resA = await supabase.from("alliances").insert(payload);

    // If insert fails and error mentions state_id constraint/type, try again using defaultStateId
    if (resA.error) {
      const msg = (resA.error.message || "").toLowerCase();

      const looksLikeStateIdProblem =
        msg.includes("state_id") &&
        (msg.includes("type") || msg.includes("uuid") || msg.includes("integer") || msg.includes("null"));

      if (looksLikeStateIdProblem && defaultStateId !== null && defaultStateId !== undefined) {
        const payload2 = { ...payload, state_id: defaultStateId };
        const resB = await supabase.from("alliances").insert(payload2);
        if (resB.error) {
          console.error(resB.error);
          alert(resB.error.message);
          return;
        }
      } else if (hasEnabled && isMissingColumn(msg, "enabled")) {
        // enabled column doesn't exist
        const payloadNoEnabled: any = { ...payload };
        delete payloadNoEnabled.enabled;

        // try without state_id first
        let resC = await supabase.from("alliances").insert(payloadNoEnabled);

        if (resC.error) {
          const msg2 = (resC.error.message || "").toLowerCase();
          const looksLikeStateIdProblem2 =
            msg2.includes("state_id") &&
            (msg2.includes("type") || msg2.includes("uuid") || msg2.includes("integer") || msg2.includes("null"));

          if (looksLikeStateIdProblem2 && defaultStateId !== null && defaultStateId !== undefined) {
            const resD = await supabase.from("alliances").insert({ ...payloadNoEnabled, state_id: defaultStateId });
            if (resD.error) {
              console.error(resD.error);
              alert(resD.error.message);
              return;
            }
          } else {
            console.error(resC.error);
            alert(resC.error.message);
            return;
          }
        }

        setHasEnabled(false);
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

    const patch: any = { name };
    const { error } = await supabase.from("alliances").update(patch).eq(pkCol, code);
    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }
    await refetch();
  };

  const toggleEnabled = async (code: string, enabled: boolean) => {
    if (!hasEnabled) return;
    const res = await supabase.from("alliances").update({ enabled }).eq(pkCol, code);
    if (res.error) {
      console.error(res.error);
      alert(res.error.message);
      return;
    }
    await refetch();
  };

  const deleteAlliance = async (code: string) => {
    if (!confirm(`Delete alliance ${code}? This may fail if referenced by members/events.`)) return;

    const { error } = await supabase.from("alliances").delete().eq(pkCol, code);
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
            <span>Code (text)</span>
            <input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="OZR"
              autoCapitalize="characters"
            />
            <span style={{ fontSize: 12, opacity: 0.75 }}>
              Use 2–12 letters/numbers. Examples: OZ, OZR, TYZ
            </span>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Name</span>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="MindHunters" />
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
                      {hasEnabled ? (
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
