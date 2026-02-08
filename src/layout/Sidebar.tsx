import { NavLink } from "react-router-dom";
import "../styles/sidebar.css";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <span className="sidebar-title">Dashboard</span>
        <NavLink to="/app" className="nav-item">
          Overview
        </NavLink>
        <NavLink to="/dashboard/hq-map" className="nav-item">
          HQ Map
        </NavLink>
      
        <NavLink to="/dashboard/events">Events</NavLink>
</div>

      <div className="sidebar-section">
        <span className="sidebar-title">Account</span>
        <NavLink to="/onboarding" className="nav-item">
          Onboarding
        </NavLink>
      </div>
    </aside>
  );
}

