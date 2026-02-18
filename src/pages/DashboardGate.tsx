import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import MyAlliance from "./MyAlliance";

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function isManagerRole(role?: string | null) {
  const r = String(role ?? "").toLowerCase();
  return ["owner", "r4", "r5"].includes(r);
}

/**
 * DashboardGate
 * - Only Owners/R4/R5 (or app admin) can view the alliance dashboard ROOT: /dashboard/:code
 * - Everyone else gets redirected to /me?alliance=CODE
 * - IMPORTANT: this does NOT block /dashboard/:code/hq-map or /calendar or /announcements etc
 */
export default function DashboardGate() {
  const params = useParams();
  const raw =
    (params as any)?.code ??
    (params as any)?.allianceCode ??
    (params as any)?.alliance_id ??
    (params as any)?.id ??
    "";
  const code = useMemo(() => upper(raw), [raw]);

  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [signedIn, setSignedIn] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setCanManage(false);
      setSignedIn(true);

      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id ?? null;
        if (!uid) {
          if (!cancelled) setSignedIn(false);
          return;
        }

        // app admin?
        let isAdmin = false;
        try {
          const a = await supabase.rpc("is_app_admin");
          if (typeof a.data === "boolean") isAdmin = a.data;
        } catch {}

        if (isAdmin) {
          if (!cancelled) setCanManage(true);
          return;
        }

        // player id
        const p = await supabase
          .from("players")
          .select("id")
          .eq("auth_user_id", uid)
          .maybeSingle();

        const pid = p.data?.id ? String(p.data.id) : null;
        if (!pid) {
          if (!cancelled) setCanManage(false);
          return;
        }

        // role in this alliance
        const m = await supabase
          .from("player_alliances")
          .select("role,alliance_code")
          .eq("player_id", pid)
          .eq("alliance_code", code)
          .maybeSingle();

        const role = (m.data?.role ?? null) as any;
        if (!cancelled) setCanManage(isManagerRole(role));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  // Explicit: ME route always goes to /me
  if (code === "ME") return <Navigate to="/me" replace />;

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;

  if (!signedIn) return <Navigate to="/" replace />;

  if (!canManage) {
    return <Navigate to={`/me?alliance=${encodeURIComponent(code)}`} replace />;
  }

  return <MyAlliance />;
}
