import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useIsAppAdmin } from "../../hooks/useIsAppAdmin";

type Row = { user_id: string; created_at: string };

export default function StateLeadersPage() {
  const { isAdmin, loading } = useIsAppAdmin();
  const [rows, setRows] = useState<Row[]>([]);
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await supabase
      .from("state_leaders")
      .select("user_id,created_at")
      .order("created_at", { ascending: false });

    if (res.error) {
      console.error(res.error);
      return;
    }
    setRows((res.data ?? []) as Row[]);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    const v = userId.trim();
    if (!v) return;
    setBusy(true);
    const res = await supabase.from("state_leaders").insert({ user_id: v });
    setBusy(false);

    if (res.error) {
      console.error(res.error);
      alert(res.error.message);
      return;
    }
    setUserId("");
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove State Leader?")) return;
    setBusy(true);
    const res = await supabase.from("state_leaders").delete().eq("user_id", id);
    setBusy(false);

    if (res.error) {
      console.error(res.error);
      alert(res.error.message);
      return;
    }
    await load();
  };

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  if (!isAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <h2>State Leaders</h2>
        <div style={{ opacity: 0.8 }}>Owner/Admin only.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>👑 State Leaders (Owner/Admin)</h2>

      <div style={{ border: "1px solid #333", borderRadius: 10, padding: 14, maxWidth: 700 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Add State Leader by User UUID</div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            placeholder="User UUID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={{ flex: 1 }}
          />
          <button onClick={add} disabled={busy}>Add</button>
          <button onClick={load} disabled={busy}>Refresh</button>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
          {rows.length === 0 ? (
            <div style={{ opacity: 0.75 }}>No state leaders yet.</div>
          ) : (
            rows.map((r) => (
              <div key={r.user_id} style={{ border: "1px solid #222", borderRadius: 10, padding: 10, display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{r.user_id}</div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>{new Date(r.created_at).toLocaleString()}</div>
                </div>
                <button onClick={() => remove(r.user_id)} disabled={busy}>Remove</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
