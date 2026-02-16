import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useIsAppAdmin } from "../../hooks/useIsAppAdmin";

export default function OwnerStateManagerPage() {
  const { isAdmin, loading } = useIsAppAdmin();
  const [userId, setUserId] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState("state_leader");

  const refetch = async () => {
    const { data } = await supabase
      .from("state_memberships")
      .select("id,user_id,role_key,created_at")
      .order("created_at", { ascending: false });
    setMemberships(data || []);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id ?? null);
      await refetch();
    })();
  }, []);

  const addMembership = async () => {
    if (!isAdmin) return alert("Not authorized.");
    const uid = newUserId.trim();
    if (!uid) return;
    const { error } = await supabase
      .from("state_memberships")
      .insert({ user_id: uid, role_key: newRole });
    if (error) return alert(error.message);
    setNewUserId("");
    await refetch();
  };

  const removeMembership = async (id: string) => {
    if (!isAdmin) return alert("Not authorized.");
    if (!confirm("Remove this state membership?")) return;
    const { error } = await supabase.from("state_memberships").delete().eq("id", id);
    if (error) return alert(error.message);
    await refetch();
  };

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  if (!isAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Owner: State Manager</h2>
        <div style={{ opacity: 0.8 }}>You are not an app admin.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>🛠️ Owner: State Manager</h2>
      <div style={{ opacity: 0.85 }}>Signed in: {userId}</div>

      <div style={{ marginTop: 16, border: "1px solid #333", borderRadius: 10, padding: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Add State Role</div>
        <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
          <input
            placeholder="User UUID"
            value={newUserId}
            onChange={(e) => setNewUserId(e.target.value)}
          />
          <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
            <option value="state_leader">State Leader</option>
            <option value="viewer">Viewer</option>
            <option value="owner">Owner</option>
          </select>
          <button onClick={addMembership}>Add</button>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Current State Memberships</div>
        <div style={{ display: "grid", gap: 8 }}>
          {memberships.map((m) => (
            <div key={m.id} style={{ border: "1px solid #222", borderRadius: 10, padding: 12 }}>
              <div><strong>{m.role_key}</strong></div>
              <div style={{ opacity: 0.85, fontSize: 12 }}>{m.user_id}</div>
              <div style={{ marginTop: 8 }}>
                <button onClick={() => navigator.clipboard.writeText(m.user_id)}>Copy User UUID</button>{" "}
                <button onClick={() => removeMembership(m.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
