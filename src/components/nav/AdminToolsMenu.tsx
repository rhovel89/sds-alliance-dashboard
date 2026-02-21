import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Btn = { label: string; emoji: string; to: string };

const OWNER_BUTTONS: Btn[] = [
  { emoji: "🧟", label: "Live Ops (timer + checklist)", to: "/owner/live-ops" },
  { emoji: "📣", label: "Broadcast Composer", to: "/owner/broadcast" },
  { emoji: "🔧", label: "Discord Mentions (Roles/Channels)", to: "/owner/discord-mentions" },
  { emoji: "🗂️", label: "Alliance Directory Editor", to: "/owner/alliance-directory" },
  { emoji: "🧩", label: "Permissions Matrix (shell)", to: "/owner/permissions-matrix" },
  { emoji: "✅", label: "One-click Approve + Provision", to: "/owner/oneclick-provision" },
  { emoji: "🎯", label: "Event Types Library", to: "/owner/event-types-library" },
];

async function safeRpcBool(name: string): Promise<boolean> {
  try {
    const r = await supabase.rpc(name as any, {} as any);
    if (r.error) return false;
    return r.data === true;
  } catch {
    return false;
  }
}

export function AdminToolsMenu() {
  const [open, setOpen] = useState(false);
  const [canShow, setCanShow] = useState<boolean>(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const a = await safeRpcBool("is_app_admin");
      const o1 = await safeRpcBool("is_dashboard_owner");
      const o2 = await safeRpcBool("is_dashboard_owner_current");
      if (!cancel) setCanShow(!!(a || o1 || o2));
    })();
    return () => { cancel = true; };
  }, []);

  const title = useMemo(() => "Admin Tools", []);

  if (!canShow) return null;

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        className="zombie-btn"
        style={{ padding: "10px 12px" }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        🛠️ {title}
      </button>

      {open ? (
        <div
          className="zombie-card"
          style={{
            position: "absolute",
            right: 0,
            marginTop: 10,
            minWidth: 320,
            zIndex: 9999,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.85 }}>Owner Tools</div>

          {/* SAD_ADMINTOOLS_BUTTONS_V1 */}
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {OWNER_BUTTONS.map((b) => (
              <button
                key={b.to}
                className="zombie-btn"
                style={{ width: "100%", textAlign: "left", padding: "10px 12px", display: "flex", gap: 10, alignItems: "center" }}
                onClick={() => {
                  setOpen(false);
                  window.location.href = b.to;
                }}
              >
                <div style={{ fontSize: 18 }}>{b.emoji}</div>
                <div style={{ fontWeight: 900 }}>{b.label}</div>
                <div style={{ marginLeft: "auto", opacity: 0.65, fontSize: 12 }}>{b.to}</div>
              </button>
            ))}
          </div>

          <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
            <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AdminToolsMenu;
