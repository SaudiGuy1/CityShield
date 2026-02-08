import { useState, useEffect } from 'react'

export default function Rules() {
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ severity: '', enabled: '' })
  const [selectedRule, setSelectedRule] = useState<any>(null)

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/rules', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setRules(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleRule = async (ruleId: string, currentState: boolean) => {
    const token = localStorage.getItem('token')
    await fetch(`/api/rules/${ruleId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ enabled: !currentState })
    })
    fetchRules()
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

  const filteredRules = rules.filter(rule => {
    if (filter.severity && rule.severity !== filter.severity) return false
    if (filter.enabled === 'true' && !rule.enabled) return false
    if (filter.enabled === 'false' && rule.enabled) return false
    return true
  })

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>Detection Rules</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage MITRE ATT&CK based detection rules</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Filters</h3>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <label className="form-label">Severity</label>
            <select className="form-control" value={filter.severity} onChange={e => setFilter({...filter, severity: e.target.value})}>
              <option value="">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="form-label">Status</label>
            <select className="form-control" value={filter.enabled} onChange={e => setFilter({...filter, enabled: e.target.value})}>
              <option value="">All Rules</option>
              <option value="true">Enabled Only</option>
              <option value="false">Disabled Only</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading rules...</p>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No rules found</p>
        </div>
      ) : (
        <div className="card">
          <h3>Active Rules ({filteredRules.length})</h3>
          <div className="table-responsive" style={{ marginTop: '1rem' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Rule Name</th>
                  <th>Severity</th>
                  <th>MITRE Technique</th>
                  <th>Component</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map(rule => (
                  <tr key={rule.rule_id}>
                    <td>
                      <div>
                        <strong>{rule.name}</strong>
                        {rule.description && (
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                            {rule.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td><span className={`badge ${getSeverityBadgeClass(rule.severity)}`}>{rule.severity}</span></td>
                    <td><code>{rule.technique_id}</code></td>
                    <td>{rule.component || 'All'}</td>
                    <td>
                      {rule.enabled ? (
                        <span className="badge badge-success">Enabled</span>
                      ) : (
                        <span className="badge badge-secondary">Disabled</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className={`btn btn-sm ${rule.enabled ? 'btn-danger' : 'btn-success'}`}
                          onClick={() => toggleRule(rule.rule_id, rule.enabled)}
                        >
                          {rule.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setSelectedRule(rule)}
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedRule && (
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
        }} onClick={() => setSelectedRule(null)}>
          <div className="card" style={{
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <h3>{selectedRule.name}</h3>
            <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }}>
              <div>
                <strong style={{ color: 'var(--text-secondary)' }}>Description:</strong>
                <p>{selectedRule.description || 'No description available'}</p>
              </div>
              <div>
                <strong style={{ color: 'var(--text-secondary)' }}>MITRE Technique:</strong>
                <p><code>{selectedRule.technique_id}</code></p>
              </div>
              <div>
                <strong style={{ color: 'var(--text-secondary)' }}>Severity:</strong>
                <p><span className={`badge ${getSeverityBadgeClass(selectedRule.severity)}`}>{selectedRule.severity}</span></p>
              </div>
              <div>
                <strong style={{ color: 'var(--text-secondary)' }}>Component:</strong>
                <p>{selectedRule.component || 'All Components'}</p>
              </div>
              {selectedRule.conditions && (
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Detection Conditions:</strong>
                  <pre style={{
                    background: 'var(--bg-tertiary)',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    overflow: 'auto',
                    fontSize: '0.875rem'
                  }}>
                    {JSON.stringify(selectedRule.conditions, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => setSelectedRule(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
