import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Props = {
  allianceCode?: string | null;
};

function nowUtcIso() {
  return new Date().toISOString();
}

export function RealtimeStatusBadge(props: Props) {
  const alliance = useMemo(() => (props.allianceCode ? String(props.allianceCode).toUpperCase() : null), [props.allianceCode]);

  const [browserOnline, setBrowserOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [supabaseOk, setSupabaseOk] = useState<null | boolean>(null);
  const [lastCheckUtc, setLastCheckUtc] = useState<string | null>(null);

  useEffect(() => {
    const onUp = () => setBrowserOnline(true);
    const onDown = () => setBrowserOnline(false);
    window.addEventListener("online", onUp);
    window.addEventListener("offline", onDown);
    return () => {
      window.removeEventListener("online", onUp);
      window.removeEventListener("offline", onDown);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function probe() {
      try {
        // "Reachability" probe: any response (even permission error) counts as "reachable"
        // We avoid service role keys; this uses the existing anon/auth session.
        const r = await supabase.rpc("is_app_admin" as any, {} as any);
        if (cancelled) return;

        // If the request completed, Supabase is reachable (even if the result is false or error is permission-ish)
        const msg = (r.error?.message || "").toLowerCase();
        const networky =
          msg.includes("failed to fetch") ||
          msg.includes("network") ||
          msg.includes("timeout") ||
          msg.includes("load failed");

        setSupabaseOk(!networky);
        setLastCheckUtc(nowUtcIso());
      } catch {
        if (cancelled) return;
        setSupabaseOk(false);
        setLastCheckUtc(nowUtcIso());
      }
    }

    probe();
    const id = window.setInterval(probe, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const status = !browserOnline ? "OFFLINE" : supabaseOk === true ? "ONLINE" : supabaseOk === false ? "DEGRADED" : "CHECKING";

  const bg =
    status === "ONLINE" ? "rgba(60,200,120,0.18)" :
    status === "DEGRADED" ? "rgba(255,200,80,0.16)" :
    status === "OFFLINE" ? "rgba(255,90,90,0.16)" :
    "rgba(200,200,200,0.12)";

  const border =
    status === "ONLINE" ? "rgba(60,200,120,0.35)" :
    status === "DEGRADED" ? "rgba(255,200,80,0.30)" :
    status === "OFFLINE" ? "rgba(255,90,90,0.30)" :
    "rgba(200,200,200,0.22)";

  return (
    <div
      className="zombie-pill"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 999,
        border: "1px solid " + border,
        background: bg,
        fontSize: 12,
        lineHeight: "12px",
        whiteSpace: "nowrap",
      }}
      title={lastCheckUtc ? "Last check (UTC): " + lastCheckUtc : "Checking connectivity…"}
    >
      <span style={{ fontWeight: 900 }}>●</span>
      <span style={{ fontWeight: 800 }}>{status}</span>
      {alliance ? <span style={{ opacity: 0.8 }}>|</span> : null}
      {alliance ? <span style={{ fontWeight: 900 }}>ALLIANCE: {alliance}</span> : null}
    </div>
  );
}