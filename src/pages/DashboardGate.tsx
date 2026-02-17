import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}
function isManagerRole(role: any) {
  const r = String(role ?? "").trim().toLowerCase();
  return r === "owner" || r === "r4" || r === "r5";
}

export default function DashboardGate({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const raw =
    (params as any)?.allianceCode ??
    (params as any)?.code ??
    (params as any)?.alliance ??
    (params as any)?.tag ??
    (params as any)?.id ??
    "";
  const allianceCode = useMemo(() => upper(raw), [raw]);

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setAllowed(false);

      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id ?? null;
        if (!uid) { if (!cancelled) { setAllowed(false); setLoading(false); } return; }

        // App admin shortcut (best effort)
        try {
          const { data: isAdmin } = await supabase.rpc("is_app_admin");
          if (isAdmin === true) {
            if (!cancelled) { setAllowed(true); setLoading(false); }
            return;
          }
        } catch {}

        // Find player id
        const { data: p, error: pErr } = await supabase
          .from("players")
          .select("id")
          .eq("auth_user_id", uid)
          .maybeSingle();

        if (pErr) throw pErr;
        const pid = (p as any)?.id ?? null;
        if (!pid) { if (!cancelled) { setAllowed(false); setLoading(false); } return; }

        // Check role for this alliance
        const { data: pa, error: paErr } = await supabase
          .from("player_alliances")
          .select("role,alliance_code")
          .eq("player_id", pid)
          .eq("alliance_code", allianceCode)
          .maybeSingle();

        if (paErr) throw paErr;

        const ok = isManagerRole((pa as any)?.role);
        if (!cancelled) { setAllowed(ok); setLoading(false); }
      } catch {
        if (!cancelled) { setAllowed(false); setLoading(false); }
      }
    })();

    return () => { cancelled = true; };
  }, [allianceCode]);

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;

  if (!allowed) return <Navigate to="/dashboard/ME" replace />;

  return <>{children}</>;
}
