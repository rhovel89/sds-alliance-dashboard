import { NavLink, useParams } from "react-router-dom";
import "../styles/sidebar.css";

export default function Sidebar() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const base = alliance_id ? `/dashboard/${alliance_id}` : "";

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <NavLink to={base}>My Alliance</NavLink>
        <NavLink to={`${base}/hq-map`}>HQ Map</NavLink>
        <NavLink to={`${base}/events`}>Events</NavLink>
        <NavLink to={`${base}/permissions`}>Permissions</NavLink>
      </nav>
    </aside>
  );
}
