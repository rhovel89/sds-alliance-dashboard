import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import UserIdDisplay from "../../components/common/UserIdDisplay";

type MembershipRow = {
  id: string;
  alliance_id: string;
  user_id: string;
  role: "owner" | "r5" | "r4" | "member" | "viewer";
  created_at: string;
};

const ROLES: MembershipRow["role"][] = ["member", "viewer", "r5", "r4", "owner"];

function normalizeAllianceId(v: string) {
  return v.trim().toUpperCase();
}

export default function OwnerMembershipsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<MembershipRow[]>([]);

  // filters
  const [filterAlliance, setFilterAlliance] = useState("");
  const [filterUserId, setFilterUserId] = useState("");

  // add/upsert form
  const [formUserId, setFormUserId] = useState("");
  const [formAllianceId, setFormAllianceId] = useState("");
  const [formRole, setFormRole] = useState<MembershipRow["role"]>("member");

  const title = useMemo(() => "🧟 Owner — Membership Manager", []);

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

  useEffect(() => {
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchRows() {
    setError(null);

    let q = supabase
      .from("alliance_memberships")
      .select("id, alliance_id, user_id, role, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    const aid = normalizeAllianceId(filterAlliance);
    const uid = filterUserId.trim();

    if (aid) q = q.ilike("alliance_id", `%${aid}%`);
    if (uid) q = q.eq("user_id", uid);

    const res = await q;
    if (res.error) {
      setError(res.error.message);
      setRows([]);
      return;
    }

    setRows((res.data ?? []) as any);
  }

  async function upsertMembership() {
    setError(null);

    const uid = formUserId.trim();
    const aid = normalizeAllianceId(formAllianceId);

    if (!uid) return alert("User UUID is required.");
    if (!aid) return alert("Alliance ID is required (ex: WOC).");

    const payload = {
      user_id: uid,
      alliance_id: aid,
      role: formRole,
    };

    const res = await supabase
      .from("alliance_memberships")
      .upsert(payload, { onConflict: "alliance_id,user_id" });

    if (res.error) {
      setError(res.error.message);
      return;
    }

    setFormUserId("");
    setFormAllianceId("");
    setFormRole("member");

    await fetchRows();
  }

  async function changeRole(row: MembershipRow, role: MembershipRow["role"]) {
    setError(null);

    const res = await supabase
      .from("alliance_memberships")
      .update({ role })
      .eq("id", row.id);

    if (res.error) {
      setError(res.error.message);
      return;
    }

    await fetchRows();
  }

  async function remove(row: MembershipRow) {
    const ok = confirm(`Remove $<UserIdDisplay userId={row.user_id} /> from ${row.alliance_id}?`);
    if (!ok) return;

    setError(null);
    const res = await supabase
      .from("alliance_memberships")
      .delete()
      .eq("id", row.id);

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
        <a href="/owner/discord">Discord Settings</a>
      </div>

      {error ? (
        <div style={{ border: "1px solid #733", borderRadius: 8, padding: 10, marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12, marginBottom: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Add / Update Membership</div>

        <div style={{ display: "grid", gap: 8, maxWidth: 820 }}>
          <input
            placeholder="User UUID (Supabase auth.users.id)"
            value={formUserId}
            onChange={(e) => setFormUserId(e.target.value)}
          />
          <input
            placeholder="Alliance ID (ex: WOC)"
            value={formAllianceId}
            onChange={(e) => setFormAllianceId(e.target.value)}
          />
          <select value={formRole} onChange={(e) => setFormRole(e.target.value as any)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <button onClick={upsertMembership}>Save Membership</button>

          <div style={{ opacity: 0.75, fontSize: 12 }}>
            Tip: This uses upsert on (alliance_id, user_id). If the row exists, it updates role.
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12, marginBottom: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Search / Filter</div>

        <div style={{ display: "grid", gap: 8, maxWidth: 820 }}>
          <input
            placeholder="Filter by Alliance ID (partial ok, ex: WO)"
            value={filterAlliance}
            onChange={(e) => setFilterAlliance(e.target.value)}
          />
          <input
            placeholder="Filter by User UUID (exact)"
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={fetchRows}>Refresh</button>
            <button
              onClick={async () => {
                setFilterAlliance("");
                setFilterUserId("");
                await fetchRows();
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>
          Memberships (latest 200)
        </div>

        {rows.length === 0 ? (
          <div style={{ opacity: 0.8 }}>No memberships found.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {rows.map((r) => (
              <div key={r.id} style={{ border: "1px solid #222", borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 900 }}>{r.alliance_id.toUpperCase()}</div>
                  <div style={{ opacity: 0.8, fontSize: 12 }}>
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>

                <div style={{ marginTop: 6, opacity: 0.9, fontSize: 12 }}>
                  User: <code>{r.user_id}</code>
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ opacity: 0.85 }}>Role:</span>
                  <select value={r.role} onChange={(e) => changeRole(r, e.target.value as any)}>
                    {ROLES.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>

                  <button onClick={() => remove(r)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

