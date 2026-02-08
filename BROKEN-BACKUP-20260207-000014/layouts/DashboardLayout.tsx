import { Outlet } from 'react-router-dom';
import '../styles/dashboard-zombie.css';

export default function DashboardLayout() {
  return (
    <div className='dashboard-root'>
      <aside className='dashboard-sidebar'>
        <h2 className='sidebar-title'>🧟 State 789</h2>
        <nav>
          <a href='/dashboard'>Dashboard</a>
          <a href='/hq-map'>HQ Map</a>
        </nav>
      </aside>

      <main className='dashboard-main'>
        <Outlet />
      </main>
    </div>
  );
}
