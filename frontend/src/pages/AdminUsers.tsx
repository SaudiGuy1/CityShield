import { useState, useEffect, useMemo } from 'react'
import { formatDateOnly } from '../utils/datetime'
import { useLang } from '../hooks/useLang'

interface AppUser {
  username: string
  email: string
  role: string
  is_active: boolean
  created_at?: string
  manager_username?: string | null
}

const ROLES = ['Viewer', 'Manager', 'Analyst', 'Researcher', 'Administrator'] as const

const ROLE_BADGE_CLASS: Record<string, string> = {
  Administrator: 'badge-danger',
  Analyst: 'badge-primary',
  Researcher: 'badge-warning',
  Manager: 'badge-info',
  Viewer: 'badge-secondary',
}

const ROLE_PERMISSION_KEYS: { role: string; badgeClass: string; descKey: string }[] = [
  { role: 'Viewer', badgeClass: 'badge-secondary', descKey: 'admin.role_permissions.viewer' },
  { role: 'Manager', badgeClass: 'badge-info', descKey: 'admin.role_permissions.manager' },
  { role: 'Analyst', badgeClass: 'badge-primary', descKey: 'admin.role_permissions.analyst' },
  { role: 'Researcher', badgeClass: 'badge-warning', descKey: 'admin.role_permissions.researcher' },
  { role: 'Administrator', badgeClass: 'badge-danger', descKey: 'admin.role_permissions.administrator' },
]

export default function AdminUsers({ user }: { user: { username?: string; role?: string } | null }) {
  const { tk, dir } = useLang()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState<{
    username: string
    email: string
    password: string
    role: string
    is_active: boolean
    manager_username: string | null
  }>({
    username: '',
    email: '',
    password: '',
    role: 'Analyst',
    is_active: true,
    manager_username: null,
  })
  const [editingManagerFor, setEditingManagerFor] = useState<string | null>(null)
  const [managerDraft, setManagerDraft] = useState<string>('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    if (user?.role === 'Administrator') {
      fetchUsers()
    }
  }, [user])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.username || !formData.email || !formData.password) {
      setError(tk('admin.fields_required'))
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setSuccess(tk('admin.user_created'))
        setFormData({ username: '', email: '', password: '', role: 'Analyst', is_active: true, manager_username: null })
        setShowCreateForm(false)
        await fetchUsers()
      } else {
        const data = await res.json()
        setError(data.detail || tk('admin.create_user_error'))
      }
    } catch {
      setError(tk('admin.create_user_error'))
    }
  }

  const toggleUserStatus = async (username: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/users/${username}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !currentStatus })
      })

      if (res.ok) {
        await fetchUsers()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const assignManager = async (username: string, manager_username: string | null) => {
    setError('')
    setSuccess('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/users/${username}/manager`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ manager_username }),
      })
      if (res.ok) {
        setEditingManagerFor(null)
        setSuccess(manager_username
          ? tk('admin.manager_set', { manager: manager_username, user: username })
          : tk('admin.manager_cleared', { user: username }))
        await fetchUsers()
      } else {
        const data = await res.json()
        setError(data.detail || tk('admin.assign_manager_error'))
      }
    } catch {
      setError(tk('admin.assign_manager_error'))
    }
  }

  const deleteUser = async (username: string) => {
    if (!confirm(tk('admin.confirm_delete', { username }))) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/users/${username}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        setSuccess(tk('admin.user_deleted'))
        await fetchUsers()
      } else {
        setError(tk('admin.delete_user_error'))
      }
    } catch {
      setError(tk('admin.delete_user_error'))
    }
  }

  const managerCandidates = users.filter(u =>
    u.is_active && (u.role === 'Manager' || u.role === 'Administrator')
  )

  // Stats
  const totalUsers = users.length
  const activeUsers = users.filter(u => u.is_active).length
  const inactiveUsers = totalUsers - activeUsers

  // Filtered users
  const filteredUsers = useMemo(() => {
    let result = users
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(u =>
        u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      )
    }
    if (filterRole) {
      result = result.filter(u => u.role === filterRole)
    }
    if (filterStatus === 'active') {
      result = result.filter(u => u.is_active)
    } else if (filterStatus === 'inactive') {
      result = result.filter(u => !u.is_active)
    }
    return result
  }, [users, searchQuery, filterRole, filterStatus])

  if (user?.role !== 'Administrator') {
    return (
      <div className="container" dir={dir}>
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h1>{tk('admin.access_denied')}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{tk('admin.admin_only')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container" dir={dir}>
      <div className="page-header">
        <div>
          <h1>{tk('admin.title')}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{tk('admin.subtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
          {tk('admin.create_user')}
        </button>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          {success}
        </div>
      )}

      {/* Stat Cards */}
      {!loading && (
        <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="stat-card">
            <h3>{tk('admin.total_users')}</h3>
            <div className="stat-value">{totalUsers}</div>
          </div>
          <div className="stat-card">
            <h3>{tk('admin.active_users')}</h3>
            <div className="stat-value" style={{ color: 'var(--accent-success)' }}>{activeUsers}</div>
          </div>
          <div className="stat-card">
            <h3>{tk('admin.inactive_users')}</h3>
            <div className="stat-value" style={{ color: 'var(--accent-warning)' }}>{inactiveUsers}</div>
          </div>
        </div>
      )}

      {/* Create User Form Modal */}
      {showCreateForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowCreateForm(false)}>
          <div className="card" style={{
            maxWidth: '500px',
            width: '90%'
          }} onClick={e => e.stopPropagation()}>
            <h3>{tk('admin.create_new_user')}</h3>
            <form onSubmit={createUser} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label">{tk('common.username')}</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{tk('common.email')}</label>
                <input
                  type="email"
                  className="form-control"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{tk('admin.password')}</label>
                <input
                  type="password"
                  className="form-control"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={8}
                />
                <small style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                  {tk('admin.password_hint')}
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">{tk('common.role')}</label>
                <select
                  className="form-control"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  required
                >
                  <option value="Viewer">{tk('admin.role.viewer.desc')}</option>
                  <option value="Manager">{tk('admin.role.manager.desc')}</option>
                  <option value="Analyst">{tk('admin.role.analyst.desc')}</option>
                  <option value="Researcher">{tk('admin.role.researcher.desc')}</option>
                  <option value="Administrator">{tk('admin.role.administrator.desc')}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{tk('admin.manager_optional')}</label>
                <select
                  className="form-control"
                  value={formData.manager_username ?? ''}
                  onChange={e => setFormData({ ...formData, manager_username: e.target.value || null })}
                >
                  <option value="">{tk('admin.manager_none')}</option>
                  {managerCandidates
                    .filter(m => m.username !== formData.username)
                    .map(m => (
                      <option key={m.username} value={m.username}>
                        {m.username} ({m.role})
                      </option>
                    ))}
                </select>
                <small style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                  {tk('admin.manager_hint')}
                </small>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                />
                <label htmlFor="is_active" className="form-label" style={{ margin: 0 }}>
                  {tk('admin.active_user')}
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary">
                  {tk('admin.create_user')}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
                  {tk('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      {!loading && users.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 250px' }}>
              <input
                type="text"
                placeholder={tk('admin.search_placeholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ margin: 0 }}
              />
            </div>
            <div style={{ flex: '0 1 180px' }}>
              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
                style={{ margin: 0 }}
              >
                <option value="">{tk('admin.all_roles')}</option>
                {ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: '0 1 160px' }}>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                style={{ margin: 0 }}
              >
                <option value="">{tk('admin.all_statuses')}</option>
                <option value="active">{tk('common.active')}</option>
                <option value="inactive">{tk('common.inactive')}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" />
          <p style={{ color: 'var(--text-secondary)' }}>{tk('admin.loading_users')}</p>
        </div>
      ) : users.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>{tk('admin.no_users')}</p>
        </div>
      ) : (
        <div className="card">
          <h3>{tk('admin.users_count')} ({filteredUsers.length})</h3>
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table>
              <thead>
                <tr>
                  <th>{tk('common.username')}</th>
                  <th>{tk('common.email')}</th>
                  <th>{tk('common.role')}</th>
                  <th>{tk('admin.manager')}</th>
                  <th>{tk('common.status')}</th>
                  <th>{tk('common.created')}</th>
                  <th>{tk('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.username}>
                    <td><strong>{u.username}</strong></td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge ${ROLE_BADGE_CLASS[u.role] || 'badge-secondary'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      {editingManagerFor === u.username ? (
                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                          <select
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', minWidth: 140 }}
                            value={managerDraft}
                            onChange={e => setManagerDraft(e.target.value)}
                          >
                            <option value="">{tk('admin.no_manager')}</option>
                            {managerCandidates
                              .filter(m => m.username !== u.username)
                              .map(m => (
                                <option key={m.username} value={m.username}>{m.username}</option>
                              ))}
                          </select>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => assignManager(u.username, managerDraft || null)}
                          >
                            {tk('common.save')}
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => setEditingManagerFor(null)}
                          >
                            {tk('common.cancel')}
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ color: u.manager_username ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                            {u.manager_username || tk('common.none')}
                          </span>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => {
                              setEditingManagerFor(u.username)
                              setManagerDraft(u.manager_username ?? '')
                            }}
                            title={tk('common.edit')}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: u.is_active ? 'var(--accent-success)' : 'var(--text-tertiary)',
                          boxShadow: u.is_active ? '0 0 6px rgba(0, 255, 136, 0.5)' : 'none',
                          display: 'inline-block',
                          flexShrink: 0,
                        }} />
                        <span className={`badge ${u.is_active ? 'badge-success' : 'badge-secondary'}`}>
                          {u.is_active ? tk('common.active') : tk('common.inactive')}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                      {u.created_at ? formatDateOnly(u.created_at) : '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className={`btn btn-sm ${u.is_active ? 'btn-warning' : 'btn-success'}`}
                          onClick={() => toggleUserStatus(u.username, u.is_active)}
                          title={u.is_active ? tk('admin.deactivate') : tk('admin.activate')}
                        >
                          {u.is_active ? tk('admin.deactivate') : tk('admin.activate')}
                        </button>
                        {u.username !== 'admin' && (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => deleteUser(u.username)}
                            title={tk('common.delete')}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Role Permissions */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>{tk('admin.role_permissions')}</h3>
        <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
          {ROLE_PERMISSION_KEYS.map(({ role, badgeClass, descKey }) => (
            <div key={role}>
              <span className={`badge ${badgeClass}`}>{role}</span>
              <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {tk(descKey as Parameters<typeof tk>[0])}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
