import { useState, useEffect } from 'react'
import ActionHistoryTable from '../components/ActionHistoryTable'

interface AutoResponseConditions {
  min_severity: string
  require_enrichment: boolean
  max_executions_per_hour: number
}

interface AutoResponseConfig {
  enabled: boolean
  conditions: AutoResponseConditions
}

interface Rule {
  rule_id: string
  name: string
  description?: string
  severity: string
  technique_id: string
  technique_name?: string
  component?: string
  enabled: boolean
  conditions?: Record<string, unknown>
  response_actions?: string[]
  auto_response_config?: AutoResponseConfig
  log_sources?: string[]
  false_positive_notes?: string
}

interface ActionAuditEntry {
  audit_id: string
  alert_id: string
  rule_id: string
  action_name: string
  execution_type: string
  triggered_by: string
  status: string
  started_at: string
  completed_at?: string
  error?: string
}

export default function Rules() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ severity: '', enabled: '' })
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null)

  // Auto-response state
  const [autoResponseEnabled, setAutoResponseEnabled] = useState(false)
  const [minSeverity, setMinSeverity] = useState('high')
  const [requireEnrichment, setRequireEnrichment] = useState(false)
  const [maxExecutionsPerHour, setMaxExecutionsPerHour] = useState(10)
  const [savingAutoResponse, setSavingAutoResponse] = useState(false)
  const [ruleExecutionHistory, setRuleExecutionHistory] = useState<ActionAuditEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    fetchRules()
  }, [])

  useEffect(() => {
    if (selectedRule) {
      // Load auto-response config when rule is selected
      const config = selectedRule.auto_response_config
      if (config) {
        setAutoResponseEnabled(config.enabled)
        setMinSeverity(config.conditions.min_severity || 'high')
        setRequireEnrichment(config.conditions.require_enrichment || false)
        setMaxExecutionsPerHour(config.conditions.max_executions_per_hour || 10)
      } else {
        // Reset to defaults
        setAutoResponseEnabled(false)
        setMinSeverity('high')
        setRequireEnrichment(false)
        setMaxExecutionsPerHour(10)
      }

      // Fetch execution history for this rule
      fetchRuleExecutionHistory(selectedRule.rule_id)
    }
  }, [selectedRule])

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

  const fetchRuleExecutionHistory = async (ruleId: string) => {
    setLoadingHistory(true)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`/api/actions/rule/${ruleId}/history?execution_type=automated&limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setRuleExecutionHistory(await res.json())
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const saveAutoResponseConfig = async () => {
    if (!selectedRule) return

    setSavingAutoResponse(true)
    const token = localStorage.getItem('token')

    const config: AutoResponseConfig = {
      enabled: autoResponseEnabled,
      conditions: {
        min_severity: minSeverity,
        require_enrichment: requireEnrichment,
        max_executions_per_hour: maxExecutionsPerHour
      }
    }

    try {
      const res = await fetch(`/api/rules/${selectedRule.rule_id}/auto-response`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })

      if (res.ok) {
        // Refresh rules to get updated config
        await fetchRules()
        // Update selected rule
        const updatedRule = await res.json()
        setSelectedRule(updatedRule)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSavingAutoResponse(false)
    }
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
          zIndex: 1000,
          padding: '2rem'
        }} onClick={() => setSelectedRule(null)}>
          <div className="card" style={{
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>{selectedRule.name}</h3>
              <button className="btn btn-sm" onClick={() => setSelectedRule(null)}>✕</button>
            </div>

            {/* Rule Metadata */}
            <div style={{ marginBottom: '2rem', display: 'grid', gap: '1rem' }}>
              <div>
                <strong style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Description:</strong>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem' }}>{selectedRule.description || 'No description available'}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <strong style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>MITRE Technique:</strong>
                  <p style={{ margin: '0.25rem 0 0' }}>
                    <code>{selectedRule.technique_id}</code>
                    {selectedRule.technique_name && (
                      <span style={{ fontSize: '0.85rem', marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>
                        {selectedRule.technique_name}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Severity:</strong>
                  <p style={{ margin: '0.25rem 0 0' }}>
                    <span className={`badge ${getSeverityBadgeClass(selectedRule.severity)}`}>{selectedRule.severity}</span>
                  </p>
                </div>
              </div>

              {selectedRule.response_actions && selectedRule.response_actions.length > 0 && (
                <div>
                  <strong style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Configured Response Actions:</strong>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {selectedRule.response_actions.map(action => (
                      <span key={action} className="badge badge-primary">
                        {action.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedRule.log_sources && selectedRule.log_sources.length > 0 && (
                <div>
                  <strong style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Log Sources:</strong>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {selectedRule.log_sources.map(source => (
                      <span key={source} className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedRule.false_positive_notes && (
                <div>
                  <strong style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>False Positive Notes:</strong>
                  <p style={{
                    margin: '0.5rem 0 0',
                    fontSize: '0.8rem',
                    background: 'var(--bg-secondary)',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    borderLeft: '3px solid var(--accent-warning)'
                  }}>
                    {selectedRule.false_positive_notes}
                  </p>
                </div>
              )}
            </div>

            {/* Auto-Response Configuration */}
            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              marginBottom: '2rem',
            }}>
              <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Auto-Response Configuration</h4>

              {/* Enable/Disable Toggle */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                cursor: 'pointer',
                marginBottom: '1.5rem',
                padding: '0.75rem',
                background: autoResponseEnabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${autoResponseEnabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                borderRadius: '0.5rem',
              }}>
                <input
                  type="checkbox"
                  checked={autoResponseEnabled}
                  onChange={e => setAutoResponseEnabled(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    Enable Automated Response
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    {autoResponseEnabled
                      ? '✓ Response actions will execute automatically when conditions are met'
                      : '✕ Response actions must be triggered manually from the Alerts page'}
                  </div>
                </div>
              </label>

              {/* Conditions Panel */}
              {autoResponseEnabled && (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      Minimum Alert Severity
                    </label>
                    <select
                      className="form-control"
                      value={minSeverity}
                      onChange={e => setMinSeverity(e.target.value)}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                      Only alerts with severity ≥ {minSeverity} will trigger auto-response
                    </div>
                  </div>

                  <div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}>
                      <input
                        type="checkbox"
                        checked={requireEnrichment}
                        onChange={e => setRequireEnrichment(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Require Threat Intelligence Enrichment</span>
                    </label>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.25rem', marginLeft: '1.5rem' }}>
                      Only execute if alert has been enriched with external threat intelligence
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      Max Executions Per Hour
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={maxExecutionsPerHour}
                      onChange={e => setMaxExecutionsPerHour(parseInt(e.target.value) || 10)}
                      min="1"
                      max="100"
                    />
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                      Rate limit to prevent runaway automation (1-100)
                    </div>
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={saveAutoResponseConfig}
                    disabled={savingAutoResponse}
                    style={{ marginTop: '0.5rem' }}
                  >
                    {savingAutoResponse ? 'Saving...' : 'Save Auto-Response Settings'}
                  </button>
                </div>
              )}
            </div>

            {/* Execution History */}
            <div>
              <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Recent Automated Executions</h4>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="spinner" style={{ margin: '0 auto 0.5rem' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading execution history...</p>
                </div>
              ) : ruleExecutionHistory.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
                  No automated executions recorded for this rule
                </p>
              ) : (
                <ActionHistoryTable entries={ruleExecutionHistory} compact />
              )}
            </div>

            <div style={{ marginTop: '2rem', textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedRule(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
