import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useIsAppAdmin } from "../../hooks/useIsAppAdmin";

function getAllianceFromPath(pathname: string): string | null {
  const m = (pathname || "").match(/^\/dashboard\/([^\/]+)/);
  if (!m) return null;
  const code = (m[1] || "").toString().trim();
  return code ? code.toUpperCase() : null;
}

async function isDashboardOwnerSafe(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("is_dashboard_owner" as any);
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

export function AdminToolsMenu() {
  const nav = useNavigate();
  const admin = useIsAppAdmin();
  const [isOwner, setIsOwner] = useState(false);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const alliance = useMemo(() => {
    if (typeof window === "undefined") return null;
    return getAllianceFromPath(window.location.pathname);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await supabase.auth.getUser();
      const uid = (u as any)?.data?.user?.id ?? null;
      if (!cancelled) setUserId(uid);

      const o = await isDashboardOwnerSafe();
      if (!cancelled) setIsOwner(o);
    })();
    return () => { cancelled = true; };
  }, []);

  const allowed = !!isOwner || !!admin.isAdmin;
  if (!allowed) return null;

  const go = (path: string) => {
    setOpen(false);
    nav(path);
  };

  const copySupportBundle = async () => {
    const href = typeof window !== "undefined" ? window.location.href : "";
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    const a = getAllianceFromPath(path);
    const payload = {
      tsUtc: new Date().toISOString(),
      href,
      path,
      alliance: a,
      userId,
      isAppAdmin: admin.isAdmin,
      isDashboardOwner: isOwner,
      browserOnline: typeof navigator !== "undefined" ? navigator.onLine : null,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    };
    await navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
    window.alert("Copied support bundle JSON to clipboard.");
  };

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        className="zombie-btn"
        style={{ height: 34, padding: "0 12px" }}
        onClick={() => setOpen((v) => !v)}
        title="Admin Tools"
      >
        🧰 Admin Tools
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 0,
            zIndex: 99999,
            minWidth: 260,
            padding: 10,
            borderRadius: 12,
            border: "1px solid rgba(120,255,120,0.18)",
            background: "rgba(0,0,0,0.85)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
          }}
          onMouseLeave={() => setOpen(false)}
        >
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>
            {isOwner ? "Owner" : "Admin"} {alliance ? `• ${alliance}` : ""}
          </div>

          <MenuBtn label="🧪 System Status" onClick={() => go("/status")} />
          <MenuBtn label="🧟 Dashboard Select (/me)" onClick={() => go("/me")} />
          <MenuBtn label="🧩 Owner Area (/owner)" onClick={() => go("/owner")} />

          {alliance ? (
            <>
              <Divider />
              <MenuBtn label={`🏠 Alliance Dashboard (${alliance})`} onClick={() => go(`/dashboard/${alliance}`)} />
              <MenuBtn label="📅 Calendar" onClick={() => go(`/dashboard/${alliance}/calendar`)} />
              <MenuBtn label="📚 Guides" onClick={() => go(`/dashboard/${alliance}/guides`)} />
              <MenuBtn label="🗺️ HQ Map" onClick={() => go(`/dashboard/${alliance}/hq-map`)} />
            </>
          ) : null}

          <Divider />
          <MenuBtn label="🧾 Copy Support Bundle" onClick={copySupportBundle} />

          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 8 }}>
            UI-only helpers. No DB writes.
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "rgba(120,255,120,0.14)", margin: "10px 0" }} />;
}

function MenuBtn(props: { label: string; onClick: () => void }) {
  return (
    <button
      className="zombie-btn"
      style={{ width: "100%", textAlign: "left", height: 34, padding: "0 10px", marginTop: 6 }}
      onClick={props.onClick}
    >
      {props.label}
    </button>
  );
}