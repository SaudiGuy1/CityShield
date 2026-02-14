import { Link } from 'react-router-dom'
import type { ActiveAttack } from '../App'

export default function Nav({ user, activeAttack, onLogout }: { user: any; activeAttack: ActiveAttack | null; onLogout: () => void }) {
  return (
    <nav>
      <div className="nav-container">
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="nav-brand">CityShield</span>
          <Link to="/">Dashboard</Link>
          <Link to="/alerts">Alerts</Link>
          <Link to="/devices">Devices</Link>
          <Link to="/scenarios">Scenarios</Link>
          <Link to="/rules">Rules</Link>
          {user?.role === 'Administrator' && (
            <Link to="/admin/users">Users</Link>
          )}
          {activeAttack && (
            <Link to="/" style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid var(--accent-danger)',
              borderRadius: '0.5rem',
              padding: '0.35rem 0.75rem',
              color: 'var(--accent-danger)',
              fontSize: '0.8rem',
              fontWeight: 600,
              animation: 'pulse-border 2s infinite',
            }}>
              ATTACK LIVE
            </Link>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {user?.username} ({user?.role})
          </span>
          <button className="btn btn-sm btn-secondary" onClick={onLogout}>Logout</button>
        </div>
      </div>
    </nav>
  )
}
