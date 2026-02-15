import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type MembershipRow = { alliance_id: string; role: string };

export default function RequireAllianceAccess(props: { children: React.ReactNode }) {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = (alliance_id || "").toUpperCase();

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const u = await supabase.auth.getUser();
        const uid = u.data.user?.id ?? null;

        if (!uid) {
          if (!cancelled) {
            setAllowed(false);
            setLoading(false);
          }
          return;
        }

        // Admins always allowed (Owner override)
        const adminRes = await supabase
          .from("app_admins")
          .select("user_id")
          .eq("user_id", uid)
          .maybeSingle();

        if (adminRes.data) {
          if (!cancelled) {
            setAllowed(true);
            setLoading(false);
          }
          return;
        }

        if (!upperAlliance) {
          if (!cancelled) {
            setAllowed(false);
            setLoading(false);
          }
          return;
        }

        // Membership check (UI gate only; RLS still enforces backend)
        const m = await supabase
          .from("alliance_memberships")
          .select("alliance_id, role")
          .eq("user_id", uid)
          .eq("alliance_id", upperAlliance)
          .maybeSingle<MembershipRow>();

        if (m.error) {
          if (!cancelled) {
            setError(m.error.message);
            setAllowed(false);
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setAllowed(!!m.data);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Unknown error");
          setAllowed(false);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [upperAlliance]);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <h2>🧟 Access Check</h2>
        <div>Checking alliance access…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h2>🧟 Access Check</h2>
        <div style={{ border: "1px solid #733", borderRadius: 8, padding: 10 }}>
          {error}
        </div>
        <div style={{ marginTop: 12 }}>
          <a href="/dashboard">Go to My Dashboards</a> • <a href="/onboarding">Request Access</a>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div style={{ padding: 24 }}>
        <h2>🧟 No Access — {upperAlliance}</h2>
        <div style={{ opacity: 0.85, marginTop: 6 }}>
          You don’t have approved access to this alliance dashboard yet.
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
          <a href="/onboarding">Request Access</a>
          <a href="/dashboard">My Dashboards</a>
        </div>

        <div style={{ opacity: 0.75, fontSize: 12, marginTop: 12 }}>
          Note: permissions are enforced by Supabase RLS. This is only a friendly UI gate.
        </div>
      </div>
    );
  }

  return <>{props.children}</>;
}
