import React, { useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { detectAllianceFromPath } from "../../utils/detectAllianceFromPath";
import { getCurrentAlliance } from "../../utils/getCurrentAlliance";
import { getCurrentTheme } from "../../utils/getCurrentTheme";

export function SupportBundleButton(props: { label?: string; allianceCode?: string | null }) {
  const label = props.label || "Copy Support Bundle";
  const alliance = useMemo(() => (props.allianceCode ? String(props.allianceCode).toUpperCase() : null), [props.allianceCode]);
  const [msg, setMsg] = useState<string | null>(null);

  async function safeRpc(name: string) {
    try {
      const r = await supabase.rpc(name as any, {} as any);
      if (r.error) return null;
      return r.data;
    } catch {
      return null;
    }
  }

  async function run() {
    setMsg(null);
    try {
      const u = await supabase.auth.getUser();
      const userId = u.data.user?.id || null;

      const isAppAdmin = await safeRpc("is_app_admin");
      const isDashOwner = (await safeRpc("is_dashboard_owner")) ?? (await safeRpc("is_dashboard_owner_current"));

      const payload = {
        tsUtc: new Date().toISOString(),
        href: window.location.href,
        path: window.location.pathname,
        alliance: getCurrentAlliance(window.location.pathname),
        theme: getCurrentTheme(getCurrentAlliance(window.location.pathname)),
        userId,
        isAppAdmin: !!isAppAdmin,
        isDashboardOwner: !!isDashOwner,
        browserOnline: navigator.onLine,
        userAgent: navigator.userAgent,
      };

      const txt = JSON.stringify(payload, null, 2);
      try {
        await navigator.clipboard.writeText(txt);
        setMsg("Copied.");
        window.setTimeout(() => setMsg(null), 2000);
      } catch {
        window.prompt("Copy support bundle:", txt);
      }
    } catch {
      window.alert("Support bundle failed.");
    }
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <button className="zombie-btn" style={{ padding: "10px 12px", fontSize: 12 }} onClick={run}>
        {label}
      </button>
      {msg ? <span style={{ opacity: 0.75, fontSize: 12 }}>{msg}</span> : null}
    </div>
  );
}

export default SupportBundleButton;
