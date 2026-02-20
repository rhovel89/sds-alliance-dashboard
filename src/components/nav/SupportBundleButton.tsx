import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useIsAppAdmin } from "../../hooks/useIsAppAdmin";

async function isDashboardOwnerSafe(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("is_dashboard_owner" as any);
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

function getAllianceFromPath(pathname: string): string | null {
  const m = (pathname || "").match(/^\/dashboard\/([^\/]+)/);
  if (!m) return null;
  const code = (m[1] || "").toString().trim();
  return code ? code.toUpperCase() : null;
}

export function SupportBundleButton() {
  const admin = useIsAppAdmin();
  const [isOwner, setIsOwner] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const allowed = useMemo(() => isOwner || admin.isAdmin, [isOwner, admin.isAdmin]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const u = await supabase.auth.getUser();
      const uid = (u as any)?.data?.user?.id ?? null;
      if (!cancelled) setUserId(uid);

      const o = await isDashboardOwnerSafe();
      if (!cancelled) setIsOwner(o);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!allowed) return null;

  return (
    <button
      className="zombie-btn"
      style={{ height: 34, padding: "0 12px" }}
      onClick={() => {
        const href = typeof window !== "undefined" ? window.location.href : "";
        const path = typeof window !== "undefined" ? window.location.pathname : "";
        const alliance = getAllianceFromPath(path);
        const payload = {
          tsUtc: new Date().toISOString(),
          href,
          path,
          alliance,
          userId,
          isAppAdmin: admin.isAdmin,
          isDashboardOwner: isOwner,
          browserOnline: typeof navigator !== "undefined" ? navigator.onLine : null,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        };

        navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
        window.alert("Copied support bundle JSON to clipboard.");
      }}
      title="Copy support bundle (Owner/Admin)"
    >
      🧾 Support Bundle
    </button>
  );
}