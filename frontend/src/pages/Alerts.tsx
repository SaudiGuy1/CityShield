import { useState, useEffect } from 'react'

export default function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ severity: '', status: '' })

  useEffect(() => {
    fetchAlerts()
  }, [filters])

  const fetchAlerts = async () => {
    const token = localStorage.getItem('token')
    const params = new URLSearchParams()
    if (filters.severity) params.append('severity', filters.severity)
    if (filters.status) params.append('status', filters.status)

    try {
      const res = await fetch(`/api/alerts?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setAlerts(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (alertId: string, newStatus: string) => {
    const token = localStorage.getItem('token')
    await fetch(`/api/alerts/${alertId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    })
    fetchAlerts()
  }

  const getSeverityBadgeClass = (severity: string) => {
    switch(severity) {
      case 'critical': return 'badge-danger'
      case 'high': return 'badge-danger'
      case 'medium': return 'badge-warning'
      case 'low': return 'badge-success'
      default: return 'badge-secondary'
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'open': return 'badge-danger'
      case 'triaged': return 'badge-warning'
      case 'resolved': return 'badge-success'
      default: return 'badge-secondary'
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>Security Alerts</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Monitor and manage security alerts from detection rules</p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Filters</h3>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <label className="form-label">Severity</label>
            <select className="form-control" value={filters.severity} onChange={e => setFilters({...filters, severity: e.target.value})}>
              <option value="">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="form-label">Status</label>
            <select className="form-control" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="triaged">Triaged</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading alerts...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No alerts found</p>
        </div>
      ) : (
        <div className="card">
          <h3>Alerts ({alerts.length})</h3>
          <div className="table-responsive" style={{ marginTop: '1rem' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Alert ID</th>
                  <th>Rule Name</th>
                  <th>Severity</th>
                  <th>Component</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(alert => (
                  <tr key={alert.alert_id}>
                    <td><code>{alert.alert_id.substring(0, 8)}</code></td>
                    <td>{alert.rule_name}</td>
                    <td><span className={`badge ${getSeverityBadgeClass(alert.severity)}`}>{alert.severity}</span></td>
                    <td>{alert.component}</td>
                    <td><span className={`badge ${getStatusBadgeClass(alert.status)}`}>{alert.status}</span></td>
                    <td style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                      {new Date(alert.triggered_at || alert.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {alert.status === 'open' && (
                          <button className="btn btn-sm btn-warning" onClick={() => updateStatus(alert.alert_id, 'triaged')}>
                            Triage
                          </button>
                        )}
                        {alert.status !== 'resolved' && (
                          <button className="btn btn-sm btn-success" onClick={() => updateStatus(alert.alert_id, 'resolved')}>
                            Resolve
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
    </div>
  )
}
