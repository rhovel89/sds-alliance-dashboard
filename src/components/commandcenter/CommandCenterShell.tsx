import React, { ReactNode, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";

export type CommandNavItem = {
  id?: string;
  label: string;
  to: string;
  icon?: string;
  badge?: string;
  hint?: string;
};

function isActive(pathname: string, to: string) {
  if (!to) return false;
  if (pathname === to) return true;
  if (pathname.startsWith(to + "/")) return true;
  return false;
}

export default function CommandCenterShell(props: {
  navTitle?: string;
  navItems: CommandNavItem[];
  rightRail?: ReactNode;
  children: ReactNode;
}) {
  const loc = useLocation();

  const items = useMemo(() => {
    const list = Array.isArray(props.navItems) ? props.navItems : [];
    return list.map((x, i) => ({
      id: x.id || `${i}-${x.to}`,
      label: x.label,
      to: x.to,
      icon: x.icon || "▸",
      badge: x.badge || "",
      hint: x.hint || "",
    }));
  }, [props.navItems]);

  return (
    <div className="cc-shell">
      <div className="cc-shell-grid">
        <aside className="cc-shell-nav zombie-card">
          <div className="cc-shell-nav-head">
            <div className="cc-shell-nav-kicker">MISSION NAV</div>
            <div className="cc-shell-nav-title">{props.navTitle || "SECTOR MENU"}</div>
          </div>

          <div className="cc-shell-nav-list">
            {items.map((it) => {
              const active = isActive(loc.pathname, it.to);
              return (
                <Link
                  key={it.id}
                  to={it.to}
                  className={"cc-nav-item " + (active ? "cc-nav-item--active" : "")}
                >
                  <span className="cc-nav-icon">{it.icon}</span>
                  <span className="cc-nav-label">{it.label}</span>
                  {it.badge ? <span className="cc-nav-badge">{it.badge}</span> : null}
                </Link>
              );
            })}
          </div>

          <div className="cc-shell-nav-foot">
            <div style={{ opacity: 0.65, fontSize: 12 }}>
              Tip: Access/memberships refresh on focus and realtime.
            </div>
          </div>
        </aside>

        <main className="cc-shell-main">{props.children}</main>

        <aside className="cc-shell-rail">
          {props.rightRail ? (
            props.rightRail
          ) : (
            <div className="zombie-card" style={{ padding: 14, opacity: 0.8 }}>
              <div style={{ fontWeight: 900 }}>INTEL RAIL</div>
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                No intel panels attached yet.
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
