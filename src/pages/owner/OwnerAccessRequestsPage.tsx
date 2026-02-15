import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type AccessRequest = {
  id: string;
  user_id: string;
  requested_alliances: string[];
  note: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

const ROLES = ["member", "viewer", "r5", "r4", "owner"] as const;

export default function OwnerAccessRequestsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [rows, setRows] = useState<AccessRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [defaultRole, setDefaultRole] = useState<(typeof ROLES)[number]>("member");
  const [decisionNote, setDecisionNote] = useState("");

  const title = useMemo(() => "🧟 Owner — Access Requests", []);

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

    if (ok) await fetchPending();
  }

  async function fetchPending() {
    setError(null);

    const res = await supabase
      .from("access_requests")
      .select("id, user_id, requested_alliances, note, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (res.error) {
      setError(res.error.message);
      setRows([]);
      return;
    }

    setRows((res.data ?? []) as any);
  }

  useEffect(() => {
    boot();
  }, []);

  async function approve(r: AccessRequest) {
    if (!isAdmin || !userId) return;

    const alliances = (r.requested_alliances ?? [])
      .map((a) => a.toString().trim().toUpperCase())
      .filter(Boolean);

    if (alliances.length === 0) return alert("Request has no alliance codes.");

    // Upsert memberships for each alliance
    const membershipRows = alliances.map((aid) => ({
      alliance_id: aid,
      user_id: r.user_id,
      role: defaultRole,
    }));

    const up = await supabase.from("alliance_memberships").upsert(membershipRows, {
      onConflict: "alliance_id,user_id",
    });

    if (up.error) {
      setError(up.error.message);
      return;
    }

    const upd = await supabase
      .from("access_requests")
      .update({
        status: "approved",
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        decision_note: decisionNote.trim() || null,
      })
      .eq("id", r.id);

    if (upd.error) {
      setError(upd.error.message);
      return;
    }

    setDecisionNote("");
    await fetchPending();
  }

  async function reject(r: AccessRequest) {
    if (!isAdmin || !userId) return;

    const upd = await supabase
      .from("access_requests")
      .update({
        status: "rejected",
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        decision_note: decisionNote.trim() || null,
      })
      .eq("id", r.id);

    if (upd.error) {
      setError(upd.error.message);
      return;
    }

    setDecisionNote("");
    await fetchPending();
  }

  if (!userId) {
    return (
      <div style={{ padding: 24 }}>
        <h2>{title}</h2>
        <div>You must be logged in.</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <h2>{title}</h2>
        <div>Access denied (not an admin).</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>{title}</h2>

      {error ? (
        <div style={{ border: "1px solid #733", borderRadius: 8, padding: 10, marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 10, maxWidth: 820, marginBottom: 14 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Default role to grant on approval</span>
          <select value={defaultRole} onChange={(e) => setDefaultRole(e.target.value as any)}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>

        <textarea
          placeholder="Optional decision note (sent back to requester)"
          value={decisionNote}
          onChange={(e) => setDecisionNote(e.target.value)}
          rows={2}
        />

        <button onClick={fetchPending}>Refresh</button>
      </div>

      {rows.length === 0 ? (
        <div style={{ opacity: 0.8 }}>No pending requests.</div>
      ) : (
        <div style={{ display: "grid", gap: 12, maxWidth: 900 }}>
          {rows.map((r) => (
            <div key={r.id} style={{ border: "1px solid #333", borderRadius: 10, padding: 12 }}>
              <div style={{ fontWeight: 900 }}>
                {r.requested_alliances?.map((a) => a.toUpperCase()).join(", ")}
              </div>

              <div style={{ opacity: 0.8, fontSize: 12, marginTop: 6 }}>
                User: {r.user_id}
              </div>

              {r.note ? <div style={{ marginTop: 8, opacity: 0.9 }}>Note: {r.note}</div> : null}

              <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>
                Submitted: {new Date(r.created_at).toLocaleString()}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button onClick={() => approve(r)}>Approve</button>
                <button onClick={() => reject(r)}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
