import { useEffect } from 'react'
import '../styles/dashboard-theme.css'
import { Link } from 'react-router-dom'

export default function AllianceDashboard() {
  useEffect(() => {
    document.body.classList.add('dashboard-theme')
    return () => document.body.classList.remove('dashboard-theme')
  }, [])

  return (
    <>
      <div className='dashboard-header'>
        <div className='dashboard-title'>STATE 789 — ALLIANCE HQ</div>
      </div>

      <div className='dashboard-container'>
        <div className='dashboard-sidebar'>
          <Link to='/dashboard'>🧠 Overview</Link>
          <Link to='/hq-map'>🗺 HQ Map</Link>
          <Link to='/permissions'>🔐 Permissions</Link>
          <Link to='/achievements'>🏆 Achievements</Link>
        </div>

        <div className='dashboard-content'>
          <div className='dashboard-card'>
            <h2>Alliance Status</h2>
            <p>Systems online. Awaiting commands.</p>
          </div>

          <div className='dashboard-card'>
            <h2>Threat Level</h2>
            <p>⚠️ Zombie activity increasing near HQ perimeter.</p>
          </div>
        </div>
      </div>
    </>
  )
}
