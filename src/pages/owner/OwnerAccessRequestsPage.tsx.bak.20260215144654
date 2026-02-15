import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Req = {
  id: string;
  user_id: string;
  game_name: string;
  requested_alliances: string[];
  status: "pending" | "approved" | "denied";
  created_at: string;
};

const ROLES = ["member", "viewer", "r4", "r5", "owner"] as const;
type Role = typeof ROLES[number];

export default function OwnerAccessRequestsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [rows, setRows] = useState<Req[]>([]);
  const [error, setError] = useState<string | null>(null);

  // per-request chosen role
  const [roleById, setRoleById] = useState<Record<string, Role>>({});

  const title = useMemo(() => "🧟 Owner — Access Requests", []);

  async function boot() {
    setError(null);

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
      .from("access_requests")
      .select("id, user_id, game_name, requested_alliances, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (res.error) {
      setError(res.error.message);
      setRows([]);
      return;
    }

    const data = (res.data ?? []) as any as Req[];
    setRows(data);

    // default roles
    const next = { ...roleById };
    data.forEach((r) => {
      if (!next[r.id]) next[r.id] = "member";
    });
    setRoleById(next);
  }

  useEffect(() => {
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function approve(id: string) {
    setError(null);

    const role = roleById[id] ?? "member";

    const res = await supabase.rpc("approve_access_request", {
      p_request_id: id,
      p_role: role,
    });

    if (res.error) {
      setError(res.error.message);
      return;
    }

    await fetchRows();
  }

  async function deny(id: string) {
    const reason = prompt("Reason for denial? (optional)") ?? null;

    setError(null);
    const res = await supabase.rpc("deny_access_request", {
      p_request_id: id,
      p_reason: reason,
    });

    if (res.error) {
      setError(res.error.message);
      return;
    }

    await fetchRows();
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

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <a href="/owner">← Back to Owner</a>
        <a href="/owner/players">Players</a>
        <a href="/owner/alliances">Alliances</a>
      </div>

      {error ? (
        <div style={{ border: "1px solid #733", borderRadius: 8, padding: 10, marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      <div style={{ marginBottom: 12 }}>
        <button onClick={fetchRows}>Refresh</button>
      </div>

      {rows.length === 0 ? (
        <div style={{ opacity: 0.8 }}>No pending requests.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {rows.map((r) => (
            <div key={r.id} style={{ border: "1px solid #222", borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900 }}>
                  {r.game_name} — {Array.isArray(r.requested_alliances) ? r.requested_alliances.join(", ") : ""}
                </div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </div>

              <div style={{ marginTop: 6, opacity: 0.85, fontSize: 12 }}>
                User UUID: <code>{r.user_id}</code>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ opacity: 0.85 }}>Approve as:</span>
                <select
                  value={roleById[r.id] ?? "member"}
                  onChange={(e) => setRoleById({ ...roleById, [r.id]: e.target.value as Role })}
                >
                  {ROLES.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>

                <button onClick={() => approve(r.id)}>Approve</button>
                <button onClick={() => deny(r.id)}>Deny</button>
              </div>

              <div style={{ opacity: 0.75, fontSize: 12, marginTop: 10 }}>
                Approve creates roster + links auth user, then DB triggers sync dashboard access (RLS).
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
