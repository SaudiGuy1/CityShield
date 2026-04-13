import HUDPanel, { HUDMetric, HUDBar } from '../HUDPanel'

interface AlertSummary {
  total_alerts: number
  by_severity: Record<string, number>
  by_status: Record<string, number>
}

export default function AlertsPanel({ delay = 0, alertSummary }: { delay?: number; alertSummary: AlertSummary }) {
  const sev = alertSummary.by_severity
  const status = alertSummary.by_status
  const total = alertSummary.total_alerts || 1 // avoid div by zero

  const criticalPct = ((sev.critical || 0) / total) * 100
  const highPct = ((sev.high || 0) / total) * 100

  return (
    <HUDPanel
      title="Alerts"
      delay={delay}
      accentColor="#ff4060"
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      }
    >
      <HUDMetric label="Total Alerts" value={alertSummary.total_alerts.toLocaleString()} color="red" />

      <div className="hud-divider" />

      <div className="hud-metric-label" style={{ marginBottom: '0.35rem' }}>By Severity</div>

      <div style={{ marginBottom: '0.4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
          <span className="hud-metric-label">Critical</span>
          <span className="hud-metric-value red">{sev.critical || 0}</span>
        </div>
        <HUDBar value={criticalPct} color="red" />
      </div>

      <div style={{ marginBottom: '0.4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
          <span className="hud-metric-label">High</span>
          <span className="hud-metric-value amber">{sev.high || 0}</span>
        </div>
        <HUDBar value={highPct} color="amber" />
      </div>

      <HUDMetric label="Medium" value={sev.medium || 0} color="amber" />
      <HUDMetric label="Low" value={sev.low || 0} color="green" />

      <div className="hud-divider" />

      <div className="hud-metric-label" style={{ marginBottom: '0.35rem' }}>By Status</div>
      <HUDMetric label="Open" value={status.open || 0} color="red" />
      <HUDMetric label="Acknowledged" value={status.acknowledged || 0} color="amber" />
      <HUDMetric label="Resolved" value={status.resolved || 0} color="green" />
    </HUDPanel>
  )
}
