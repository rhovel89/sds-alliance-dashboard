import React, { ReactNode, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";

export type CommandNavItem = {
  id?: string;
  label: string;
  to: string;
  icon?: string;
  badge?: string;
};

function isActive(pathname: string, to: string) {
  if (!to) return false;
  if (pathname === to) return true;
  if (pathname.startsWith(to + "/")) return true;
  return false;
}

export default function CommandCenterShell(props: {
  navTitle?: string;
  navItems?: CommandNavItem[];
  nav?: ReactNode;
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
            {props.nav ? (
              props.nav
            ) : (
              items.map((it) => {
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
              })
            )}
          </div>

          <div className="cc-shell-nav-foot">
            <div style={{ opacity: 0.7, fontSize: 12 }}>
              Tip: if something looks stale, refresh the page or re-open the tab.
            </div>
          </div>
        </aside>

        <main className="cc-shell-main">{props.children}</main>

        <aside className="cc-shell-rail">
          {props.rightRail ? (
            props.rightRail
          ) : (
            <div className="zombie-card" style={{ padding: 14, opacity: 0.85 }}>
              <div style={{ fontWeight: 900 }}>INTEL RAIL</div>
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                Attach panels here per page (status, queue, exports, etc).
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
