import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Membership = {
  alliance_id: string;
  role: string;
};

export default function MyDashboardsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<Membership[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const title = useMemo(() => "🧟 My Dashboards", []);

  async function boot() {
    setError(null);

    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id ?? null;
    setUserId(uid);

    if (!uid) return;

    // admin flag
    const adminRes = await supabase
      .from("app_admins")
      .select("user_id")
      .eq("user_id", uid)
      .maybeSingle();

    setIsAdmin(!!adminRes.data);

    // memberships
    const res = await supabase
      .from("alliance_memberships")
      .select("alliance_id, role")
      .eq("user_id", uid)
      .order("alliance_id", { ascending: true });

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

  if (!userId) {
    return (
      <div style={{ padding: 24 }}>
        <h2>{title}</h2>
        <div>You must be logged in.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>{title}</h2>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <a href="/onboarding">Request Access</a>
        <a href="/dashboard">Refresh</a>
        {isAdmin ? <a href="/owner">Owner</a> : null}
      </div>

      {error ? (
        <div style={{ border: "1px solid #733", borderRadius: 8, padding: 10, marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div style={{ opacity: 0.85 }}>
          No alliance access found yet. If you haven’t requested access, go to{" "}
          <a href="/onboarding">Onboarding</a>.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {rows.map((m) => (
            <div key={m.alliance_id} style={{ border: "1px solid #222", borderRadius: 10, padding: 12 }}>
              <div style={{ fontWeight: 900 }}>
                {m.alliance_id} <span style={{ opacity: 0.8, fontWeight: 400 }}>({m.role})</span>
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
                <a href={`/dashboard/${m.alliance_id}/calendar`}>Calendar</a>
                <a href={`/dashboard/${m.alliance_id}/hq-map`}>HQ Map</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
