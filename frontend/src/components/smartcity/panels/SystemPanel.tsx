import HUDPanel, { HUDMetric, HUDGauge } from '../HUDPanel'
import type { CityAsset } from '../../../types/assets'

interface OverviewStats {
  total_assets: number
  events_last_hour: number
  open_alerts: number
  critical_alerts: number
}

export default function SystemPanel({ delay = 0, stats, assets }: { delay?: number; stats: OverviewStats; assets: CityAsset[] }) {
  // Compute health score: 100 minus penalty for critical and open alerts
  const penalty = (stats.critical_alerts * 10) + (stats.open_alerts * 3)
  const healthScore = Math.max(0, Math.min(100, 100 - penalty))

  // Asset uptime: percentage of non-offline assets
  const totalAssets = assets.length || 1
  const onlineAssets = assets.filter(a => a.status !== 'offline').length
  const uptimePct = Math.round((onlineAssets / totalAssets) * 100)

  // Total risk from asset metrics
  const avgRisk = assets.length > 0
    ? Math.round(assets.reduce((sum, a) => sum + (a.metrics?.risk_score || 0), 0) / assets.length)
    : 0

  const healthColor = healthScore > 75 ? 'var(--accent-success)' : healthScore > 40 ? 'var(--accent-warning)' : 'var(--accent-danger)'

  return (
    <HUDPanel
      title="System"
      delay={delay}
      accentColor="#ffaa00"
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      }
    >
      <div className="hud-gauges-row">
        <HUDGauge
          value={healthScore}
          max={100}
          label="Health"
          color={healthColor}
        />
        <HUDGauge
          value={uptimePct}
          max={100}
          label="Uptime"
          color={uptimePct > 90 ? 'var(--accent-success)' : 'var(--accent-warning)'}
        />
      </div>

      <div className="hud-divider" />

      <HUDMetric label="Assets Monitored" value={stats.total_assets} color="cyan" />
      <HUDMetric label="Events / Hour" value={stats.events_last_hour.toLocaleString()} color="cyan" />
      <HUDMetric label="Avg Risk Score" value={avgRisk} color={avgRisk > 50 ? 'red' : avgRisk > 25 ? 'amber' : 'green'} />
      <HUDMetric label="Open Alerts" value={stats.open_alerts} color={stats.open_alerts > 0 ? 'red' : 'green'} />
      <HUDMetric label="Critical" value={stats.critical_alerts} color="red" />
    </HUDPanel>
  )
}
