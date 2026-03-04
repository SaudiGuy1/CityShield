import { useState, useEffect } from 'react'
import HUDPanel, { HUDMetric, HUDGauge, HUDSparkline, HUDBar } from '../HUDPanel'

function useSimulatedData() {
  const [data, setData] = useState({
    totalMW: 1247,
    solarPct: 34,
    windPct: 22,
    gridLoad: 72,
    peakDemand: 1480,
    co2Saved: 842,
    history: [68, 70, 72, 69, 74, 71, 73, 76, 72, 70, 71, 73, 72, 74, 72],
  })

  useEffect(() => {
    const iv = setInterval(() => {
      setData(prev => {
        const newTotal = Math.max(800, Math.min(1600, prev.totalMW + Math.floor(Math.random() * 60 - 30)))
        const newGrid = Math.max(40, Math.min(95, prev.gridLoad + Math.floor(Math.random() * 6 - 3)))
        return {
          totalMW: newTotal,
          solarPct: Math.max(10, Math.min(50, prev.solarPct + Math.floor(Math.random() * 4 - 2))),
          windPct: Math.max(10, Math.min(40, prev.windPct + Math.floor(Math.random() * 4 - 2))),
          gridLoad: newGrid,
          peakDemand: prev.peakDemand,
          co2Saved: Math.max(500, prev.co2Saved + Math.floor(Math.random() * 10 - 3)),
          history: [...prev.history.slice(1), newGrid],
        }
      })
    }, 4000)
    return () => clearInterval(iv)
  }, [])

  return data
}

export default function EnergyPanel({ delay = 0 }: { delay?: number }) {
  const d = useSimulatedData()
  const loadColor = d.gridLoad > 85 ? 'var(--accent-danger)' : d.gridLoad > 65 ? 'var(--accent-warning)' : 'var(--accent-success)'

  return (
    <HUDPanel
      title="Energy Grid"
      delay={delay}
      accentColor="#00ff88"
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      }
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span className="hud-big-value" style={{ color: 'var(--accent-success)' }}>{d.totalMW}</span>
        <span className="hud-big-unit">MW Total</span>
      </div>

      <HUDBar value={d.gridLoad} color={d.gridLoad > 85 ? 'red' : d.gridLoad > 65 ? 'amber' : 'green'} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
        <span className="hud-metric-label">Grid Load</span>
        <span className="hud-metric-value green">{d.gridLoad}%</span>
      </div>

      <div className="hud-divider" />

      <div className="hud-gauges-row">
        <HUDGauge value={d.solarPct} max={100} label="Solar" color="var(--accent-warning)" size={60} />
        <HUDGauge value={d.windPct} max={100} label="Wind" color="var(--accent-primary)" size={60} />
        <HUDGauge value={100 - d.solarPct - d.windPct} max={100} label="Grid" color="var(--accent-secondary)" size={60} />
      </div>

      <div className="hud-divider" />

      <HUDMetric label="Peak Demand" value={`${d.peakDemand} MW`} color="amber" />
      <HUDMetric label="CO₂ Saved" value={`${d.co2Saved} tons`} color="green" />

      <div className="hud-divider" />
      <div className="hud-metric-label" style={{ marginBottom: '0.25rem' }}>Load (15 min)</div>
      <HUDSparkline data={d.history} color={loadColor} />
    </HUDPanel>
  )
}
