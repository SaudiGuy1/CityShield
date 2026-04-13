import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { ActiveAttack } from '../App'

interface NavItem {
  to: string
  label: string
  icon: JSX.Element
  roles?: string[]
}

const NON_VIEWER_ROLES = ['Administrator', 'Analyst', 'Researcher']

const navItems: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    roles: NON_VIEWER_ROLES,
    icon: (
      <svg className="nav-item-icon" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    to: '/city',
    label: 'Smart City',
    roles: NON_VIEWER_ROLES,
    icon: (
      <svg className="nav-item-icon" viewBox="0 0 24 24">
        <path d="M3 21h18" />
        <path d="M5 21V7l8-4v18" />
        <path d="M19 21V11l-6-4" />
        <path d="M9 9h1" />
        <path d="M9 13h1" />
        <path d="M9 17h1" />
      </svg>
    ),
  },
  {
    to: '/alerts',
    label: 'Alerts',
    roles: NON_VIEWER_ROLES,
    icon: (
      <svg className="nav-item-icon" viewBox="0 0 24 24">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    to: '/devices',
    label: 'Devices',
    roles: NON_VIEWER_ROLES,
    icon: (
      <svg className="nav-item-icon" viewBox="0 0 24 24">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    to: '/scenarios',
    label: 'Scenarios',
    roles: NON_VIEWER_ROLES,
    icon: (
      <svg className="nav-item-icon" viewBox="0 0 24 24">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    to: '/rules',
    label: 'Rules',
    roles: NON_VIEWER_ROLES,
    icon: (
      <svg className="nav-item-icon" viewBox="0 0 24 24">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    to: '/awareness',
    label: 'Awareness',
    icon: (
      <svg className="nav-item-icon" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
  {
    to: '/proposals',
    label: 'Proposals',
    roles: ['Researcher', 'Administrator'],
    icon: (
      <svg className="nav-item-icon" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    ),
  },
  {
    to: '/admin/users',
    label: 'Users',
    roles: ['Administrator'],
    icon: (
      <svg className="nav-item-icon" viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
]

export default function Nav({
  user,
  activeAttack,
  onLogout,
}: {
  user: { username?: string; role?: string } | null
  activeAttack: ActiveAttack | null
  onLogout: () => void
}) {
  const location = useLocation()

  const visibleItems = navItems.filter(
    (item) => !item.roles || (user?.role && item.roles.includes(user.role))
  )

  return (
    <nav>
      <div className="nav-container">
        {/* Brand */}
        <span className="nav-brand">CityShield</span>

        {/* Nav Links */}
        <div className="nav-links">
          {visibleItems.map((item) => {
            const isActive =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to)

            return (
              <motion.div key={item.to} whileHover={{ x: 4 }} transition={{ duration: 0.15 }}>
                <Link
                  to={item.to}
                  className={isActive ? 'active' : ''}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </motion.div>
            )
          })}

          {/* Attack Live Badge */}
          {activeAttack && (
            <Link to="/" className="attack-live-badge">
              <span className="attack-live-dot" />
              ATTACK LIVE
            </Link>
          )}
        </div>

        {/* User Section */}
        <div className="sidebar-user">
          <div className="sidebar-user-info">
            <div className="sidebar-user-avatar">
              {user?.username?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="sidebar-user-details">
              <div className="sidebar-user-name">{user?.username || 'User'}</div>
              <div className="sidebar-user-role">{user?.role || 'Unknown'}</div>
            </div>
          </div>
          <button className="btn btn-sm btn-secondary" style={{ width: '100%' }} onClick={onLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}
