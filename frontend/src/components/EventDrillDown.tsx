import { useState, useEffect, useRef } from 'react'
import anime from 'animejs'
import { formatDateTimeWithSeconds } from '../utils/datetime'

interface Event {
  '@timestamp': string
  event_type: string
  severity?: string
  message?: string
  src_ip?: string
  dst_ip?: string
  component?: string
  asset_id?: string
  [key: string]: any
}

interface EventDrillDownProps {
  alertId: string
  alertTriggerTime: string
  onClose: () => void
}

export default function EventDrillDown({ alertId, alertTriggerTime, onClose }: EventDrillDownProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedEventIdx, setExpandedEventIdx] = useState<number | null>(null)
  const [filters, setFilters] = useState({ eventType: '', severity: '' })
  const [metadata, setMetadata] = useState<any>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Slide-in animation
    if (panelRef.current) {
      anime({
        targets: panelRef.current,
        translateX: ['100%', '0%'],
        duration: 400,
        easing: 'easeOutCubic'
      })
    }
  }, [])

  useEffect(() => {
    fetchReplayEvents()
  }, [alertId])

  const fetchReplayEvents = async () => {
    setLoading(true)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`/api/alerts/${alertId}/replay-events`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        console.log('Replay events response:', {
          eventCount: data.event_count,
          metadataKeys: Object.keys(data.metadata || {})
        })
        setEvents(data.events || [])
        setMetadata(data.metadata || {})
      } else {
        console.error('Failed to fetch replay events:', res.status, res.statusText)
      }
    } catch (err) {
      console.error('Failed to fetch replay events:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    // Slide-out animation
    if (panelRef.current) {
      anime({
        targets: panelRef.current,
        translateX: ['0%', '100%'],
        duration: 300,
        easing: 'easeInCubic',
        complete: onClose
      })
    } else {
      onClose()
    }
  }

  const filteredEvents = events.filter(event => {
    if (filters.eventType && event.event_type !== filters.eventType) return false
    if (filters.severity && event.severity !== filters.severity) return false
    return true
  })

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'var(--accent-danger)'
      case 'high': return '#f97316'
      case 'medium': return 'var(--accent-warning)'
      case 'low': return 'var(--accent-success)'
      default: return 'var(--accent-secondary)'
    }
  }

  const getSeverityBg = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'rgba(239,68,68,0.15)'
      case 'high': return 'rgba(249,115,22,0.15)'
      case 'medium': return 'rgba(245,158,11,0.15)'
      case 'low': return 'rgba(16,185,129,0.15)'
      default: return 'rgba(99,102,241,0.1)'
    }
  }

  const isAlertTriggerTime = (eventTime: string) => {
    const eventDate = new Date(eventTime).getTime()
    const alertDate = new Date(alertTriggerTime).getTime()
    // Consider events within 5 seconds of alert trigger
    return Math.abs(eventDate - alertDate) < 5000
  }

  const uniqueEventTypes = metadata?.event_types ? Object.keys(metadata.event_types) : []

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={handleClose}
    >
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '60%',
          minWidth: '600px',
          background: 'var(--bg-primary)',
          height: '100vh',
          overflowY: 'auto',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ padding: '2rem' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ margin: 0, marginBottom: '0.25rem' }}>Related Events</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Events in ±2.5 minute window around alert trigger
              </p>
            </div>
            <button
              className="btn btn-sm"
              onClick={handleClose}
              style={{ padding: '0.5rem 1rem' }}
            >
              Close
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Loading events...</p>
            </div>
          ) : (
            <>
              {/* Metadata Summary */}
              {metadata && (
                <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                        Total Events
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {events.length}
                      </div>
                    </div>
                    {metadata.unique_sources && metadata.unique_sources.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                          Unique Sources
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-warning)' }}>
                          {metadata.unique_sources.length}
                        </div>
                      </div>
                    )}
                    {metadata.unique_assets && metadata.unique_assets.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                          Unique Assets
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          {metadata.unique_assets.length}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Event Type Breakdown */}
                  {metadata.event_types && Object.keys(metadata.event_types).length > 0 && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                        Event Types
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {Object.entries(metadata.event_types).map(([type, count]) => (
                          <span
                            key={type}
                            className="badge badge-info"
                            style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}
                          >
                            {type}: {count as number}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Filters */}
              <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>
                      Event Type
                    </label>
                    <select
                      value={filters.eventType}
                      onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
                      style={{ width: '100%' }}
                    >
                      <option value="">All Types</option>
                      {uniqueEventTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>
                      Severity
                    </label>
                    <select
                      value={filters.severity}
                      onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                      style={{ width: '100%' }}
                    >
                      <option value="">All Severities</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                      <option value="info">Info</option>
                    </select>
                  </div>
                  {(filters.eventType || filters.severity) && (
                    <button
                      className="btn btn-sm"
                      onClick={() => setFilters({ eventType: '', severity: '' })}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Showing {filteredEvents.length} of {events.length} events
                </div>
              </div>

              {/* Timeline */}
              {filteredEvents.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    No events match the current filters
                  </p>
                </div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: '2rem' }}>
                  {/* Timeline line */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '0.5rem',
                      top: 0,
                      bottom: 0,
                      width: '2px',
                      background: 'var(--border-color)',
                    }}
                  />

                  {/* Events */}
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {filteredEvents.map((event, idx) => {
                      const isExpanded = expandedEventIdx === idx
                      const isTrigger = isAlertTriggerTime(event['@timestamp'])
                      const severityColor = getSeverityColor(event.severity)
                      const severityBg = getSeverityBg(event.severity)

                      return (
                        <div key={idx} style={{ position: 'relative' }}>
                          {/* Timeline dot */}
                          <div
                            style={{
                              position: 'absolute',
                              left: '-1.5rem',
                              top: '1rem',
                              width: isTrigger ? '16px' : '10px',
                              height: isTrigger ? '16px' : '10px',
                              borderRadius: '50%',
                              background: isTrigger ? 'var(--accent-danger)' : severityColor,
                              border: isTrigger ? '3px solid var(--bg-primary)' : '2px solid var(--bg-primary)',
                              boxShadow: isTrigger ? '0 0 0 3px var(--accent-danger)' : 'none',
                              zIndex: 1,
                            }}
                          />

                          {/* Event card */}
                          <div
                            className="card"
                            onClick={() => setExpandedEventIdx(isExpanded ? null : idx)}
                            style={{
                              cursor: 'pointer',
                              padding: '0.75rem 1rem',
                              background: severityBg,
                              border: `1px solid ${severityColor}40`,
                              borderLeft: `3px solid ${severityColor}`,
                              transition: 'all 0.2s',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                                    {event.event_type || 'Unknown Event'}
                                  </span>
                                  {event.severity && (
                                    <span className="badge" style={{ fontSize: '0.65rem', background: severityColor, color: 'white' }}>
                                      {event.severity}
                                    </span>
                                  )}
                                  {isTrigger && (
                                    <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>
                                      ALERT TRIGGER
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                                  {formatDateTimeWithSeconds(event['@timestamp'])}
                                </div>
                                {event.message && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                    {event.message}
                                  </div>
                                )}
                                {!isExpanded && (
                                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                                    {event.src_ip && <span>From: {event.src_ip}</span>}
                                    {event.dst_ip && <span>To: {event.dst_ip}</span>}
                                    {event.asset_id && <span>Asset: {event.asset_id}</span>}
                                  </div>
                                )}
                              </div>
                              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                                {isExpanded ? '\u25B2' : '\u25BC'}
                              </span>
                            </div>

                            {/* Expanded event details */}
                            {isExpanded && (
                              <div
                                style={{
                                  marginTop: '0.75rem',
                                  paddingTop: '0.75rem',
                                  borderTop: '1px solid var(--border-color)',
                                }}
                              >
                                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                  Event Payload
                                </div>
                                <pre
                                  style={{
                                    background: 'var(--bg-primary)',
                                    padding: '0.75rem',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.7rem',
                                    overflow: 'auto',
                                    maxHeight: '300px',
                                    margin: 0,
                                  }}
                                >
                                  {JSON.stringify(event, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
