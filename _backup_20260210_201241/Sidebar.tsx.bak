import { NavLink, useParams } from "react-router-dom";
import "../styles/sidebar.css";

export default function Sidebar() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const base = alliance_id ? `/dashboard/${alliance_id}` : "";

  return (
    <aside className="dashboard-sidebar zombie-sidebar">
      <h2 className="sidebar-title zombie-glow">
        🧟 {alliance_id?.toUpperCase() ?? "STATE 789"}
      </h2>

      <nav className="sidebar-nav">
        <NavLink to={base}>My Alliance</NavLink>
        <NavLink to={`${base}/hq-map`}>HQ Map</NavLink>
        <NavLink to={`${base}/events`}>Events</NavLink>
      </nav>
    </aside>
  );
}
