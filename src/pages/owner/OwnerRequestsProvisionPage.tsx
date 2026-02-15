import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type AccessRequestRow = {
  id: string;
  created_at?: string | null;
  status?: string | null;
  game_name?: string | null;
  requested_alliance_codes?: string[] | null;
  user_id?: string | null;
  auth_user_id?: string | null;
  processed_at?: string | null;
};

function fmtCodes(codes: string[] | null | undefined) {
  if (!codes || codes.length === 0) return "—";
  return codes.map((c) => (c || "").toUpperCase()).join(", ");
}

export default function OwnerRequestsProvisionPage() {
  const [rows, setRows] = useState<AccessRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("pending");

  const refetch = async () => {
    setLoading(true);
    const res = await supabase
      .from("access_requests")
      .select("*")
      .order("created_at", { ascending: false });

    setLoading(false);

    if (res.error) {
      console.error(res.error);
      alert(res.error.message);
      return;
    }
    setRows((res.data || []) as AccessRequestRow[]);
  };

  useEffect(() => {
    (async () => {
      const u = await supabase.auth.getUser();
      setMe(u.data?.user?.id ?? null);
    })();
    refetch();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => (r.status || "pending") === filter);
  }, [rows, filter]);

  const approveAndProvision = async (r: AccessRequestRow) => {
    if (!me) return alert("No session user.");

    // 1) Mark approved (this triggers DB trigger too)
    const upd = await supabase
      .from("access_requests")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: me,
      } as any)
      .eq("id", r.id);

    if (upd.error) {
      console.error(upd.error);
      alert(upd.error.message);
      return;
    }

    // 2) Force provision (in case some older approval flow doesn't fire trigger)
    const rpc = await supabase.rpc("provision_access_request", { p_request_id: r.id });
    if (rpc.error) {
      console.error(rpc.error);
      alert(`Approved, but provision failed: ${rpc.error.message}`);
      await refetch();
      return;
    }

    await refetch();
    alert("Approved + Provisioned ✅");
  };

  const provisionOnly = async (r: AccessRequestRow) => {
    const rpc = await supabase.rpc("provision_access_request", { p_request_id: r.id });
    if (rpc.error) {
      console.error(rpc.error);
      alert(rpc.error.message);
      return;
    }
    await refetch();
    alert("Provisioned ✅");
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>🧟 Owner — Requests (Approve + Provision)</h2>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <button onClick={refetch}>↻ Refresh</button>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span>Filter</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="all">all</option>
          </select>
        </label>
      </div>

      {loading ? <div>Loading…</div> : null}

      {filtered.length === 0 ? (
        <div style={{ opacity: 0.75 }}>No requests.</div>
      ) : (
        <div style={{ display: "grid", gap: 10, maxWidth: 1100 }}>
          {filtered.map((r) => {
            const status = r.status || "pending";
            const requester = r.user_id || r.auth_user_id || "—";
            const codes = (r.requested_alliance_codes || []).map((c) => (c || "").toUpperCase());

            return (
              <div key={r.id} style={{ border: "1px solid #2a2a2a", borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>
                      {r.game_name || "(no game_name yet)"}{" "}
                      <span style={{ opacity: 0.7, fontWeight: 600 }}>— {status}</span>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Request ID: {r.id}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>User: {requester}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      Alliances: {fmtCodes(codes)}
                    </div>
                    {r.processed_at ? (
                      <div style={{ fontSize: 12, opacity: 0.8 }}>Processed: {r.processed_at}</div>
                    ) : null}
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    {requester !== "—" ? (
                      <button onClick={() => copyText("User UUID", requester)}>📋 Copy User UUID</button>
                    ) : null}
                    <button
                      onClick={() => approveAndProvision(r)}
                      disabled={status === "approved"}
                      title="Sets status=approved and provisions player/memberships"
                    >
                      ✅ Approve + Provision
                    </button>

                    <button onClick={() => provisionOnly(r)} title="Runs provisioning again (safe idempotent)">
                      🔁 Provision Only
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                  This page is the “bulletproof” flow: it both updates the row and calls the RPC.
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
        Direct link: <code>/owner/requests-provision</code>
      </div>
    </div>
  );
}

