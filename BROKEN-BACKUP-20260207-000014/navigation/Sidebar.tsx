import { NavLink } from "react-router-dom";
import { usePermissionContext } from "../contexts/PermissionContext";

const navItemStyle = {
  padding: "12px 16px",
  display: "block",
  textDecoration: "none",
  color: "#b6ff6b",
  fontWeight: 500,
};

const activeStyle = {
  background: "rgba(50, 90, 0, 0.35)",
  borderLeft: "4px solid #7CFF00",
};

export default function Sidebar() {
  const { hasPermission } = usePermissionContext();

  return (
    <aside
      style={{
        width: 260,
        minHeight: "100vh",
        background: "rgba(5,5,5,0.95)",
        borderRight: "1px solid #1f3d00",
        boxShadow: "0 0 25px rgba(0,255,0,0.15)",
      }}
    >
      <div
        style={{
          padding: 20,
          fontSize: 20,
          fontWeight: 700,
          color: "#7CFF00",
          textAlign: "center",
          borderBottom: "1px solid #1f3d00",
        }}
      >
        🧟 Alliance Command
      </div>

      <nav style={{ marginTop: 10 }}>
        <NavLink to="/" style={({ isActive }) => isActive ? { ...navItemStyle, ...activeStyle } : navItemStyle}>
          My Alliance
        </NavLink>

        {hasPermission("state:view") && (
          <NavLink to="/state" style={({ isActive }) => isActive ? { ...navItemStyle, ...activeStyle } : navItemStyle}>
            State Dashboard
          </NavLink>
        )}

        {hasPermission("hq:read") && (
          <NavLink to="/hq-map" style={({ isActive }) => isActive ? { ...navItemStyle, ...activeStyle } : navItemStyle}>
            HQ Map
          </NavLink>
        )}

        {hasPermission("permissions:admin") && (
          <NavLink to="/owner/permissions" style={({ isActive }) => isActive ? { ...navItemStyle, ...activeStyle } : navItemStyle}>
            Permissions
          </NavLink>
        )}
      </nav>
    </aside>
  );
}







