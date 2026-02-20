import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type Req = any;

const TABLES = [
  "alliance_memberships",
  "alliance_members",
  "memberships",
  "alliance_users",
  "player_alliance_roles",
  "player_alliances",
];

const USER_COLS = ["user_id", "auth_user_id"];
const ALLIANCE_COLS = ["alliance_code", "alliance_id", "alliance"];
const ROLE_COLS = ["role", "rank", "role_key"];

function parseAlliances(v: any): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).toUpperCase()).filter(Boolean);
  if (typeof v === "string") return v.split(/[,\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
  return [];
}

async function tryInsertMembership(userId: string, allianceCode: string, role: string) {
  for (const t of TABLES) {
    for (const uc of USER_COLS) {
      for (const ac of ALLIANCE_COLS) {
        for (const rc of ROLE_COLS) {
          const payload: any = {};
          payload[uc] = userId;
          payload[ac] = allianceCode;
          payload[rc] = role;

          const res = await supabase.from(t as any).insert(payload as any);
          if (!res.error) return { ok: true, table: t, userCol: uc, allianceCol: ac, roleCol: rc };

          const msg = (res.error.message || "").toLowerCase();
          // table/column mismatch or missing table -> keep trying
          if (msg.includes("does not exist") || msg.includes("not found") || msg.includes("pgrst")) continue;

          // already exists -> treat as ok
          if (msg.includes("duplicate") || msg.includes("already exists") || msg.includes("unique")) {
            return { ok: true, table: t, note: "already existed" };
          }

          // other errors (RLS, constraints) -> keep trying combos, but remember last
        }
      }
    }
  }
  return { ok: false };
}

export default function OwnerOneClickProvisionPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Req[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [role, setRole] = useState<"member" | "viewer" | "r4" | "r5">("member");

  const pendingCount = useMemo(() => rows.length, [rows.length]);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const r = await supabase
        .from("access_requests")
        .select("id,user_id,game_name,requested_alliances,status,created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (r.error) {
        setErr(r.error.message);
        setRows([]);
      } else {
        setRows(r.data || []);
      }
    } catch (e: any) {
      setErr(String(e?.message || e || "load failed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function approveAndProvision(req: Req) {
    const uid = String(req.user_id || "");
    if (!uid) return alert("Request missing user_id.");
    const alliances = parseAlliances(req.requested_alliances);
    if (!alliances.length) return alert("No requested alliances to provision.");

    setLoading(true);
    setErr(null);

    try {
      // 1) Provision memberships (best-effort; depends on your actual membership table)
      for (const a of alliances) {
        const ins = await tryInsertMembership(uid, a, role);
        if (!ins.ok) {
          setErr(
            "Provision failed: could not find a compatible membership table/columns OR RLS blocked inserts.\n" +
              "Try using Owner Membership Manager if you have it, or tell me your real membership table name/columns."
          );
          setLoading(false);
          return;
        }
      }

      // 2) Approve request
      const up = await supabase.from("access_requests").update({ status: "approved" } as any).eq("id", req.id);
      if (up.error) {
        setErr("Provisioned memberships, but approval update failed: " + up.error.message);
        setLoading(false);
        return;
      }

      // 3) Remove from list
      setRows((p) => (p || []).filter((x) => String(x.id) !== String(req.id)));
    } catch (e: any) {
      setErr(String(e?.message || e || "approve/provision failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>✅ Owner — One-click Approve + Provision</h2>
        <SupportBundleButton />
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Provision role:</div>
          <select className="zombie-input" value={role} onChange={(e) => setRole(e.target.value as any)} style={{ padding: "10px 12px" }}>
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
            <option value="r4">R4</option>
            <option value="r5">R5</option>
          </select>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={load} disabled={loading}>
            Refresh
          </button>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Pending: {pendingCount}</div>
        </div>
      </div>

      {err ? <div style={{ marginTop: 10, color: "#ffb3b3", whiteSpace: "pre-wrap" }}>{err}</div> : null}
      {loading ? <div style={{ marginTop: 10, opacity: 0.75 }}>Working…</div> : null}

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {rows.map((r) => (
          <div key={String(r.id)} className="zombie-card">
            <div style={{ fontWeight: 900 }}>{String(r.game_name || "Player")} — {String(r.user_id || "")}</div>
            <div style={{ opacity: 0.75, marginTop: 6, fontSize: 12 }}>
              Requested: {Array.isArray(r.requested_alliances) ? r.requested_alliances.join(", ") : String(r.requested_alliances || "")}
            </div>
            <button className="zombie-btn" style={{ marginTop: 10, padding: "10px 12px" }} onClick={() => approveAndProvision(r)} disabled={loading}>
              Approve + Provision
            </button>
          </div>
        ))}
        {rows.length === 0 && !loading ? <div style={{ opacity: 0.75 }}>No pending requests.</div> : null}
      </div>
    </div>
  );
}