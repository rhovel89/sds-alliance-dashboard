import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useIsAppAdmin } from "../../hooks/useIsAppAdmin";

type AllianceRow = { code?: string; alliance_id?: string; tag?: string; name?: string };
type PlayerRow = { id: string; game_name?: string | null; name?: string | null };
type PlayerAllianceRow = { alliance_code?: string; alliance_id?: string; role?: string | null };

function pickAllianceCode(a: AllianceRow): string {
  return String(a.code ?? a.alliance_id ?? a.tag ?? "").toUpperCase().trim();
}

export default function StateDashboardPage() {
  const nav = useNavigate();
  const { isAdmin } = useIsAppAdmin();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [player, setPlayer] = useState<PlayerRow | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [alliances, setAlliances] = useState<AllianceRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const canViewState = useMemo(() => {
    if (isAdmin) return true;
    const r = roles.map((x) => (x || "").toLowerCase());
    return r.includes("state_leader") || r.includes("owner");
  }, [isAdmin, roles]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id ?? null;
      setUserId(uid);

      if (!uid) {
        setLoading(false);
        return;
      }

      // Find player row for this auth user
      const pRes = await supabase
        .from("players")
        .select("id,game_name,name")
        .eq("auth_user_id", uid)
        .maybeSingle();

      if (pRes.error) {
        setErr(pRes.error.message);
        setLoading(false);
        return;
      }

      setPlayer((pRes.data as any) ?? null);

      // Fetch roles across alliances (best-effort)
      if (pRes.data?.id) {
        const rRes = await supabase
          .from("player_alliances")
          .select("role,alliance_code,alliance_id")
          .eq("player_id", pRes.data.id);

        if (!rRes.error) {
          const rs = (rRes.data ?? []).map((x: PlayerAllianceRow) => String(x.role ?? ""));
          setRoles(rs.filter(Boolean));
        }
      }

      // Fetch alliances for cards
      const aRes = await supabase
        .from("alliances")
        .select("code,alliance_id,tag,name")
        .order("name", { ascending: true });

      if (aRes.error) {
        setErr(aRes.error.message);
        setLoading(false);
        return;
      }

      setAlliances((aRes.data as any) ?? []);
      setLoading(false);
    })();
  }, [isAdmin]);

  const displayName = player?.game_name || player?.name || (userId ? `User ${userId.slice(0, 8)}…` : "Guest");

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>🧟 State 789 — Command Center</h2>
        <div style={{ opacity: 0.85 }}>
          Logged in as <span style={{ fontWeight: 800 }}>{displayName}</span>
          {isAdmin ? <span style={{ marginLeft: 10, opacity: 0.9 }}>🩸 Owner/Admin</span> : null}
        </div>
      </div>

      <div style={{ marginTop: 16, border: "1px solid #2a2a2a", borderRadius: 12, padding: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>State Access</div>
        {loading ? (
          <div style={{ opacity: 0.8 }}>Loading…</div>
        ) : !userId ? (
          <div style={{ opacity: 0.85 }}>
            You must sign in to view the State Dashboard.{" "}
            <button onClick={() => nav("/")} style={{ marginLeft: 10 }}>
              Go Home
            </button>
          </div>
        ) : err ? (
          <div style={{ color: "#ff8080" }}>{err}</div>
        ) : canViewState ? (
          <div style={{ opacity: 0.9 }}>
            ✅ Access granted (Admin / Owner / State Leader).
          </div>
        ) : (
          <div style={{ opacity: 0.9 }}>
            ⛔ You’re logged in, but you don’t have State access yet.
            <div style={{ marginTop: 8, opacity: 0.8 }}>
              Ask an Owner to assign you the <b>state_leader</b> (or owner) role.
            </div>
          </div>
        )}
      </div>

      {canViewState ? (
        <>
          <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {isAdmin ? (
              <button onClick={() => nav("/owner")} title="Owner dashboard">
                🩸 Owner Dashboard
              </button>
            ) : null}
            <button onClick={() => nav("/dashboard")} title="My dashboards">
              🧭 My Dashboards
            </button>
          </div>

          <div style={{ marginTop: 22 }}>
            <h3 style={{ marginBottom: 10 }}>Alliances in State 789</h3>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
              {alliances.map((a) => {
                const code = pickAllianceCode(a);
                if (!code) return null;

                return (
                  <div
                    key={code}
                    style={{
                      border: "1px solid #333",
                      borderRadius: 14,
                      padding: 14,
                      background: "rgba(0,0,0,0.25)"
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: 16 }}>
                      [{code}] {a.name || "Alliance"}
                    </div>

                    <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button onClick={() => nav(`/dashboard/${code}`)}>Open Dashboard</button>
                    </div>

                    <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>
                      (More state tools will be added here: state announcements, cross-alliance ops, permissions.)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
