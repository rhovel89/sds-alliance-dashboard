import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

type Row = { alliance_code: string; role: string | null };

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

export default function OwnerPlayerAssignmentsPage() {
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [authUserId, setAuthUserId] = useState("");
  const [allianceCode, setAllianceCode] = useState("");
  const [role, setRole] = useState("Member");

  const [rows, setRows] = useState<Row[]>([]);

  const canRun = useMemo(() => authUserId.trim().length > 10 && allianceCode.trim().length > 0, [authUserId, allianceCode]);

  const load = async () => {
    setErr(null);
    setHint(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc("owner_list_player_alliances", {
        p_auth_user_id: authUserId.trim(),
      } as any);

      if (error) throw error;

      const next = (data ?? []).map((r: any) => ({
        alliance_code: upper(r.alliance_code),
        role: r.role ?? null,
      })) as Row[];

      setRows(next);
      setHint("Loaded ✅");
      setTimeout(() => setHint(null), 1200);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const assign = async () => {
    setErr(null);
    setHint(null);
    setLoading(true);

    try {
      const { error } = await supabase.rpc("owner_assign_player_to_alliance", {
        p_auth_user_id: authUserId.trim(),
        p_alliance_code: upper(allianceCode),
        p_role: role,
      } as any);

      if (error) throw error;

      setHint("Assigned ✅");
      setTimeout(() => setHint(null), 1200);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const remove = async (code: string) => {
    if (!window.confirm(`Remove player from ${code}?`)) return;
    setErr(null);
    setHint(null);
    setLoading(true);

    try {
      const { error } = await supabase.rpc("owner_remove_player_from_alliance", {
        p_auth_user_id: authUserId.trim(),
        p_alliance_code: upper(code),
      } as any);

      if (error) throw error;

      setHint("Removed ✅");
      setTimeout(() => setHint(null), 1200);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // no-op
  }, []);

  return (
    <div style={{ padding: 16, maxWidth: 1050, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>👥 Owner: Assign Players to Alliances</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/owner" style={{ opacity: 0.85 }}>Owner Home</Link>
          <Link to="/me" style={{ opacity: 0.85 }}>/me</Link>
        </div>
      </div>

      {err ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 10 }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      <div style={{ marginTop: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
        <div style={{ opacity: 0.8, fontSize: 13 }}>
          Paste the player's <b>Auth User ID</b> (UUID from Supabase Auth / users). Then assign them to alliance codes.
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ opacity: 0.8, fontSize: 12 }}>Player Auth User ID (UUID)</span>
            <input
              value={authUserId}
              onChange={(e) => setAuthUserId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              style={{ padding: 10, borderRadius: 10 }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ opacity: 0.8, fontSize: 12 }}>Alliance Code</span>
            <input
              value={allianceCode}
              onChange={(e) => setAllianceCode(e.target.value)}
              placeholder="WOC / OZR / SDS ..."
              style={{ padding: 10, borderRadius: 10 }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ opacity: 0.8, fontSize: 12 }}>Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>
              <option value="Member">Member</option>
              <option value="R4">R4</option>
              <option value="R5">R5</option>
              <option value="Owner">Owner</option>
            </select>
          </label>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={load} disabled={loading || authUserId.trim().length < 10} style={{ padding: "8px 12px", borderRadius: 10 }}>
            {loading ? "Loading…" : "Load memberships"}
          </button>

          <button onClick={assign} disabled={loading || !canRun} style={{ padding: "8px 12px", borderRadius: 10, fontWeight: 900 }}>
            Assign / Update Role
          </button>

          {hint ? <span style={{ opacity: 0.85 }}>{hint}</span> : null}
        </div>
      </div>

      <div style={{ marginTop: 14, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 900 }}>Current memberships</div>

        {rows.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>No memberships loaded.</div>
        ) : (
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {rows.map((r) => (
              <div key={r.alliance_code} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontWeight: 900 }}>
                    {r.alliance_code} {r.role ? `(${String(r.role)})` : ""}
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Link to={`/me?alliance=${encodeURIComponent(r.alliance_code)}`} style={{ fontWeight: 900 }}>
                      Open in /me
                    </Link>
                    <button onClick={() => remove(r.alliance_code)} style={{ padding: "6px 10px", borderRadius: 10 }}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
        Notes: This uses RPC functions so it works even if RLS blocks direct table writes.
      </div>
    </div>
  );
}
