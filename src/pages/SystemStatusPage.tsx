import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useIsAppAdmin } from "../hooks/useIsAppAdmin";

type Probe = { name: string; ok: boolean; detail: string };

async function rpcBool(name: string): Promise<{ ok: boolean; value: boolean; detail: string }> {
  try {
    const { data, error } = await supabase.rpc(name as any);
    if (error) return { ok: false, value: false, detail: error.message || "RPC error" };
    return { ok: true, value: data === true, detail: String(data) };
  } catch (e: any) {
    return { ok: false, value: false, detail: e?.message || "RPC exception" };
  }
}

async function probeSelect(table: string, sel: string): Promise<Probe> {
  try {
    const r: any = await supabase.from(table as any).select(sel as any).limit(1);
    if (r?.error) return { name: `${table}.select(${sel})`, ok: false, detail: r.error.message || "error" };
    return { name: `${table}.select(${sel})`, ok: true, detail: "OK" };
  } catch (e: any) {
    return { name: `${table}.select(${sel})`, ok: false, detail: e?.message || "exception" };
  }
}

export default function SystemStatusPage() {
  const admin = useIsAppAdmin();
  const [userId, setUserId] = useState<string | null>(null);
  const [owner, setOwner] = useState<{ loading: boolean; ok: boolean; value: boolean; detail: string }>({
    loading: true,
    ok: false,
    value: false,
    detail: "",
  });
  const [probes, setProbes] = useState<Probe[]>([]);
  const [loading, setLoading] = useState(true);

  const utc = useMemo(() => new Date().toISOString(), []);
  const local = useMemo(() => new Date().toLocaleString(), []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);

      const u = await supabase.auth.getUser();
      const uid = (u as any)?.data?.user?.id ?? null;
      if (!cancelled) setUserId(uid);

      const o = await rpcBool("is_dashboard_owner");
      if (!cancelled) setOwner({ loading: false, ok: o.ok, value: o.value, detail: o.detail });

      const list: Probe[] = [];
      list.push(await probeSelect("guide_sections", "id,alliance_code,title"));
      list.push(await probeSelect("alliance_events", "id,alliance_id"));
      list.push(await probeSelect("player_hqs", "id,created_at,updated_at"));

      if (!cancelled) {
        setProbes(list);
        setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const allowed = owner.value || admin.isAdmin;

  return (
    <div className="zombie-card" style={{ maxWidth: 860, margin: "16px auto", padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>🧪 System Status</h2>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", opacity: 0.9 }}>
        <div><b>Local:</b> {local}</div>
        <div><b>UTC:</b> {utc}</div>
        <div><b>Path:</b> {typeof window !== "undefined" ? window.location.pathname : ""}</div>
      </div>

      <hr className="zombie-divider" />

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 10 }}>
        <div><b>User ID</b></div>
        <div style={{ opacity: 0.9 }}>{userId || "(not logged in)"}</div>

        <div><b>is_app_admin</b></div>
        <div style={{ opacity: 0.9 }}>
          {admin.loading ? "Loading…" : (admin.isAdmin ? "true" : "false")}
          {admin.error ? <span style={{ color: "#ffb3b3" }}> — {admin.error}</span> : null}
        </div>

        <div><b>is_dashboard_owner</b></div>
        <div style={{ opacity: 0.9 }}>
          {owner.loading ? "Loading…" : (owner.value ? "true" : "false")}
          {!owner.ok ? <span style={{ color: "#ffb3b3" }}> — {owner.detail}</span> : null}
        </div>
      </div>

      <hr className="zombie-divider" />

      {!allowed ? (
        <div style={{ color: "#ffb3b3" }}>Access restricted (Owner/Admin only).</div>
      ) : (
        <>
          <h3 style={{ marginTop: 0 }}>Read-only Probes</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {loading ? (
              <div style={{ opacity: 0.8 }}>Running probes…</div>
            ) : (
              probes.map((p) => (
                <div key={p.name} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 18 }}>{p.ok ? "✅" : "❌"}</div>
                  <div style={{ flex: 1, opacity: 0.9 }}>{p.name}</div>
                  <div style={{ color: p.ok ? "rgba(235,255,235,0.9)" : "#ffb3b3", opacity: 0.95 }}>
                    {p.detail}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <hr className="zombie-divider" />

      <button
        className="zombie-btn"
        onClick={() => {
          const payload = {
            localTime: local,
            utcTime: utc,
            path: typeof window !== "undefined" ? window.location.pathname : "",
            userId,
            isAppAdmin: admin.isAdmin,
            isDashboardOwner: owner.value,
            probes,
          };
          navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
          window.alert("Copied status JSON to clipboard.");
        }}
      >
        Copy Status JSON
      </button>
    </div>
  );
}