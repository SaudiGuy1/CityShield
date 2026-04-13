import { useState, useEffect, useMemo } from 'react'
import ActionHistoryTable from '../components/ActionHistoryTable'

interface AutoResponseConditions {
  min_severity: string
  require_enrichment: boolean
  max_executions_per_hour: number
  cooldown_minutes: number
  time_window_minutes: number
  notify_on_execution: boolean
  require_confirmation: boolean
  allowed_actions: string[] | null
  whitelisted_subnets: string[]
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

const ALL_RESPONSE_ACTIONS = [
  { name: 'block_ip', label: 'Block IP', description: 'Block malicious IP at firewall', category: 'network' },
  { name: 'isolate_service', label: 'Isolate Service', description: 'Isolate compromised service', category: 'network' },
  { name: 'revoke_token', label: 'Revoke Token', description: 'Revoke authentication token', category: 'identity' },
  { name: 'quarantine_host', label: 'Quarantine Host', description: 'Quarantine compromised host', category: 'network' },
  { name: 'disable_account', label: 'Disable Account', description: 'Disable compromised account', category: 'identity' },
  { name: 'rate_limit', label: 'Rate Limit', description: 'Apply rate limiting to source', category: 'network' },
  { name: 'snapshot_forensics', label: 'Forensic Snapshot', description: 'Capture system snapshot for analysis', category: 'forensics' },
  { name: 'kill_process', label: 'Kill Process', description: 'Terminate malicious process', category: 'endpoint' },
  { name: 'reset_credentials', label: 'Reset Credentials', description: 'Force password reset', category: 'identity' },
  { name: 'notify_soc', label: 'Notify SOC', description: 'Send SOC team notification', category: 'notification' },
  { name: 'escalate_incident', label: 'Escalate Incident', description: 'Escalate to incident response', category: 'notification' },
  { name: 'network_segmentation', label: 'Network Segmentation', description: 'Apply micro-segmentation rules', category: 'network' },
]

const MITRE_TACTICS = [
  'Reconnaissance', 'Initial Access', 'Execution', 'Persistence',
  'Privilege Escalation', 'Defense Evasion', 'Credential Access',
  'Discovery', 'Lateral Movement', 'Collection',
  'Command and Control', 'Exfiltration', 'Impact',
]

const PRESET_SUBNETS = [
  { cidr: '172.22.0.0/16', label: 'CityShield Main Network', description: 'Main platform services network' },
  { cidr: '172.20.0.0/16', label: 'Cyber Range Network', description: 'Penetration testing / training range' },
  { cidr: '172.21.0.0/16', label: 'IoT Range Network', description: 'IoT research & testing range' },
  { cidr: '10.0.0.0/8', label: 'Internal (10.x)', description: 'Private class A network' },
  { cidr: '192.168.0.0/16', label: 'Internal (192.168.x)', description: 'Private class C network' },
]

const TACTIC_FROM_TECHNIQUE: Record<string, string> = {
  T1595: 'Reconnaissance', T1592: 'Reconnaissance', T1589: 'Reconnaissance', T1590: 'Reconnaissance',
  T1190: 'Initial Access', T1133: 'Initial Access', T1078: 'Initial Access', T1189: 'Initial Access',
  T1195: 'Initial Access', T1199: 'Initial Access', T1566: 'Initial Access',
  'T1566.001': 'Initial Access', 'T1566.002': 'Initial Access',
  T1059: 'Execution', 'T1059.001': 'Execution', 'T1059.003': 'Execution', 'T1059.009': 'Execution',
  T1053: 'Execution', 'T1053.005': 'Execution', T1569: 'Execution', 'T1569.002': 'Execution',
  T1547: 'Persistence', 'T1547.001': 'Persistence', T1543: 'Persistence', 'T1543.003': 'Persistence',
  T1136: 'Persistence', 'T1136.001': 'Persistence', T1098: 'Persistence',
  T1548: 'Privilege Escalation', T1068: 'Privilege Escalation',
  T1055: 'Privilege Escalation', 'T1055.001': 'Privilege Escalation',
  T1134: 'Defense Evasion', T1562: 'Defense Evasion', 'T1562.001': 'Defense Evasion',
  T1027: 'Defense Evasion', T1070: 'Defense Evasion', 'T1070.001': 'Defense Evasion',
  'T1574.002': 'Defense Evasion', T1014: 'Defense Evasion',
  T1110: 'Credential Access', T1003: 'Credential Access', T1040: 'Credential Access',
  'T1550.002': 'Credential Access', 'T1558.003': 'Credential Access',
  T1557: 'Credential Access', 'T1556.006': 'Credential Access',
  T1046: 'Discovery', T1082: 'Discovery', T1083: 'Discovery', T1135: 'Discovery',
  T1021: 'Lateral Movement', T1570: 'Lateral Movement', T1210: 'Lateral Movement', 'T1563.001': 'Lateral Movement',
  T1056: 'Collection', T1113: 'Collection', T1115: 'Collection', T1119: 'Collection',
  T1560: 'Collection', 'T1560.001': 'Collection',
  T1071: 'Command and Control', T1105: 'Command and Control', T1572: 'Command and Control', T1205: 'Command and Control',
  T1041: 'Exfiltration',
  T1498: 'Impact', T1499: 'Impact', T1486: 'Impact', T1565: 'Impact',
  T1485: 'Impact', T1491: 'Impact', T1496: 'Impact', T1529: 'Impact', T1495: 'Impact',
}

function getTacticForRule(rule: Rule): string {
  return TACTIC_FROM_TECHNIQUE[rule.technique_id] || 'Unknown'
}

export default function Rules() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ severity: '', enabled: '', tactic: '', search: '' })
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null)

  // Auto-response state
  const [autoResponseEnabled, setAutoResponseEnabled] = useState(false)
  const [minSeverity, setMinSeverity] = useState('high')
  const [requireEnrichment, setRequireEnrichment] = useState(false)
  const [maxExecutionsPerHour, setMaxExecutionsPerHour] = useState(10)
  const [cooldownMinutes, setCooldownMinutes] = useState(5)
  const [timeWindowMinutes, setTimeWindowMinutes] = useState(60)
  const [notifyOnExecution, setNotifyOnExecution] = useState(true)
  const [requireConfirmation, setRequireConfirmation] = useState(false)
  const [allowedActions, setAllowedActions] = useState<string[] | null>(null)
  const [whitelistedSubnets, setWhitelistedSubnets] = useState<string[]>([])
  const [customSubnet, setCustomSubnet] = useState('')
  const [savingAutoResponse, setSavingAutoResponse] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [ruleExecutionHistory, setRuleExecutionHistory] = useState<ActionAuditEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Response actions editing
  const [editingActions, setEditingActions] = useState(false)
  const [pendingActions, setPendingActions] = useState<string[]>([])
  const [savingActions, setSavingActions] = useState(false)

  // Active tab in detail modal
  const [detailTab, setDetailTab] = useState<'info' | 'auto-response' | 'actions' | 'history'>('info')

  useEffect(() => {
    fetchRules()
  }, [])

  useEffect(() => {
    if (selectedRule) {
      const config = selectedRule.auto_response_config
      if (config) {
        setAutoResponseEnabled(config.enabled)
        setMinSeverity(config.conditions.min_severity || 'high')
        setRequireEnrichment(config.conditions.require_enrichment || false)
        setMaxExecutionsPerHour(config.conditions.max_executions_per_hour || 10)
        setCooldownMinutes(config.conditions.cooldown_minutes ?? 5)
        setTimeWindowMinutes(config.conditions.time_window_minutes ?? 60)
        setNotifyOnExecution(config.conditions.notify_on_execution ?? true)
        setRequireConfirmation(config.conditions.require_confirmation ?? false)
        setAllowedActions(config.conditions.allowed_actions ?? null)
        setWhitelistedSubnets(config.conditions.whitelisted_subnets ?? [])
      } else {
        setAutoResponseEnabled(false)
        setMinSeverity('high')
        setRequireEnrichment(false)
        setMaxExecutionsPerHour(10)
        setCooldownMinutes(5)
        setTimeWindowMinutes(60)
        setNotifyOnExecution(true)
        setRequireConfirmation(false)
        setAllowedActions(null)
        setWhitelistedSubnets([])
      }
      setCustomSubnet('')
      setPendingActions(selectedRule.response_actions || [])
      setEditingActions(false)
      setSaveMessage(null)
      setDetailTab('info')
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
    setSaveMessage(null)
    const token = localStorage.getItem('token')

    const config: AutoResponseConfig = {
      enabled: autoResponseEnabled,
      conditions: {
        min_severity: minSeverity,
        require_enrichment: requireEnrichment,
        max_executions_per_hour: maxExecutionsPerHour,
        cooldown_minutes: cooldownMinutes,
        time_window_minutes: timeWindowMinutes,
        notify_on_execution: notifyOnExecution,
        require_confirmation: requireConfirmation,
        allowed_actions: allowedActions,
        whitelisted_subnets: whitelistedSubnets,
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
        const updatedRule = await res.json()
        setSelectedRule(updatedRule)
        await fetchRules()
        setSaveMessage({ type: 'success', text: 'Auto-response configuration saved successfully' })
      } else {
        const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
        setSaveMessage({ type: 'error', text: err.detail || 'Failed to save configuration' })
      }
    } catch (err) {
      console.error(err)
      setSaveMessage({ type: 'error', text: 'Network error — could not save configuration' })
    } finally {
      setSavingAutoResponse(false)
    }
  }

  const saveResponseActions = async () => {
    if (!selectedRule) return

    setSavingActions(true)
    setSaveMessage(null)
    const token = localStorage.getItem('token')

    try {
      const res = await fetch(`/api/rules/${selectedRule.rule_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ response_actions: pendingActions })
      })

      if (res.ok) {
        const updatedRule = await res.json()
        setSelectedRule(updatedRule)
        await fetchRules()
        setEditingActions(false)
        setSaveMessage({ type: 'success', text: 'Response actions updated successfully' })
      } else {
        const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
        setSaveMessage({ type: 'error', text: err.detail || 'Failed to update response actions' })
      }
    } catch (err) {
      console.error(err)
      setSaveMessage({ type: 'error', text: 'Network error — could not update response actions' })
    } finally {
      setSavingActions(false)
    }
  }

  const togglePendingAction = (action: string) => {
    setPendingActions(prev =>
      prev.includes(action) ? prev.filter(a => a !== action) : [...prev, action]
    )
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

  const getTacticColor = (tactic: string) => {
    const colors: Record<string, string> = {
      'Reconnaissance': '#6366f1',
      'Initial Access': '#ef4444',
      'Execution': '#f97316',
      'Persistence': '#eab308',
      'Privilege Escalation': '#84cc16',
      'Defense Evasion': '#22c55e',
      'Credential Access': '#14b8a6',
      'Discovery': '#06b6d4',
      'Lateral Movement': '#3b82f6',
      'Collection': '#8b5cf6',
      'Command and Control': '#d946ef',
      'Exfiltration': '#ec4899',
      'Impact': '#f43f5e',
    }
    return colors[tactic] || '#6b7280'
  }

  const filteredRules = useMemo(() => {
    return rules.filter(rule => {
      if (filter.severity && rule.severity !== filter.severity) return false
      if (filter.enabled === 'true' && !rule.enabled) return false
      if (filter.enabled === 'false' && rule.enabled) return false
      if (filter.tactic && getTacticForRule(rule) !== filter.tactic) return false
      if (filter.search) {
        const s = filter.search.toLowerCase()
        const match = rule.name.toLowerCase().includes(s) ||
          rule.technique_id.toLowerCase().includes(s) ||
          (rule.technique_name || '').toLowerCase().includes(s) ||
          (rule.description || '').toLowerCase().includes(s)
        if (!match) return false
      }
      return true
    })
  }, [rules, filter])

  // Group rules by tactic for summary
  const tacticSummary = useMemo(() => {
    const summary: Record<string, { total: number; enabled: number }> = {}
    for (const rule of rules) {
      const tactic = getTacticForRule(rule)
      if (!summary[tactic]) summary[tactic] = { total: 0, enabled: 0 }
      summary[tactic].total++
      if (rule.enabled) summary[tactic].enabled++
    }
    return summary
  }, [rules])

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>Detection Rules</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            MITRE ATT&CK aligned detection rules — {rules.length} rules across {Object.keys(tacticSummary).length} tactics
          </p>
        </div>
      </div>

      {/* MITRE Tactic Coverage Bar */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>MITRE ATT&CK Coverage</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {MITRE_TACTICS.map(tactic => {
            const data = tacticSummary[tactic]
            const isActive = filter.tactic === tactic
            return (
              <button
                key={tactic}
                onClick={() => setFilter(f => ({ ...f, tactic: f.tactic === tactic ? '' : tactic }))}
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: isActive ? `${getTacticColor(tactic)}20` : 'var(--bg-secondary)',
                  border: `1px solid ${isActive ? getTacticColor(tactic) : 'var(--border-color)'}`,
                  borderRadius: '0.5rem',
                  color: isActive ? getTacticColor(tactic) : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: data ? getTacticColor(tactic) : 'var(--text-tertiary)',
                  opacity: data ? 1 : 0.3,
                }} />
                {tactic}
                {data && (
                  <span style={{
                    fontSize: '0.65rem',
                    background: 'rgba(255,255,255,0.08)',
                    padding: '0.1rem 0.35rem',
                    borderRadius: '0.25rem',
                  }}>
                    {data.enabled}/{data.total}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Filters</h3>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label className="form-label">Search</label>
            <input
              type="text"
              className="form-control"
              placeholder="Rule name, technique ID..."
              value={filter.search}
              onChange={e => setFilter({...filter, search: e.target.value})}
            />
          </div>
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
          {(filter.severity || filter.enabled || filter.tactic || filter.search) && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setFilter({ severity: '', enabled: '', tactic: '', search: '' })}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Rules Table */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading rules...</p>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No rules found matching filters</p>
        </div>
      ) : (
        <div className="card">
          <h3>Rules ({filteredRules.length}{filteredRules.length !== rules.length ? ` of ${rules.length}` : ''})</h3>
          <div className="table-responsive" style={{ marginTop: '1rem' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Rule Name</th>
                  <th>Severity</th>
                  <th>MITRE Technique</th>
                  <th>Tactic</th>
                  <th>Auto-Response</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map(rule => {
                  const tactic = getTacticForRule(rule)
                  return (
                    <tr key={rule.rule_id}>
                      <td>
                        <div>
                          <strong>{rule.name}</strong>
                          {rule.description && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '0.2rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {rule.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td><span className={`badge ${getSeverityBadgeClass(rule.severity)}`}>{rule.severity}</span></td>
                      <td><code style={{ fontSize: '0.8rem' }}>{rule.technique_id}</code></td>
                      <td>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '0.25rem',
                          background: `${getTacticColor(tactic)}15`,
                          color: getTacticColor(tactic),
                          border: `1px solid ${getTacticColor(tactic)}30`,
                          whiteSpace: 'nowrap',
                        }}>
                          {tactic}
                        </span>
                      </td>
                      <td>
                        {rule.auto_response_config?.enabled ? (
                          <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Active</span>
                        ) : (
                          <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>Off</span>
                        )}
                      </td>
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
                            Configure
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRule && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: '2rem',
        }} onClick={() => setSelectedRule(null)}>
          <div className="card" style={{
            maxWidth: '960px', width: '100%', maxHeight: '92vh', overflow: 'auto',
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>{selectedRule.name}</h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                  <code style={{ fontSize: '0.8rem' }}>{selectedRule.technique_id}</code>
                  <span className={`badge ${getSeverityBadgeClass(selectedRule.severity)}`}>{selectedRule.severity}</span>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '0.25rem',
                    background: `${getTacticColor(getTacticForRule(selectedRule))}15`,
                    color: getTacticColor(getTacticForRule(selectedRule)),
                    border: `1px solid ${getTacticColor(getTacticForRule(selectedRule))}30`,
                  }}>
                    {getTacticForRule(selectedRule)}
                  </span>
                </div>
              </div>
              <button className="btn btn-sm" onClick={() => setSelectedRule(null)}>✕</button>
            </div>

            {/* Save Message */}
            {saveMessage && (
              <div style={{
                padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem',
                background: saveMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${saveMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: saveMessage.type === 'success' ? 'var(--accent-success)' : 'var(--accent-danger)',
                fontSize: '0.85rem',
              }}>
                {saveMessage.text}
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
              {(['info', 'auto-response', 'actions', 'history'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setDetailTab(tab)}
                  style={{
                    padding: '0.6rem 1.2rem', fontSize: '0.85rem', fontWeight: 600,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: detailTab === tab ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    borderBottom: detailTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    transition: 'all 0.2s', textTransform: 'capitalize',
                  }}
                >
                  {tab === 'auto-response' ? 'Auto-Response' : tab === 'actions' ? 'Response Actions' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab: Info */}
            {detailTab === 'info' && (
              <div style={{ display: 'grid', gap: '1rem' }}>
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
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {selectedRule.response_actions.map(action => (
                        <span key={action} className="badge badge-primary">{action.replace(/_/g, ' ')}</span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedRule.log_sources && selectedRule.log_sources.length > 0 && (
                  <div>
                    <strong style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Log Sources:</strong>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {selectedRule.log_sources.map(source => (
                        <span key={source} className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>{source}</span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedRule.false_positive_notes && (
                  <div>
                    <strong style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>False Positive Notes:</strong>
                    <p style={{
                      margin: '0.5rem 0 0', fontSize: '0.8rem', background: 'var(--bg-secondary)',
                      padding: '0.75rem', borderRadius: '0.5rem', borderLeft: '3px solid var(--accent-warning)',
                    }}>
                      {selectedRule.false_positive_notes}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Auto-Response */}
            {detailTab === 'auto-response' && (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: '0.5rem', padding: '1.5rem' }}>
                {/* Enable/Disable Toggle */}
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
                  marginBottom: '1.5rem', padding: '0.75rem',
                  background: autoResponseEnabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${autoResponseEnabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  borderRadius: '0.5rem',
                }}>
                  <input type="checkbox" checked={autoResponseEnabled} onChange={e => setAutoResponseEnabled(e.target.checked)} style={{ cursor: 'pointer' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Enable Automated Response</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      {autoResponseEnabled
                        ? 'Response actions will execute automatically when conditions are met'
                        : 'Response actions must be triggered manually from the Alerts page'}
                    </div>
                  </div>
                </label>

                {/* Conditions */}
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {/* Row 1: Severity + Rate Limit */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                        Minimum Alert Severity
                      </label>
                      <select className="form-control" value={minSeverity} onChange={e => setMinSeverity(e.target.value)} disabled={!autoResponseEnabled}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                        Only alerts ≥ {minSeverity} severity trigger auto-response
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                        Max Executions Per Hour
                      </label>
                      <input
                        type="number" className="form-control" value={maxExecutionsPerHour}
                        onChange={e => setMaxExecutionsPerHour(parseInt(e.target.value) || 10)}
                        min="1" max="100" disabled={!autoResponseEnabled}
                      />
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                        Rate limit to prevent runaway automation
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Cooldown + Time Window */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                        Cooldown Period (minutes)
                      </label>
                      <input
                        type="number" className="form-control" value={cooldownMinutes}
                        onChange={e => setCooldownMinutes(parseInt(e.target.value) || 5)}
                        min="0" max="1440" disabled={!autoResponseEnabled}
                      />
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                        Minimum wait between responses for same alert source
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                        Rate Limit Window (minutes)
                      </label>
                      <input
                        type="number" className="form-control" value={timeWindowMinutes}
                        onChange={e => setTimeWindowMinutes(parseInt(e.target.value) || 60)}
                        min="5" max="1440" disabled={!autoResponseEnabled}
                      />
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                        Time window for counting max executions
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Checkboxes */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input type="checkbox" checked={requireEnrichment} onChange={e => setRequireEnrichment(e.target.checked)} disabled={!autoResponseEnabled} style={{ cursor: 'pointer' }} />
                      <div>
                        <span style={{ fontWeight: 500 }}>Require Threat Intelligence</span>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Only execute if alert has enrichment data</div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input type="checkbox" checked={notifyOnExecution} onChange={e => setNotifyOnExecution(e.target.checked)} disabled={!autoResponseEnabled} style={{ cursor: 'pointer' }} />
                      <div>
                        <span style={{ fontWeight: 500 }}>Notify SOC on Execution</span>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Send notification when auto-response triggers</div>
                      </div>
                    </label>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={requireConfirmation} onChange={e => setRequireConfirmation(e.target.checked)} disabled={!autoResponseEnabled} style={{ cursor: 'pointer' }} />
                    <div>
                      <span style={{ fontWeight: 500 }}>Require Human Confirmation</span>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Queue actions for analyst approval before execution</div>
                    </div>
                  </label>

                  {/* Allowed Actions Filter */}
                  {autoResponseEnabled && (
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                        <input
                          type="checkbox"
                          checked={allowedActions !== null}
                          onChange={e => setAllowedActions(e.target.checked ? (selectedRule.response_actions || []) : null)}
                          style={{ cursor: 'pointer' }}
                        />
                        <div>
                          <span style={{ fontWeight: 500 }}>Restrict Auto-Execute Actions</span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Only allow specific actions to run automatically</div>
                        </div>
                      </label>
                      {allowedActions !== null && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginLeft: '1.5rem' }}>
                          {(selectedRule.response_actions || []).map(action => {
                            const selected = allowedActions.includes(action)
                            return (
                              <button
                                key={action}
                                onClick={() => {
                                  setAllowedActions(prev =>
                                    prev!.includes(action) ? prev!.filter(a => a !== action) : [...prev!, action]
                                  )
                                }}
                                style={{
                                  padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '0.375rem',
                                  background: selected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                  border: `1px solid ${selected ? 'rgba(59, 130, 246, 0.4)' : 'var(--border-color)'}`,
                                  color: selected ? '#3b82f6' : 'var(--text-tertiary)', cursor: 'pointer',
                                }}
                              >
                                {action.replace(/_/g, ' ')}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Whitelisted Subnets */}
                  <div style={{
                    background: 'var(--bg-primary)', borderRadius: '0.5rem', padding: '1rem',
                    border: '1px solid var(--border-color)',
                  }}>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Whitelisted Subnets</span>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                        Alerts from these subnets will be auto-resolved instead of triggering response actions (e.g. researcher or training ranges)
                      </div>
                    </div>

                    {/* Preset subnet buttons */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                      {PRESET_SUBNETS.map(preset => {
                        const active = whitelistedSubnets.includes(preset.cidr)
                        return (
                          <button
                            key={preset.cidr}
                            disabled={!autoResponseEnabled}
                            onClick={() => {
                              setWhitelistedSubnets(prev =>
                                active ? prev.filter(s => s !== preset.cidr) : [...prev, preset.cidr]
                              )
                            }}
                            title={`${preset.cidr} — ${preset.description}`}
                            style={{
                              padding: '0.35rem 0.7rem', fontSize: '0.75rem', borderRadius: '0.375rem',
                              background: active ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                              border: `1px solid ${active ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-color)'}`,
                              color: active ? '#10b981' : 'var(--text-tertiary)',
                              cursor: autoResponseEnabled ? 'pointer' : 'not-allowed',
                              opacity: autoResponseEnabled ? 1 : 0.5,
                              transition: 'all 0.2s',
                            }}
                          >
                            {active ? '\u2713 ' : ''}{preset.label}
                            <span style={{ fontSize: '0.65rem', opacity: 0.7, marginLeft: '0.3rem' }}>
                              ({preset.cidr})
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Custom subnet / IP input */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="IP or CIDR (e.g. 10.0.3.99 or 10.50.0.0/24)"
                        value={customSubnet}
                        onChange={e => setCustomSubnet(e.target.value)}
                        disabled={!autoResponseEnabled}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && customSubnet.trim()) {
                            e.preventDefault()
                            let entry = customSubnet.trim()
                            // Auto-append /32 for bare IPs so the backend treats it as a single-host subnet
                            if (entry && !entry.includes('/')) entry += '/32'
                            if (!whitelistedSubnets.includes(entry)) {
                              setWhitelistedSubnets(prev => [...prev, entry])
                            }
                            setCustomSubnet('')
                          }
                        }}
                        style={{ flex: 1, fontSize: '0.85rem' }}
                      />
                      <button
                        className="btn btn-sm btn-secondary"
                        disabled={!autoResponseEnabled || !customSubnet.trim()}
                        onClick={() => {
                          let entry = customSubnet.trim()
                          if (entry && !entry.includes('/')) entry += '/32'
                          if (entry && !whitelistedSubnets.includes(entry)) {
                            setWhitelistedSubnets(prev => [...prev, entry])
                          }
                          setCustomSubnet('')
                        }}
                      >
                        Add
                      </button>
                    </div>

                    {/* Active whitelist display */}
                    {whitelistedSubnets.length > 0 && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 500 }}>
                          Active whitelist ({whitelistedSubnets.length} subnet{whitelistedSubnets.length !== 1 ? 's' : ''}):
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {whitelistedSubnets.map(cidr => {
                            const preset = PRESET_SUBNETS.find(p => p.cidr === cidr)
                            return (
                              <span key={cidr} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.25rem 0.6rem', fontSize: '0.75rem', borderRadius: '0.375rem',
                                background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)',
                                color: '#10b981',
                              }}>
                                <code style={{ fontSize: '0.7rem' }}>{cidr}</code>
                                {preset && <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>({preset.label})</span>}
                                <button
                                  onClick={() => setWhitelistedSubnets(prev => prev.filter(s => s !== cidr))}
                                  disabled={!autoResponseEnabled}
                                  style={{
                                    background: 'none', border: 'none', color: '#10b981', cursor: 'pointer',
                                    padding: '0 0.15rem', fontSize: '0.85rem', lineHeight: 1, opacity: 0.7,
                                  }}
                                  title="Remove"
                                >\u00d7</button>
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Save Button — ALWAYS visible */}
                  <button
                    className="btn btn-primary"
                    onClick={saveAutoResponseConfig}
                    disabled={savingAutoResponse}
                    style={{ marginTop: '0.5rem' }}
                  >
                    {savingAutoResponse ? 'Saving...' : 'Save Auto-Response Settings'}
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Response Actions */}
            {detailTab === 'actions' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                    Configure which response actions are available for this rule
                  </p>
                  {!editingActions ? (
                    <button className="btn btn-sm btn-primary" onClick={() => setEditingActions(true)}>
                      Edit Actions
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-sm btn-primary" onClick={saveResponseActions} disabled={savingActions}>
                        {savingActions ? 'Saving...' : 'Save'}
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => { setEditingActions(false); setPendingActions(selectedRule.response_actions || []) }}>
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Action categories */}
                {['network', 'identity', 'endpoint', 'forensics', 'notification'].map(category => {
                  const actions = ALL_RESPONSE_ACTIONS.filter(a => a.category === category)
                  return (
                    <div key={category} style={{ marginBottom: '1.25rem' }}>
                      <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>
                        {category}
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.5rem' }}>
                        {actions.map(action => {
                          const isActive = editingActions ? pendingActions.includes(action.name) : (selectedRule.response_actions || []).includes(action.name)
                          return (
                            <div
                              key={action.name}
                              onClick={() => editingActions && togglePendingAction(action.name)}
                              style={{
                                padding: '0.6rem 0.75rem', borderRadius: '0.5rem',
                                background: isActive ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-secondary)',
                                border: `1px solid ${isActive ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-color)'}`,
                                cursor: editingActions ? 'pointer' : 'default',
                                opacity: editingActions ? 1 : (isActive ? 1 : 0.5),
                                transition: 'all 0.2s',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {editingActions && (
                                  <input type="checkbox" checked={isActive} readOnly style={{ pointerEvents: 'none' }} />
                                )}
                                <div>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                    {action.label}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{action.description}</div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Tab: History */}
            {detailTab === 'history' && (
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
            )}

            <div style={{ marginTop: '2rem', textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedRule(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
