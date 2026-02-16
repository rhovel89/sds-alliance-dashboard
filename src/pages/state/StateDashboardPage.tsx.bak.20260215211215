import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useIsAppAdmin } from "../../hooks/useIsAppAdmin";

export default function StateDashboardPage() {
  const { isAdmin } = useIsAppAdmin();
  const [roleKeys, setRoleKeys] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? null;
      setUserId(uid);

      if (!uid) return;

      const { data: rows } = await supabase
        .from("state_memberships")
        .select("role_key")
        .eq("user_id", uid);

      setRoleKeys((rows || []).map((r: any) => r.role_key));
    })();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>🗺️ State 789 Dashboard</h2>

      <div style={{ opacity: 0.85, marginTop: 8 }}>
        Signed in: {userId ? userId : "No session"}
      </div>

      <div style={{ marginTop: 14 }}>
        <strong>Your state roles:</strong>{" "}
        {roleKeys.length ? roleKeys.join(", ") : "None"}
      </div>

      <div style={{ marginTop: 18, border: "1px solid #333", borderRadius: 10, padding: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Quick Links</div>
        <div style={{ display: "grid", gap: 8 }}>
          <a href="/dashboard">Alliance Dashboards</a>
          {isAdmin ? <a href="/owner/state">Owner: State Manager</a> : null}
        </div>
      </div>
    </div>
  );
}
