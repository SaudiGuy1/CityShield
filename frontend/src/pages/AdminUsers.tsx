import { useState, useEffect } from 'react'
import { formatDateOnly } from '../utils/datetime'

interface AppUser {
  username: string
  email: string
  role: string
  is_active: boolean
  created_at?: string
}

export default function AdminUsers({ user }: { user: { username?: string; role?: string } | null }) {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'Analyst',
    is_active: true
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
      setError('All fields are required')
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
        setSuccess('User created successfully!')
        setFormData({ username: '', email: '', password: '', role: 'Analyst', is_active: true })
        setShowCreateForm(false)
        await fetchUsers()
      } else {
        const data = await res.json()
        setError(data.detail || 'Failed to create user')
      }
    } catch (err) {
      setError('Error creating user')
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

  const deleteUser = async (username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/users/${username}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        setSuccess('User deleted successfully')
        await fetchUsers()
      } else {
        setError('Failed to delete user')
      }
    } catch (err) {
      setError('Error deleting user')
    }
  }

  const getRoleBadgeClass = (role: string) => {
    switch(role) {
      case 'Administrator': return 'badge-danger'
      case 'Analyst': return 'badge-primary'
      case 'Researcher': return 'badge-warning'
      case 'Viewer': return 'badge-info'
      default: return 'badge-secondary'
    }
  }

  if (user?.role !== 'Administrator') {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h1>Access Denied</h1>
          <p style={{ color: 'var(--text-secondary)' }}>This page is only accessible to administrators</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage user accounts and role-based access control</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
          + Create User
        </button>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-danger)', marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--accent-danger)', margin: 0 }}>{error}</p>
        </div>
      )}
      {success && (
        <div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-success)', marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--accent-success)', margin: 0 }}>{success}</p>
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
            <h3>Create New User</h3>
            <form onSubmit={createUser} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={8}
                />
                <small style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                  Minimum 8 characters
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-control"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  required
                >
                  <option value="Viewer">Viewer - View security awareness content only</option>
                  <option value="Analyst">Analyst - View and analyze security data, execute response actions</option>
                  <option value="Researcher">Researcher - Design scenarios, configure rules, manage research lab</option>
                  <option value="Administrator">Administrator - Full system access including user management</option>
                </select>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                />
                <label htmlFor="is_active" className="form-label" style={{ margin: 0 }}>
                  Active User
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary">
                  Create User
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No users found</p>
        </div>
      ) : (
        <div className="card">
          <h3>Users ({users.length})</h3>
          <div className="table-responsive" style={{ marginTop: '1rem' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.username}>
                    <td><strong>{u.username}</strong></td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge ${getRoleBadgeClass(u.role)}`}>{u.role}</span>
                    </td>
                    <td>
                      {u.is_active ? (
                        <span className="badge badge-success">Active</span>
                      ) : (
                        <span className="badge badge-secondary">Inactive</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                      {u.created_at ? formatDateOnly(u.created_at) : '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className={`btn btn-sm ${u.is_active ? 'btn-warning' : 'btn-success'}`}
                          onClick={() => toggleUserStatus(u.username, u.is_active)}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        {u.username !== 'admin' && (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => deleteUser(u.username)}
                          >
                            Delete
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

      {/* Role Information */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Role Permissions</h3>
        <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <span className="badge badge-info">Viewer</span>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              View security awareness content only
            </p>
          </div>
          <div>
            <span className="badge badge-primary">Analyst</span>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              View and analyze security data, execute manual response actions on alerts
            </p>
          </div>
          <div>
            <span className="badge badge-warning">Researcher</span>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Design and run attack scenarios, configure detection rules, manage research lab
            </p>
          </div>
          <div>
            <span className="badge badge-danger">Administrator</span>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Full system access including user management and system configuration
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
