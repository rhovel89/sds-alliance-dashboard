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
  return (
    m.includes(\'\'\) ||
    m.includes(\"\"\) ||
    (m.includes("could not find") && m.includes(col.toLowerCase())) ||
    (m.includes("column") && m.includes(col.toLowerCase()) && m.includes("does not exist"))
  );
}

export default function OwnerAlliancesPage() {
  const [rows, setRows] = useState<AllianceRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newEnabled, setNewEnabled] = useState(true);

  // schema flexibility
  const [codeCol, setCodeCol] = useState<"code" | "id">("code");
  const [hasEnabled, setHasEnabled] = useState(true);

  const refetch = async () => {
    setLoading(true);

    // Try: code+enabled
    let res = await supabase.from("alliances").select("code,name,enabled").order("code", { ascending: true });
    if (!res.error) {
      setCodeCol("code");
      setHasEnabled(true);
      setRows((res.data ?? []) as any);
      setLoading(false);
      return;
    }

    // Fallback: code only
    if (looksLikeMissingColumn(res.error.message || "", "enabled")) {
      const res2 = await supabase.from("alliances").select("code,name").order("code", { ascending: true });
      if (!res2.error) {
        setCodeCol("code");
        setHasEnabled(false);
        setRows(((res2.data ?? []) as any[]).map((r) => ({ ...r, enabled: true })));
        setLoading(false);
        return;
      }
      res = res2 as any;
    }

    // If "code" column doesn't exist, try "id"
    if (looksLikeMissingColumn(res.error?.message || "", "code")) {
      let res3 = await supabase.from("alliances").select("id,name,enabled").order("id", { ascending: true });
      if (!res3.error) {
        setCodeCol("id");
        setHasEnabled(true);
        setRows(((res3.data ?? []) as any[]).map((r) => ({ code: r.id, name: r.name, enabled: r.enabled })));
        setLoading(false);
        return;
      }

      if (looksLikeMissingColumn(res3.error.message || "", "enabled")) {
        const res4 = await supabase.from("alliances").select("id,name").order("id", { ascending: true });
        if (!res4.error) {
          setCodeCol("id");
          setHasEnabled(false);
          setRows(((res4.data ?? []) as any[]).map((r) => ({ code: r.id, name: r.name, enabled: true })));
          setLoading(false);
          return;
        }
        res3 = res4 as any;
      }

      console.error(res3.error);
      alert(res3.error?.message || "Failed to load alliances");
      setLoading(false);
      return;
    }

    console.error(res.error);
    alert(res.error?.message || "Failed to load alliances");
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
    const payloads: any[] = [];
    if (hasEnabled) payloads.push({ ...base, enabled: newEnabled });
    payloads.push({ ...base });

    let lastErr: any = null;

    for (const payload of payloads) {
      const r = await supabase.from("alliances").insert(payload);
      if (!r.error) {
        setNewCode("");
        setNewName("");
        setNewEnabled(true);
        await refetch();
        return;
      }
      lastErr = r.error;

      // enabled missing? try next payload without enabled
      if (looksLikeMissingColumn(r.error.message || "", "enabled")) continue;

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
    if (!confirm(\Delete alliance \import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

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
  return (
    m.includes(`'${col.toLowerCase()}'`) ||
    m.includes(`"${col.toLowerCase()}"`) ||
    (m.includes("could not find") && m.includes(col.toLowerCase())) ||
    (m.includes("column") && m.includes(col.toLowerCase()) && m.includes("does not exist"))
  );
}

export default function OwnerAlliancesPage() {
  const [rows, setRows] = useState<AllianceRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newEnabled, setNewEnabled] = useState(true);

  // Detect schema differences
  const [codeCol, setCodeCol] = useState<"code" | "id">("code");
  const [hasEnabled, setHasEnabled] = useState(true);

  const refetch = async () => {
    setLoading(true);

    // 1) Try: code + enabled
    let res = await supabase
      .from("alliances")
      .select("code,name,enabled")
      .order("code", { ascending: true });

    if (!res.error) {
      setCodeCol("code");
      setHasEnabled(true);
      setRows((res.data ?? []) as any);
      setLoading(false);
      return;
    }

    // 2) Fallback: code (no enabled)
    if (looksLikeMissingColumn(res.error.message || "", "enabled")) {
      const res2 = await supabase
        .from("alliances")
        .select("code,name")
        .order("code", { ascending: true });

      if (!res2.error) {
        setCodeCol("code");
        setHasEnabled(false);
        setRows(((res2.data ?? []) as any[]).map((r) => ({ ...r, enabled: true })));
        setLoading(false);
        return;
      }

      // If code missing too, fall through
      res = res2 as any;
    }

    // 3) If `code` column doesn't exist, try `id` instead (common when PK is named id)
    if (looksLikeMissingColumn(res.error?.message || "", "code")) {
      // 3a) id + enabled
      let res3 = await supabase
        .from("alliances")
        .select("id,name,enabled")
        .order("id", { ascending: true });

      if (!res3.error) {
        setCodeCol("id");
        setHasEnabled(true);
        setRows(((res3.data ?? []) as any[]).map((r) => ({ code: r.id, name: r.name, enabled: r.enabled })));
        setLoading(false);
        return;
      }

      // 3b) id (no enabled)
      if (looksLikeMissingColumn(res3.error.message || "", "enabled")) {
        const res4 = await supabase
          .from("alliances")
          .select("id,name")
          .order("id", { ascending: true });

        if (!res4.error) {
          setCodeCol("id");
          setHasEnabled(false);
          setRows(((res4.data ?? []) as any[]).map((r) => ({ code: r.id, name: r.name, enabled: true })));
          setLoading(false);
          return;
        }

        res3 = res4 as any;
      }

      console.error(res3.error);
      alert(res3.error?.message || "Failed to load alliances");
      setLoading(false);
      return;
    }

    // 4) Otherwise show error
    console.error(res.error);
    alert(res.error?.message || "Failed to load alliances");
    setLoading(false);
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createAlliance = async () => {
    const code = normCode(newCode);
    const name = newName.trim() || code;

    if (!code) return alert("Alliance code required (example: SDS, OZR)");
    if (!/^[A-Z0-9]{2,12}$/.test(code)) return alert("Code must be 2–12 chars (A–Z, 0–9).");

    // IMPORTANT: Do NOT send state_id from UI (prevents UUID/int mismatches)
    const base: any = { [codeCol]: code, name };
    const attempts: any[] = [];

    if (hasEnabled) attempts.push({ ...base, enabled: newEnabled });
    attempts.push({ ...base }); // fallback without enabled

    let lastErr: any = null;
    for (const payload of attempts) {
      const r = await supabase.from("alliances").insert(payload);
      if (!r.error) {
        setNewCode("");
        setNewName("");
        setNewEnabled(true);
        await refetch();
        return;
      }

      lastErr = r.error;

      // If enabled column missing, continue to next attempt (without enabled)
      if (looksLikeMissingColumn(r.error.message || "", "enabled")) continue;

      // If code/id mismatch, try switching column once
      if (looksLikeMissingColumn(r.error.message || "", "code") && codeCol !== "id") {
        setCodeCol("id");
        const rr = await supabase.from("alliances").insert({ id: code, name, ...(hasEnabled ? { enabled: newEnabled } : {}) });
        if (!rr.error) { await refetch(); return; }
        lastErr = rr.error;
      }
      if (looksLikeMissingColumn(r.error.message || "", "id") && codeCol !== "code") {
        setCodeCol("code");
        const rr = await supabase.from("alliances").insert({ code, name, ...(hasEnabled ? { enabled: newEnabled } : {}) });
        if (!rr.error) { await refetch(); return; }
        lastErr = rr.error;
      }

      // Any other error: stop
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
}? This may fail if referenced by members/events.\)) return;
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
