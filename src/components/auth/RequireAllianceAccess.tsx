import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function looksLikeUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function isManagerRole(role?: string | null) {
  const r = String(role ?? "").toLowerCase();
  return ["owner", "r4", "r5"].includes(r);
}

export default function RequireAllianceAccess({ children }: { children: ReactNode }) {
  const params = useParams() as any;
  const loc = useLocation();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [allianceCode, setAllianceCode] = useState<string>("");

  const viewOnly = useMemo(() => {
    const sp = new URLSearchParams(loc.search || "");
    return sp.get("view") === "1";
  }, [loc.search]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);
      setRole(null);

      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? null;

      if (!uid) {
        setErr("Please sign in.");
        setLoading(false);
        return;
      }

      // Try to infer code from params
      const raw = String(params.allianceCode ?? params.code ?? params.alliance_id ?? params.allianceId ?? "");
      let code = upper(raw);

      // If the URL param is a UUID, resolve to alliance.code
      if (code && looksLikeUuid(code)) {
        try {
          const a = await supabase.from("alliances").select("code").eq("id", code).maybeSingle();
          if (!a.error && a.data?.code) code = upper(a.data.code);
        } catch {}
      }

      if (!code) {
        setErr("Missing alliance in URL.");
        setLoading(false);
        return;
      }

      setAllianceCode(code);

      // Ensure we have player_id
      let playerId: string | null = null;
      try {
        const p = await supabase.from("players").select("id").eq("auth_user_id", uid).maybeSingle();
        if (!p.error && p.data?.id) playerId = String(p.data.id);
      } catch {}

      // 1) New model membership: player_alliances
      let foundRole: string | null = null;
      if (playerId) {
        try {
          const m = await supabase
            .from("player_alliances")
            .select("role,alliance_code")
            .eq("player_id", playerId)
            .eq("alliance_code", code)
            .maybeSingle();

          if (!m.error && m.data) foundRole = (m.data.role ?? null) as any;
        } catch {}
      }

      // 2) Old model membership: alliance_members join alliances(code)
      if (!foundRole) {
        try {
          const a = await supabase.from("alliances").select("id").eq("code", code).maybeSingle();
          const aid = a?.data?.id ? String(a.data.id) : null;
          if (aid) {
            const am = await supabase
              .from("alliance_members")
              .select("role")
              .eq("user_id", uid)
              .eq("alliance_id", aid)
              .maybeSingle();

            if (!am.error && am.data) foundRole = (am.data.role ?? null) as any;
          }
        } catch {}
      }

      if (!foundRole) {
        setErr(`Missing alliance assignment for ${code}. Ask your Owner/R4/R5 to assign you.`);
        setLoading(false);
        return;
      }

      setRole(foundRole);

      // If not manager, force view mode
      if (!isManagerRole(foundRole) && !viewOnly) {
        const sp = new URLSearchParams(loc.search || "");
        sp.set("view", "1");
        nav(`${loc.pathname}?${sp.toString()}`, { replace: true });
        setLoading(false);
        return;
      }

      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [params, loc.pathname, loc.search, nav, viewOnly]);

  if (loading) return <div style={{ padding: 16 }}>Checking alliance access…</div>;

  if (err) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Access issue</div>
        <div style={{ opacity: 0.85 }}>{err}</div>
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/me">Go to /me</Link>
          <Link to="/dashboard">Go to My Dashboards</Link>
          <Link to="/onboarding">Request Access</Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
