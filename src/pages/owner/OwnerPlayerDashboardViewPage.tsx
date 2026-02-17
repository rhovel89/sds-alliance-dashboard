import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { PlayerDashboardPanels } from "../../features/playerDashboard/PlayerDashboardPanels";

function lower(v: any) { return String(v ?? "").toLowerCase(); }
function upper(v: any) { return String(v ?? "").trim().toUpperCase(); }

export default function OwnerPlayerDashboardViewPage() {
  const params = useParams();
  const targetPlayerId = String((params as any)?.playerId ?? "").trim();

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);
      setAllowed(false);

      try {
        if (!targetPlayerId) throw new Error("Missing playerId in URL.");

        const { data: uRes, error: uErr } = await supabase.auth.getUser();
        if (uErr) throw uErr;
        const uid = uRes?.user?.id;
        if (!uid) throw new Error("Not signed in.");

        // App admin gets access
        try {
          const { data: isAdmin } = await supabase.rpc("is_app_admin");
          if (isAdmin === true) {
            if (!cancelled) setAllowed(true);
            return;
          }
        } catch {
          // ignore
        }

        // Non-admin: must be an alliance owner AND share an alliance with the target player
        const { data: me, error: meErr } = await supabase
          .from("players")
          .select("id")
          .eq("auth_user_id", uid)
          .maybeSingle();
        if (meErr) throw meErr;
        const myPlayerId = me?.id ? String(me.id) : null;
        if (!myPlayerId) throw new Error("Could not resolve your player record.");

        const { data: myA, error: myAErr } = await supabase
          .from("player_alliances")
          .select("alliance_code,role")
          .eq("player_id", myPlayerId);
        if (myAErr) throw myAErr;

        const ownerCodes = new Set(
          (myA ?? [])
            .filter((r: any) => lower(r?.role) === "owner")
            .map((r: any) => upper(r?.alliance_code))
            .filter(Boolean)
        );

        if (ownerCodes.size === 0) {
          throw new Error("Not authorized (need Owner role).");
        }

        const { data: tA, error: tAErr } = await supabase
          .from("player_alliances")
          .select("alliance_code")
          .eq("player_id", targetPlayerId);
        if (tAErr) throw tAErr;

        const targetCodes = new Set(
          (tA ?? []).map((r: any) => upper(r?.alliance_code)).filter(Boolean)
        );

        let shared = false;
        ownerCodes.forEach((c) => { if (targetCodes.has(c)) shared = true; });

        if (!shared) throw new Error("Not authorized (no shared alliance where you are Owner).");

        if (!cancelled) setAllowed(true);

      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [targetPlayerId]);

  const title = useMemo(() => {
    return targetPlayerId ? `Player Dashboard (Owner View)` : "Player Dashboard";
  }, [targetPlayerId]);

  if (loading) {
    return <div style={{ padding: 16 }}>Loading…</div>;
  }

  if (!allowed) {
    return (
      <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ marginTop: 0 }}>⛔ {title}</h2>
        {err ? (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 12, border: "1px solid rgba(255,0,0,0.35)" }}>
            <b>Error:</b> {err}
          </div>
        ) : (
          <div style={{ marginTop: 10, opacity: 0.8 }}>Not authorized.</div>
        )}
        <div style={{ marginTop: 12 }}>
          <Link to="/owner" style={{ opacity: 0.85 }}>← Back to Owner</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
        <h2 style={{ margin: 0 }}>👁️ {title}</h2>
        <Link to="/owner" style={{ opacity: 0.85 }}>← Back to Owner</Link>
      </div>

      <div style={{ marginTop: 10, opacity: 0.75 }}>
        Viewing playerId: <code>{targetPlayerId}</code>
      </div>

      <PlayerDashboardPanels targetPlayerId={targetPlayerId} />
    </div>
  );
}
