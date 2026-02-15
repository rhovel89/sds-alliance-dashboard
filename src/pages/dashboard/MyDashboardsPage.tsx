import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Membership = {
  alliance_id: string;
  role: string;
};

export default function MyDashboardsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<Membership[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function boot() {
    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id ?? null;
    setUserId(uid);

    if (!uid) return;

    const res = await supabase
      .from("alliance_memberships")
      .select("alliance_id, role")
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
  }, []);

  if (!userId) {
    return (
      <div style={{ padding: 24 }}>
        <h2>🧟 My Dashboards</h2>
        <div>You must be logged in.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>🧟 My Dashboards</h2>

      {error ? (
        <div style={{ border: "1px solid #733", borderRadius: 8, padding: 10, marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div style={{ opacity: 0.85 }}>
          You have no approved alliances yet.{" "}
          <a href="/onboarding">Request access</a>.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12, maxWidth: 720 }}>
          {rows.map((m) => {
            const aid = (m.alliance_id ?? "").toUpperCase();
            return (
              <div key={aid} style={{ border: "1px solid #333", borderRadius: 10, padding: 12 }}>
                <div style={{ fontWeight: 900 }}>{aid}</div>
                <div style={{ opacity: 0.8, marginBottom: 8 }}>Role: {m.role}</div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <a href={`/dashboard/${aid}/calendar`}>📅 Calendar</a>
                  <a href={`/dashboard/${aid}/hq-map`}>🗺️ HQ Map</a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
