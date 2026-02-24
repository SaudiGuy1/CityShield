import { useState, useEffect } from 'react'
import type { CityAsset } from '../../types/assets'
import { formatDateTimeWithSeconds, formatTimeWithSeconds } from '../../utils/datetime'

interface AssetInspectorPanelProps {
  asset: CityAsset
  onClose: () => void
  isAdmin?: boolean
  onTogglePower?: (assetId: string, action: string) => void
  togglingPower?: boolean
}

interface Alert {
  id: string
  rule_name: string
  severity: string
  timestamp: string
  description: string
}

interface Event {
  timestamp: string
  event_type: string
  message: string
  severity?: string
}

export default function AssetInspectorPanel({ asset, onClose, isAdmin, onTogglePower, togglingPower }: AssetInspectorPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  // Optimistic toggle state: tracks the user's click immediately,
  // then reconciles when the asset prop updates from WebSocket.
  const [powerOverride, setPowerOverride] = useState<boolean | null>(null)

  // When the asset status changes (from WebSocket), clear the override
  useEffect(() => {
    setPowerOverride(null)
  }, [asset.status])

  const isDeviceOn = powerOverride !== null ? powerOverride : asset.status !== 'offline'

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token')
        const assetId = asset.asset_id || asset.id

        // Fetch active alerts for this asset
        const alertsRes = await fetch(`/api/alerts?asset_id=${assetId}&status=open&limit=10`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (alertsRes.ok) {
          const alertsData = await alertsRes.json()
          setAlerts(alertsData)
        }

        // Fetch recent events for this asset
        const eventsRes = await fetch(`/api/logs/recent?asset_id=${assetId}&limit=20`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (eventsRes.ok) {
          const eventsData = await eventsRes.json()
          setEvents(eventsData)
        }

        setLoading(false)
      } catch (err) {
        console.error('Failed to fetch asset data:', err)
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000) // Refresh every 5s
    return () => clearInterval(interval)
  }, [asset.asset_id, asset.id])

  const handleDrillDown = () => {
    const assetId = asset.asset_id || asset.id
    const query = `asset_id:"${assetId}" AND @timestamp:[now-1h TO now]`
    const dashboardsUrl = 'http://localhost:5601'
    const url = `${dashboardsUrl}/app/discover#/?_g=(time:(from:now-1h,to:now))&_a=(query:(language:kuery,query:'${encodeURIComponent(query)}'))`
    window.open(url, '_blank')
  }

  const riskScore = asset.metrics?.risk_score ?? 0
  const riskColor = getRiskColor(riskScore)

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h3 style={titleStyle}>{asset.name}</h3>
          <div style={subtitleStyle}>
            {asset.asset_id || asset.id} • {asset.asset_type || asset.category}
          </div>
        </div>
        <button onClick={onClose} style={closeButtonStyle}>×</button>
      </div>

      {/* Training Asset Badge */}
      {asset.zone === 'cyber-range' && (
        <div style={{
          padding: '0.5rem 0.75rem',
          marginBottom: '1rem',
          borderRadius: '0.5rem',
          background: 'rgba(6, 182, 212, 0.15)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: '#06b6d4',
        }}>
          <span style={{ fontSize: '1rem' }}>&#127919;</span> Training Asset
        </div>
      )}

      {/* Risk Score */}
      <div style={{ ...riskSectionStyle, background: `${riskColor}15` }}>
        <div style={riskLabelStyle}>Risk Score</div>
        <div style={{ ...riskValueStyle, color: riskColor }}>{riskScore}</div>
        <div style={riskBarContainerStyle}>
          <div style={{ ...riskBarStyle, width: `${riskScore}%`, background: riskColor }} />
        </div>
      </div>

      {/* Asset Metadata */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Asset Information</div>
        <div style={metadataGridStyle}>
          <MetadataRow label="IP Address" value={asset.network?.ip_address || 'N/A'} />
          <MetadataRow label="Subnet" value={asset.network?.subnet || 'N/A'} />
          <MetadataRow label="Zone" value={asset.zone} />
          <MetadataRow label="Criticality" value={asset.criticality} />
        </div>
      </div>

      {/* Active Alerts */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          Active Alerts ({alerts.length})
        </div>
        {loading ? (
          <div style={loadingStyle}>Loading...</div>
        ) : alerts.length === 0 ? (
          <div style={emptyStyle}>No active alerts</div>
        ) : (
          <div style={alertsListStyle}>
            {alerts.slice(0, 5).map(alert => (
              <div key={alert.id} style={alertCardStyle}>
                <div style={alertHeaderStyle}>
                  <span style={alertNameStyle}>{alert.rule_name}</span>
                  <span style={{ ...severityBadgeStyle, ...getSeverityStyle(alert.severity) }}>
                    {alert.severity}
                  </span>
                </div>
                <div style={alertTimeStyle}>
                  {formatDateTimeWithSeconds(alert.timestamp)}
                </div>
                {alert.description && (
                  <div style={alertDescStyle}>{alert.description}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Events */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Recent Events ({events.length})</div>
        {loading ? (
          <div style={loadingStyle}>Loading...</div>
        ) : events.length === 0 ? (
          <div style={emptyStyle}>No recent events</div>
        ) : (
          <div style={eventsListStyle}>
            {events.slice(0, 10).map((event, i) => (
              <div key={i} style={eventRowStyle}>
                <div style={eventTimeStyle}>
                  {formatTimeWithSeconds(event.timestamp)}
                </div>
                <div style={eventTypeStyle}>{event.event_type}</div>
                <div style={eventMessageStyle}>{event.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SOC Actions */}
      <div style={actionsStyle}>
        <button onClick={handleDrillDown} style={primaryButtonStyle}>
          🔍 Drill-Down to OpenSearch
        </button>
        {isAdmin && onTogglePower && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem', background: 'rgba(51, 65, 85, 0.5)', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Device Power</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', color: isDeviceOn ? '#10b981' : '#94a3b8' }}>
                {isDeviceOn ? 'Active' : 'Inactive'}
              </span>
              <label className={`toggle-switch${togglingPower ? ' disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={isDeviceOn}
                  onChange={() => {
                    const assetId = asset.asset_id || asset.id || ''
                    const action = isDeviceOn ? 'disable' : 'enable'
                    setPowerOverride(!isDeviceOn)
                    onTogglePower(assetId, action)
                  }}
                />
                <span className="toggle-track" />
              </label>
            </div>
          </div>
        )}
        <button style={secondaryButtonStyle} disabled>
          🔒 Isolate
        </button>
        <button style={secondaryButtonStyle} disabled>
          🔕 Suppress
        </button>
      </div>
    </div>
  )
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={metadataRowStyle}>
      <span style={metadataLabelStyle}>{label}</span>
      <span style={metadataValueStyle}>{value}</span>
    </div>
  )
}

function getRiskColor(score: number): string {
  if (score >= 75) return '#ef4444'
  if (score >= 50) return '#f97316'
  if (score >= 25) return '#f59e0b'
  return '#10b981'
}

function getSeverityStyle(severity: string) {
  switch (severity) {
    case 'critical':
      return { background: '#ef444415', color: '#ef4444' }
    case 'high':
      return { background: '#f9731615', color: '#f97316' }
    case 'medium':
      return { background: '#f59e0b15', color: '#f59e0b' }
    default:
      return { background: '#10b98115', color: '#10b981' }
  }
}

// Styles
const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: '1rem',
  right: '1rem',
  width: '420px',
  maxHeight: 'calc(100% - 2rem)',
  overflowY: 'auto',
  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.98))',
  border: '1px solid rgba(59, 130, 246, 0.3)',
  borderRadius: '0.75rem',
  backdropFilter: 'blur(16px)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  padding: '1.5rem',
  color: '#e2e8f0',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  zIndex: 100,
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '1.5rem',
  paddingBottom: '1rem',
  borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1.25rem',
  fontWeight: 600,
  color: '#f1f5f9',
}

const subtitleStyle: React.CSSProperties = {
  marginTop: '0.25rem',
  fontSize: '0.75rem',
  color: '#94a3b8',
}

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  fontSize: '1.5rem',
  cursor: 'pointer',
  padding: '0 0.25rem',
  lineHeight: 1,
}

const riskSectionStyle: React.CSSProperties = {
  padding: '1rem',
  borderRadius: '0.5rem',
  marginBottom: '1rem',
}

const riskLabelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const riskValueStyle: React.CSSProperties = {
  fontSize: '2rem',
  fontWeight: 700,
  marginTop: '0.25rem',
}

const riskBarContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '6px',
  background: 'rgba(148, 163, 184, 0.2)',
  borderRadius: '3px',
  marginTop: '0.75rem',
  overflow: 'hidden',
}

const riskBarStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: '3px',
  transition: 'width 0.3s ease',
}

const sectionStyle: React.CSSProperties = {
  marginBottom: '1.5rem',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  fontWeight: 600,
  color: '#cbd5e1',
  marginBottom: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const metadataGridStyle: React.CSSProperties = {
  display: 'grid',
  gap: '0.5rem',
}

const metadataRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.5rem',
  background: 'rgba(15, 23, 42, 0.5)',
  borderRadius: '0.375rem',
}

const metadataLabelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#94a3b8',
}

const metadataValueStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#e2e8f0',
  fontWeight: 500,
}

const alertsListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  maxHeight: '200px',
  overflowY: 'auto',
}

const alertCardStyle: React.CSSProperties = {
  padding: '0.75rem',
  background: 'rgba(15, 23, 42, 0.5)',
  borderRadius: '0.375rem',
  border: '1px solid rgba(239, 68, 68, 0.2)',
}

const alertHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '0.5rem',
}

const alertNameStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  fontWeight: 600,
  color: '#f1f5f9',
}

const severityBadgeStyle: React.CSSProperties = {
  padding: '0.125rem 0.5rem',
  borderRadius: '0.25rem',
  fontSize: '0.65rem',
  fontWeight: 600,
  textTransform: 'uppercase',
}

const alertTimeStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: '#94a3b8',
  marginBottom: '0.25rem',
}

const alertDescStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#cbd5e1',
  marginTop: '0.5rem',
}

const eventsListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  maxHeight: '200px',
  overflowY: 'auto',
}

const eventRowStyle: React.CSSProperties = {
  padding: '0.5rem',
  background: 'rgba(15, 23, 42, 0.3)',
  borderRadius: '0.25rem',
  fontSize: '0.75rem',
}

const eventTimeStyle: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: '0.7rem',
}

const eventTypeStyle: React.CSSProperties = {
  color: '#3b82f6',
  fontWeight: 600,
  marginTop: '0.25rem',
}

const eventMessageStyle: React.CSSProperties = {
  color: '#cbd5e1',
  marginTop: '0.25rem',
}

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  marginTop: '1.5rem',
  paddingTop: '1rem',
  borderTop: '1px solid rgba(148, 163, 184, 0.1)',
}

const primaryButtonStyle: React.CSSProperties = {
  padding: '0.75rem',
  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  border: 'none',
  borderRadius: '0.5rem',
  color: '#fff',
  fontSize: '0.875rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'transform 0.2s',
}

const secondaryButtonStyle: React.CSSProperties = {
  padding: '0.625rem',
  background: 'rgba(51, 65, 85, 0.5)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '0.5rem',
  color: '#94a3b8',
  fontSize: '0.8rem',
  cursor: 'not-allowed',
}

const loadingStyle: React.CSSProperties = {
  padding: '1rem',
  textAlign: 'center',
  color: '#94a3b8',
  fontSize: '0.875rem',
}

const emptyStyle: React.CSSProperties = {
  padding: '1rem',
  textAlign: 'center',
  color: '#64748b',
  fontSize: '0.875rem',
}
