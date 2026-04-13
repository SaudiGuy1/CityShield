import HUDPanel, { HUDMetric, HUDGauge } from '../HUDPanel'

interface OverviewStats {
  total_assets: number
  events_last_hour: number
  open_alerts: number
  critical_alerts: number
}

export default function EventsPanel({ delay = 0, stats }: { delay?: number; stats: OverviewStats }) {
  const alertRate = stats.total_assets > 0
    ? Math.round((stats.open_alerts / stats.total_assets) * 100)
    : 0

  return (
    <HUDPanel
      title="Events"
      delay={delay}
      accentColor="#00f0ff"
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <path d="M12 2v4" />
          <path d="m16 6-2.5 2.5" />
          <path d="M20 12h-4" />
          <path d="m16 18-2.5-2.5" />
          <path d="M12 22v-4" />
          <path d="m8 18 2.5-2.5" />
          <path d="M4 12h4" />
          <path d="m8 6 2.5 2.5" />
        </svg>
      }
    >
      <div className="hud-gauges-row">
        <HUDGauge
          value={stats.events_last_hour}
          max={Math.max(stats.events_last_hour, 100)}
          label="Events/hr"
          color="var(--accent-primary)"
        />
        <HUDGauge
          value={alertRate}
          max={100}
          label="Alert Rate"
          color={alertRate > 50 ? 'var(--accent-danger)' : alertRate > 25 ? 'var(--accent-warning)' : 'var(--accent-success)'}
        />
      </div>

      <div className="hud-divider" />

      <HUDMetric label="Events Last Hour" value={stats.events_last_hour.toLocaleString()} color="cyan" />
      <HUDMetric label="Total Assets" value={stats.total_assets.toLocaleString()} color="green" />
      <HUDMetric label="Open Alerts" value={stats.open_alerts.toLocaleString()} color={stats.open_alerts > 5 ? 'red' : 'amber'} />
      <HUDMetric label="Critical Alerts" value={stats.critical_alerts.toLocaleString()} color="red" />
    </HUDPanel>
  )
}
