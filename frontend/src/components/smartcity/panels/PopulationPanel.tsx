import { useState, useEffect } from 'react'
import HUDPanel, { HUDMetric, HUDBar, HUDSparkline } from '../HUDPanel'

const DISTRICTS = [
  { name: 'Central Business', pop: 48200, density: 92, color: 'cyan' as const },
  { name: 'Tech Quarter', pop: 31500, density: 78, color: 'magenta' as const },
  { name: 'Residential East', pop: 67800, density: 61, color: 'green' as const },
  { name: 'Industrial Zone', pop: 12400, density: 28, color: 'amber' as const },
  { name: 'Harbor District', pop: 19300, density: 44, color: 'cyan' as const },
]

function useSimulatedData() {
  const [data, setData] = useState({
    totalPop: 247300,
    dailyCommuters: 142800,
    transitLoad: 68,
    history: [62, 64, 66, 63, 67, 70, 68, 72, 69, 66, 68, 70, 71, 69, 68],
  })

  useEffect(() => {
    const iv = setInterval(() => {
      setData(prev => {
        const newTransit = Math.max(30, Math.min(95, prev.transitLoad + Math.floor(Math.random() * 8 - 4)))
        return {
          totalPop: prev.totalPop + Math.floor(Math.random() * 200 - 80),
          dailyCommuters: prev.dailyCommuters + Math.floor(Math.random() * 1000 - 500),
          transitLoad: newTransit,
          history: [...prev.history.slice(1), newTransit],
        }
      })
    }, 5000)
    return () => clearInterval(iv)
  }, [])

  return data
}

export default function PopulationPanel({ delay = 0 }: { delay?: number }) {
  const d = useSimulatedData()

  return (
    <HUDPanel
      title="Population"
      delay={delay}
      accentColor="#bf00ff"
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      }
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span className="hud-big-value" style={{ color: 'var(--accent-secondary)' }}>
          {(d.totalPop / 1000).toFixed(1)}K
        </span>
        <span className="hud-big-unit">Residents</span>
      </div>

      <HUDMetric label="Daily Commuters" value={`${(d.dailyCommuters / 1000).toFixed(1)}K`} color="cyan" />
      <HUDMetric label="Transit Load" value={`${d.transitLoad}%`} color={d.transitLoad > 80 ? 'red' : 'amber'} />

      <div className="hud-divider" />

      <div className="hud-metric-label" style={{ marginBottom: '0.5rem' }}>District Density</div>
      {DISTRICTS.map((dist) => (
        <div key={dist.name} style={{ marginBottom: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
            <span className="hud-metric-label">{dist.name}</span>
            <span className="hud-metric-value" style={{ fontSize: '0.7rem' }}>{dist.density}%</span>
          </div>
          <HUDBar value={dist.density} color={dist.color} />
        </div>
      ))}

      <div className="hud-divider" />
      <div className="hud-metric-label" style={{ marginBottom: '0.25rem' }}>Transit Load (15 min)</div>
      <HUDSparkline data={d.history} color="var(--accent-secondary)" />
    </HUDPanel>
  )
}
