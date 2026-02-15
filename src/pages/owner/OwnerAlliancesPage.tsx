import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type AllianceRow = {
  code: string;
  name: string;
  enabled: boolean;
};

function normCode(v: string) {
  return v.trim().toUpperCase();
}

export default function OwnerAlliancesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [rows, setRows] = useState<AllianceRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<AllianceRow>({
    code: "",
    name: "",
    enabled: true,
  });

  async function boot() {
    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id ?? null;
    setUserId(uid);
    if (!uid) return;

    const adminRes = await supabase
      .from("app_admins")
      .select("user_id")
      .eq("user_id", uid)
      .maybeSingle();

    const ok = !!adminRes.data;
    setIsAdmin(ok);

    if (ok) await fetchRows();
  }

  async function fetchRows() {
    setError(null);

    const res = await supabase
      .from("alliances")
      .select("code, name, enabled")
      .order("code", { ascending: true });

    if (res.error) {
      setError(res.error.message);
      setRows([]);
      return;
    }

    setRows((res.data ?? []) as any);
  }

  useEffect(() => {
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setError(null);

    const code = normCode(form.code);
    const name = form.name.trim();

    if (!code) return alert("Alliance code required (ex: SDS).");
    if (!name) return alert("Alliance name required.");

    const res = await supabase
      .from("alliances")
      .upsert({ code, name, enabled: !!form.enabled }, { onConflict: "code" });

    if (res.error) {
      setError(res.error.message);
      return;
    }

    setForm({ code: "", name: "", enabled: true });
    await fetchRows();
  }

  async function toggleEnabled(a: AllianceRow) {
    setError(null);

    const res = await supabase
      .from("alliances")
      .update({ enabled: !a.enabled })
      .eq("code", a.code);

    if (res.error) {
      setError(res.error.message);
      return;
    }

    await fetchRows();
  }

  async function remove(code: string) {
    const ok = confirm(`DELETE alliance ${code}? (This does not delete old events automatically.)`);
    if (!ok) return;

    setError(null);
    const res = await supabase.from("alliances").delete().eq("code", code);

    if (res.error) {
      setError(res.error.message);
      return;
    }

    await fetchRows();
  }

  if (!userId) {
    return (
      <div style={{ padding: 24 }}>
        <h2>🧟 Owner — Alliances</h2>
        <div>You must be logged in.</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <h2>🧟 Owner — Alliances</h2>
        <div>Access denied (not an admin).</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>🧟 Owner — Alliances</h2>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <a href="/owner">← Back to Owner</a>
        <a href="/owner/discord">Discord Settings</a>
        <a href="/owner/memberships">Memberships</a>
        <a href="/owner/players">Players</a>
      </div>

      {error ? (
        <div style={{ border: "1px solid #733", borderRadius: 8, padding: 10, marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12, marginBottom: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Add / Update Alliance</div>

        <div style={{ display: "grid", gap: 8, maxWidth: 760 }}>
          <input
            placeholder="Code (ex: SDS)"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />

          <input
            placeholder="Name (ex: Seven Deadly Sins)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            <span>Enabled</span>
          </label>

          <button onClick={save}>Save Alliance</button>
        </div>
      </div>

      <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>All Alliances</div>

        {rows.length === 0 ? (
          <div style={{ opacity: 0.8 }}>No alliances yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {rows.map((a) => (
              <div key={a.code} style={{ border: "1px solid #222", borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 900 }}>
                    {a.code} — {a.name} {a.enabled ? "" : "(disabled)"}
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <a href={`/dashboard/${a.code}/calendar`}>Open Calendar</a>
                    <a href={`/dashboard/${a.code}/hq-map`}>Open HQ Map</a>
                    <button onClick={() => toggleEnabled(a)}>{a.enabled ? "Disable" : "Enable"}</button>
                    <button onClick={() => remove(a.code)}>Delete</button>
                  </div>
                </div>

                <div style={{ opacity: 0.75, fontSize: 12, marginTop: 8 }}>
                  Dashboards are automatic for any code: /dashboard/{a.code}/calendar and /dashboard/{a.code}/hq-map
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
