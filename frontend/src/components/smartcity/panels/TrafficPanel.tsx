import { useState, useEffect } from 'react'
import HUDPanel, { HUDMetric, HUDGauge, HUDSparkline, HUDBar } from '../HUDPanel'

function useSimulatedData() {
  const [data, setData] = useState({
    vehiclesPerMin: 342,
    avgSpeed: 47,
    congestionIndex: 32,
    incidents: 2,
    trafficLight: 98.4,
    history: [28, 35, 30, 42, 38, 45, 40, 36, 44, 50, 48, 42, 38, 34, 32],
  })

  useEffect(() => {
    const iv = setInterval(() => {
      setData(prev => {
        const newVehicles = Math.max(100, prev.vehiclesPerMin + Math.floor(Math.random() * 40 - 20))
        const newSpeed = Math.max(10, Math.min(80, prev.avgSpeed + Math.floor(Math.random() * 10 - 5)))
        const newCongestion = Math.max(5, Math.min(95, prev.congestionIndex + Math.floor(Math.random() * 8 - 4)))
        return {
          vehiclesPerMin: newVehicles,
          avgSpeed: newSpeed,
          congestionIndex: newCongestion,
          incidents: Math.max(0, prev.incidents + (Math.random() > 0.85 ? 1 : Math.random() > 0.7 ? -1 : 0)),
          trafficLight: Math.max(90, Math.min(100, prev.trafficLight + (Math.random() - 0.5) * 2)),
          history: [...prev.history.slice(1), newCongestion],
        }
      })
    }, 3000)
    return () => clearInterval(iv)
  }, [])

  return data
}

export default function TrafficPanel({ delay = 0 }: { delay?: number }) {
  const d = useSimulatedData()
  const congestionColor = d.congestionIndex > 60 ? 'var(--accent-danger)' : d.congestionIndex > 35 ? 'var(--accent-warning)' : 'var(--accent-success)'

  return (
    <HUDPanel
      title="Traffic Flow"
      delay={delay}
      accentColor="#00f0ff"
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2" />
          <path d="M19 17h2a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2" />
          <path d="M12 3v18" />
          <path d="m8 7 4-4 4 4" />
          <path d="m8 17 4 4 4-4" />
        </svg>
      }
    >
      <div className="hud-gauges-row">
        <HUDGauge value={d.congestionIndex} max={100} label="Congestion" color={congestionColor} />
        <HUDGauge value={d.avgSpeed} max={80} label="Avg km/h" color="var(--accent-primary)" />
      </div>

      <div className="hud-divider" />

      <HUDMetric label="Vehicles / min" value={d.vehiclesPerMin.toLocaleString()} color="cyan" />
      <HUDMetric label="Active Incidents" value={d.incidents} color={d.incidents > 3 ? 'red' : 'amber'} />
      <HUDMetric label="Signal Uptime" value={`${d.trafficLight.toFixed(1)}%`} color="green" />

      <div className="hud-divider" />

      <div className="hud-metric-label" style={{ marginBottom: '0.25rem' }}>Congestion (15 min)</div>
      <HUDSparkline data={d.history} color={congestionColor} />
      <HUDBar value={d.congestionIndex} color={d.congestionIndex > 60 ? 'red' : d.congestionIndex > 35 ? 'amber' : 'green'} />
    </HUDPanel>
  )
}
