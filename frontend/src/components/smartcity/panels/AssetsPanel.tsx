import HUDPanel, { HUDMetric, HUDStatusRow } from '../HUDPanel'
import type { CityAsset } from '../../../types/assets'

export default function AssetsPanel({ delay = 0, assets }: { delay?: number; assets: CityAsset[] }) {
  // Group by category
  const byCategory: Record<string, CityAsset[]> = {}
  for (const a of assets) {
    const cat = a.category || 'other'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(a)
  }

  // Count statuses
  const online = assets.filter(a => a.status !== 'offline' && a.status !== 'critical').length
  const warning = assets.filter(a => a.status === 'warning').length
  const critical = assets.filter(a => a.status === 'critical').length
  const offline = assets.filter(a => a.status === 'offline').length

  const categoryLabels: Record<string, string> = {
    traffic: 'Traffic',
    iot: 'IoT Sensors',
    network: 'Network',
    security: 'Security',
    industrial: 'Industrial',
    training: 'Cyber Range',
  }

  return (
    <HUDPanel
      title="Assets"
      delay={delay}
      accentColor="#bf00ff"
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" />
          <line x1="6" y1="18" x2="6.01" y2="18" />
        </svg>
      }
    >
      <HUDMetric label="Total Assets" value={assets.length} color="cyan" />
      <HUDMetric label="Online" value={online} color="green" />
      <HUDMetric label="Warnings" value={warning} color="amber" />
      <HUDMetric label="Critical" value={critical} color="red" />
      {offline > 0 && <HUDMetric label="Offline" value={offline} color="red" />}

      <div className="hud-divider" />

      <div className="hud-metric-label" style={{ marginBottom: '0.35rem' }}>By Category</div>
      {Object.entries(byCategory).map(([cat, items]) => {
        const hasCritical = items.some(i => i.status === 'critical')
        const hasWarning = items.some(i => i.status === 'warning')
        const status: 'critical' | 'warning' | 'online' = hasCritical ? 'critical' : hasWarning ? 'warning' : 'online'
        return (
          <HUDStatusRow
            key={cat}
            name={categoryLabels[cat] || cat}
            status={status}
            value={`${items.length}`}
          />
        )
      })}
    </HUDPanel>
  )
}
