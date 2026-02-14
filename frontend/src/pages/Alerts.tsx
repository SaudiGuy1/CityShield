import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import anime from 'animejs'
import EventDrillDown from '../components/EventDrillDown'

interface AlertAnalysis {
  alert_id: string
  technique_id: string
  technique_name: string
  tactic: string
  kill_chain_phase: string
  what_happened: string
  why_dangerous: string
  how_to_fix: string[]
  indicators: string
  severity_context: string
  evidence_summary?: string
  severity: string
  component: string
  city_zone: string
  status: string
  enrichment: Record<string, any>
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ severity: '', status: '' })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<AlertAnalysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [showEventDrillDown, setShowEventDrillDown] = useState(false)
  const [selectedAlertForEvents, setSelectedAlertForEvents] = useState<any>(null)
  const detailRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    // If navigated with ?alert=xxx, expand that alert
    const alertParam = searchParams.get('alert')
    if (alertParam) {
      setExpandedId(alertParam)
    }
  }, [searchParams])

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 5000)
    return () => clearInterval(interval)
  }, [filters])

  useEffect(() => {
    if (expandedId) {
      fetchAnalysis(expandedId)
    } else {
      setAnalysis(null)
    }
  }, [expandedId])

  useEffect(() => {
    if (detailRef.current && analysis) {
      anime({
        targets: detailRef.current,
        opacity: [0, 1],
        translateY: [-10, 0],
        duration: 300,
        easing: 'easeOutCubic'
      })
    }
  }, [analysis])

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

  const fetchAnalysis = async (alertId: string) => {
    setAnalysisLoading(true)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`/api/alerts/${alertId}/analysis`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setAnalysis(await res.json())
      }
    } catch (err) {
      console.error(err)
    } finally {
      setAnalysisLoading(false)
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
    if (expandedId === alertId) {
      fetchAnalysis(alertId)
    }
  }

  const viewOnMap = (alert: any) => {
    navigate(`/?highlight=${alert.city_zone}&alert=${alert.alert_id}`)
  }

  const viewRelatedEvents = (alert: any) => {
    setSelectedAlertForEvents(alert)
    setShowEventDrillDown(true)
  }

  const viewDevice = (assetId: string) => {
    navigate(`/devices?device=${assetId}`)
  }

  const viewInOpenSearch = (alert: any) => {
    // Build OpenSearch Dashboards URL with pre-filled query
    const triggeredAt = new Date(alert.triggered_at || alert.timestamp)
    const startTime = new Date(triggeredAt.getTime() - 5 * 60 * 1000) // 5 min before
    const endTime = new Date(triggeredAt.getTime() + 5 * 60 * 1000) // 5 min after

    // Build query filter based on alert context
    const filters = []
    if (alert.component) {
      filters.push(`component:${alert.component}`)
    }
    if (alert.city_zone) {
      filters.push(`city_zone:${alert.city_zone}`)
    }
    if (alert.asset_id) {
      filters.push(`asset_id:${alert.asset_id}`)
    }

    const queryString = filters.length > 0 ? filters.join(' AND ') : '*'

    // OpenSearch Dashboards Discover URL
    // Format: /app/discover#/?_g=(time:(from:START,to:END))&_a=(query:(query:'QUERY'))
    const from = startTime.toISOString()
    const to = endTime.toISOString()

    // Build OpenSearch Dashboards Discover URL using RISON format
    // RISON is used by OpenSearch Dashboards - don't encode the RISON syntax itself

    // Build global state - time range and filters
    const globalState = `(filters:!(),time:(from:'${from}',to:'${to}'))`

    // Build app state - index pattern, columns, and query
    // Only encode the query value, not the RISON structure
    const appState = `(columns:!('@timestamp',component,event_type,severity,message),index:'logs-*',interval:auto,query:(language:lucene,query:'${queryString}'))`

    // Full URL - do NOT use encodeURIComponent on the entire state objects
    const dashboardsUrl = `http://localhost:5601/app/discover#/?_g=${globalState}&_a=${appState}`

    window.open(dashboardsUrl, '_blank')
  }

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'critical': return 'badge-danger'
      case 'high': return 'badge-danger'
      case 'medium': return 'badge-warning'
      case 'low': return 'badge-success'
      default: return 'badge-info'
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'open': return 'badge-danger'
      case 'triaged': return 'badge-warning'
      case 'resolved': return 'badge-success'
      default: return 'badge-info'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return 'X'
      case 'high': return '!'
      case 'medium': return '~'
      case 'low': return '-'
      default: return '?'
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>Security Alerts</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Monitor, investigate, and remediate security threats</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span className="badge badge-danger" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
            {alerts.filter(a => a.status === 'open').length} Open
          </span>
          <span className="badge badge-warning" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
            {alerts.filter(a => a.severity === 'critical').length} Critical
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Filters</h3>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <label>Severity</label>
            <select value={filters.severity} onChange={e => setFilters({ ...filters, severity: e.target.value })}>
              <option value="">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label>Status</label>
            <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
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
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading alerts...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No alerts found</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {alerts.map(alert => {
            const isExpanded = expandedId === alert.alert_id
            return (
              <div key={alert.alert_id}>
                {/* Alert Row */}
                <div
                  className="card"
                  onClick={() => setExpandedId(isExpanded ? null : alert.alert_id)}
                  style={{
                    cursor: 'pointer',
                    padding: '1rem 1.25rem',
                    borderLeft: `4px solid ${alert.severity === 'critical' ? 'var(--accent-danger)' : alert.severity === 'high' ? '#f97316' : alert.severity === 'medium' ? 'var(--accent-warning)' : 'var(--accent-success)'}`,
                    background: isExpanded ? 'var(--bg-tertiary)' : 'var(--bg-card)',
                    transition: 'all 0.2s',
                    marginBottom: isExpanded ? 0 : undefined,
                    borderBottomLeftRadius: isExpanded ? 0 : undefined,
                    borderBottomRightRadius: isExpanded ? 0 : undefined,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Severity icon */}
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: alert.severity === 'critical' ? 'rgba(239,68,68,0.2)' : alert.severity === 'high' ? 'rgba(249,115,22,0.2)' : 'rgba(245,158,11,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: alert.severity === 'critical' ? 'var(--accent-danger)' : alert.severity === 'high' ? '#f97316' : 'var(--accent-warning)',
                      flexShrink: 0,
                    }}>
                      {getSeverityIcon(alert.severity)}
                    </div>

                    {/* Main info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          {alert.rule_name}
                        </span>
                        <span className={`badge ${getSeverityBadgeClass(alert.severity)}`} style={{ fontSize: '0.65rem' }}>
                          {alert.severity}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        <span>ID: {alert.alert_id.substring(0, 12)}</span>
                        <span>{alert.component?.replace('_', ' ')}</span>
                        <span>{alert.city_zone}</span>
                        <span>{new Date(alert.triggered_at || alert.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Status + Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <span className={`badge ${getStatusBadgeClass(alert.status)}`}>{alert.status}</span>
                      {alert.status === 'open' && (
                        <button className="btn btn-sm btn-warning" onClick={e => { e.stopPropagation(); updateStatus(alert.alert_id, 'triaged') }}>
                          Triage
                        </button>
                      )}
                      {alert.status !== 'resolved' && (
                        <button className="btn btn-sm btn-success" onClick={e => { e.stopPropagation(); updateStatus(alert.alert_id, 'resolved') }}>
                          Resolve
                        </button>
                      )}
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '1rem', marginLeft: '0.25rem' }}>
                        {isExpanded ? '\u25B2' : '\u25BC'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Analysis Panel */}
                {isExpanded && (
                  <div
                    ref={isExpanded ? detailRef : null}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderTop: 'none',
                      borderBottomLeftRadius: '1rem',
                      borderBottomRightRadius: '1rem',
                      padding: '1.5rem',
                    }}
                  >
                    {analysisLoading ? (
                      <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                        <p style={{ color: 'var(--text-secondary)' }}>Analyzing threat...</p>
                      </div>
                    ) : analysis ? (
                      <div style={{ display: 'grid', gap: '1.25rem' }}>
                        {/* MITRE ATT&CK Header */}
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                          <InfoChip label="MITRE ATT&CK" value={analysis.technique_id} color="var(--accent-danger)" />
                          <InfoChip label="Tactic" value={analysis.tactic} color="var(--accent-warning)" />
                          <InfoChip label="Kill Chain" value={analysis.kill_chain_phase} color="var(--accent-secondary)" />
                          <InfoChip label="Component" value={analysis.component.replace('_', ' ')} color="var(--accent-primary)" />
                          {alert.asset_id && (
                            <div
                              onClick={() => viewDevice(alert.asset_id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                background: 'rgba(99,102,241,0.15)',
                                border: '1px solid rgba(99,102,241,0.4)',
                                borderRadius: '0.375rem',
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.7rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.25)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}
                            >
                              <span style={{ color: 'var(--text-tertiary)' }}>Device:</span>
                              <span style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>{alert.asset_id}</span>
                            </div>
                          )}
                        </div>

                        {/* What Happened */}
                        <AnalysisSection
                          title="What Happened"
                          icon="?"
                          iconColor="var(--accent-primary)"
                          content={analysis.what_happened}
                        />

                        {/* Evidence Summary */}
                        {analysis.evidence_summary && (
                          <AnalysisSection
                            title="Evidence"
                            icon="E"
                            iconColor="var(--accent-secondary)"
                            content={analysis.evidence_summary}
                          />
                        )}

                        {/* Raw Evidence */}
                        {alert.evidence && Object.keys(alert.evidence).length > 0 && (
                          <div style={{
                            background: 'var(--bg-primary)',
                            borderRadius: '0.5rem',
                            padding: '0.75rem',
                            border: '1px solid var(--border-color)',
                          }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Raw Evidence
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.4rem' }}>
                              {Object.entries(alert.evidence).map(([key, val]) => (
                                <div key={key} style={{ fontSize: '0.75rem' }}>
                                  <span style={{ color: 'var(--text-tertiary)' }}>{key}: </span>
                                  <code style={{ color: 'var(--accent-primary)', fontSize: '0.7rem' }}>
                                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                  </code>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* OpenSearch Query Info */}
                        {alert.related_query && (
                          <div style={{
                            background: 'rgba(0, 94, 184, 0.1)',
                            border: '1px solid rgba(0, 94, 184, 0.3)',
                            borderRadius: '0.5rem',
                            padding: '0.75rem',
                          }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#005eb8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Detection Query
                            </div>
                            <code style={{ fontSize: '0.75rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                              {alert.related_query}
                            </code>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                              ℹ️ Click "View in OpenSearch" to see all matching events in a ±5 minute window
                            </div>
                          </div>
                        )}

                        {/* Why Dangerous */}
                        <AnalysisSection
                          title="Why This Is Dangerous"
                          icon="!"
                          iconColor="var(--accent-danger)"
                          content={analysis.why_dangerous}
                        />

                        {/* Severity Context */}
                        <div style={{
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: '0.5rem',
                          padding: '0.75rem',
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)',
                        }}>
                          <strong style={{ color: 'var(--accent-danger)' }}>Risk Assessment: </strong>
                          {analysis.severity_context}
                        </div>

                        {/* How to Fix */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <div style={{
                              width: 24, height: 24, borderRadius: '50%',
                              background: 'rgba(16,185,129,0.15)', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, fontSize: '0.7rem', color: 'var(--accent-success)',
                            }}>R</div>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                              Remediation Steps
                            </span>
                          </div>
                          <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {analysis.how_to_fix.map((step, i) => (
                              <div key={i} style={{
                                display: 'flex',
                                gap: '0.75rem',
                                alignItems: 'flex-start',
                                padding: '0.6rem 0.75rem',
                                background: 'var(--bg-card)',
                                borderRadius: '0.5rem',
                                border: '1px solid var(--border-color)',
                              }}>
                                <span style={{
                                  width: 22, height: 22, borderRadius: '50%',
                                  background: 'var(--accent-success)', color: 'white',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
                                }}>
                                  {i + 1}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                                  {step}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Indicators */}
                        <AnalysisSection
                          title="Indicators to Monitor"
                          icon="I"
                          iconColor="var(--accent-warning)"
                          content={analysis.indicators}
                        />

                        {/* Enrichment */}
                        {analysis.enrichment && Object.keys(analysis.enrichment).length > 0 && (
                          <div style={{
                            background: 'var(--bg-card)',
                            borderRadius: '0.5rem',
                            padding: '0.75rem',
                            border: '1px solid var(--border-color)',
                          }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Threat Intelligence
                            </div>
                            {Object.entries(analysis.enrichment).map(([key, val]) => (
                              <div key={key} style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                                <span style={{ color: 'var(--text-tertiary)' }}>{key}: </span>
                                <span style={{
                                  color: val === 'malicious' ? 'var(--accent-danger)' : val === 'suspicious' ? 'var(--accent-warning)' : 'var(--text-primary)',
                                  fontWeight: val === 'malicious' ? 600 : 400,
                                }}>
                                  {String(val)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                          <button className="btn btn-sm btn-primary" onClick={() => viewOnMap(alert)}>
                            View on Map
                          </button>
                          <button className="btn btn-sm btn-secondary" onClick={() => viewRelatedEvents(alert)}>
                            View Related Events
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#005eb8', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            onClick={() => viewInOpenSearch(alert)}
                            title="Open in OpenSearch Dashboards to investigate raw events"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="11" cy="11" r="8"></circle>
                              <path d="m21 21-4.35-4.35"></path>
                            </svg>
                            View in OpenSearch
                          </button>
                          {alert.asset_id && (
                            <button className="btn btn-sm" style={{ background: 'var(--accent-secondary)', color: 'white' }} onClick={() => viewDevice(alert.asset_id)}>
                              View Device
                            </button>
                          )}
                          {alert.status === 'open' && (
                            <button className="btn btn-sm btn-warning" onClick={() => updateStatus(alert.alert_id, 'triaged')}>
                              Mark as Triaged
                            </button>
                          )}
                          {alert.status !== 'resolved' && (
                            <button className="btn btn-sm btn-success" onClick={() => updateStatus(alert.alert_id, 'resolved')}>
                              Mark as Resolved
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-secondary)' }}>Unable to load analysis</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Event Drill-Down Panel */}
      {showEventDrillDown && selectedAlertForEvents && (
        <EventDrillDown
          alertId={selectedAlertForEvents.alert_id}
          alertTriggerTime={selectedAlertForEvents.triggered_at || selectedAlertForEvents.timestamp}
          onClose={() => {
            setShowEventDrillDown(false)
            setSelectedAlertForEvents(null)
          }}
        />
      )}
    </div>
  )
}

function AnalysisSection({ title, icon, iconColor, content }: {
  title: string; icon: string; iconColor: string; content: string
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: `${iconColor}22`, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '0.7rem', color: iconColor,
        }}>{icon}</div>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{title}</span>
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, paddingLeft: '2rem' }}>
        {content}
      </p>
    </div>
  )
}

function InfoChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.375rem',
      background: `${color}15`,
      border: `1px solid ${color}40`,
      borderRadius: '0.375rem',
      padding: '0.3rem 0.6rem',
      fontSize: '0.7rem',
    }}>
      <span style={{ color: 'var(--text-tertiary)' }}>{label}:</span>
      <span style={{ color, fontWeight: 600 }}>{value}</span>
    </div>
  )
}
