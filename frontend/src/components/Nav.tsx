import { Link } from 'react-router-dom'

export default function Nav({ user, onLogout }: { user: any, onLogout: () => void }) {
  return (
    <nav style={{ 
      background: '#333', 
      color: 'white', 
      padding: '15px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <strong>CityShield</strong>
        <Link to="/" style={{ color: 'white' }}>Overview</Link>
        <Link to="/alerts" style={{ color: 'white' }}>Alerts</Link>
        <Link to="/scenarios" style={{ color: 'white' }}>Scenarios</Link>
        <Link to="/rules" style={{ color: 'white' }}>Rules</Link>
        {user?.role === 'Administrator' && (
          <Link to="/admin/users" style={{ color: 'white' }}>Users</Link>
        )}
      </div>
      <div>
        <span style={{ marginRight: '15px' }}>{user?.username} ({user?.role})</span>
        <button onClick={onLogout} style={{ padding: '5px 15px', cursor: 'pointer' }}>Logout</button>
      </div>
    </nav>
  )
}
