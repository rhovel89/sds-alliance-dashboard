import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type Props = { children: ReactNode };

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function pickAllianceFromParams(params: any): string {
  const raw =
    params?.code ??
    params?.allianceCode ??
    params?.alliance_id ??
    params?.allianceId ??
    params?.alliance ??
    "";
  return upper(raw);
}

export default function RequireAllianceAccess({ children }: Props) {
  const params = useParams();
  const loc = useLocation();
  const [sp] = useSearchParams();

  const allianceCode = useMemo(() => pickAllianceFromParams(params), [params]);

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      setLoading(true);
      setErr(null);
      setAllowed(false);

      try {
        const { data } = await supabase.auth.getUser();
        const uid = data?.user?.id ?? null;

        if (!uid) {
          if (!cancelled) {
            setLoading(false);
            setAllowed(false);
          }
          return;
        }

        if (!allianceCode) {
          if (!cancelled) {
            setLoading(false);
            setErr("Missing alliance in URL (expected /dashboard/:CODE/...).");
          }
          return;
        }

        // allow admins
        let isAdmin = false;
        try {
          const a = await supabase.rpc("is_app_admin");
          if (typeof a.data === "boolean") isAdmin = a.data;
        } catch {}

        if (isAdmin) {
          if (!cancelled) {
            setAllowed(true);
            setLoading(false);
          }
          return;
        }

        // find player's id
        const p = await supabase.from("players").select("id").eq("auth_user_id", uid).maybeSingle();
        if (p.error) throw p.error;

        const playerId = p.data?.id ? String(p.data.id) : null;
        if (!playerId) {
          // not created yet -> onboarding
          if (!cancelled) {
            setAllowed(false);
            setLoading(false);
          }
          return;
        }

        // membership check (MEMBERS CAN VIEW)
        const m = await supabase
          .from("player_alliances")
          .select("id,role,alliance_code")
          .eq("player_id", playerId)
          .eq("alliance_code", allianceCode)
          .limit(1);

        if (m.error) throw m.error;

        const ok = (m.data ?? []).length > 0;

        if (!cancelled) {
          setAllowed(ok);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message ?? String(e));
          setAllowed(false);
          setLoading(false);
        }
      }
    }

    check();
    return () => { cancelled = true; };
  }, [allianceCode, loc.pathname]);

  if (loading) {
    return <div style={{ padding: 16 }}>Checking access…</div>;
  }

  // not signed in
  // (do NOT send to /me; that creates loops)
  // send to landing
  // NOTE: we keep it simple
  const signedInCheck = async () => (await supabase.auth.getUser()).data?.user?.id;
  // can't await here; so just use allowed state above
  // If you’re not allowed AND there’s no err, go onboarding
  if (!allowed && !err) {
    return <Navigate to="/onboarding" replace />;
  }

  if (err) {
    return (
      <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
        <div style={{ padding: 12, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 12 }}>
          <b>Access issue:</b> {err}
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/dashboard">Go to My Dashboards</Link>
          <Link to="/me">Go to ME</Link>
          <Link to="/onboarding">Request Access</Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
