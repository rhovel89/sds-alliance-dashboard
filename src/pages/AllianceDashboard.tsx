import { useEffect } from 'react'
import '../styles/dashboard-zombie.css'

export default function AllianceDashboard() {

  useEffect(() => {
    document.body.classList.add('dashboard-mode')
    return () => document.body.classList.remove('dashboard-mode')
  }, [])

  return (
    <div className='dashboard-shell'>
      <h1>🧟 Alliance Dashboard</h1>

      <div className='dashboard-card'>
        <h2>Status</h2>
        <p>All systems operational.</p>
      </div>

      <div className='dashboard-card'>
        <h2>Alerts</h2>
        <p>No zombie breaches detected.</p>
      </div>
    </div>
  )
}
