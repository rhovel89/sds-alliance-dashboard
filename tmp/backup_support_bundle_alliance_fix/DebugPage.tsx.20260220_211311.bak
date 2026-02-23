import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import SupportBundleButton from "../components/system/SupportBundleButton";

export default function DebugPage() {
  const [data, setData] = useState<any>({ loading: true });

  useEffect(() => {
    let cancel = false;
    async function run() {
      const out: any = {
        tsUtc: new Date().toISOString(),
        href: window.location.href,
        path: window.location.pathname,
        browserOnline: navigator.onLine,
        userAgent: navigator.userAgent,
      };

      try {
        const u = await supabase.auth.getUser();
        out.userId = u.data.user?.id || null;
      } catch { out.userId = null; }

      async function safeRpc(name: string) {
        try {
          const r = await supabase.rpc(name as any, {} as any);
          if (r.error) return { ok: false, error: r.error.message };
          return { ok: true, data: r.data };
        } catch (e: any) {
          return { ok: false, error: String(e?.message || e) };
        }
      }

      out.isAppAdmin = await safeRpc("is_app_admin");
      out.isDashboardOwner = await safeRpc("is_dashboard_owner");
      out.isDashboardOwnerCurrent = await safeRpc("is_dashboard_owner_current");

      if (!cancel) setData(out);
    }
    run();
    return () => { cancel = true; };
  }, []);

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🧪 Debug</h2>
        <SupportBundleButton />
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12 }}>{JSON.stringify(data, null, 2)}</pre>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => window.location.href = "/owner/jump"}>/owner/jump</button>
        <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => window.location.href = "/state/789/alerts"}>/state/789/alerts</button>
        <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => window.location.href = "/state/789/discussion"}>/state/789/discussion</button>
      </div>
    </div>
  );
}