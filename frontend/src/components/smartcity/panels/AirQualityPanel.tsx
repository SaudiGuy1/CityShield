import { useState, useEffect } from 'react'
import HUDPanel, { HUDMetric, HUDGauge, HUDSparkline, HUDStatusRow } from '../HUDPanel'

function aqiColor(aqi: number): string {
  if (aqi <= 50) return 'var(--accent-success)'
  if (aqi <= 100) return 'var(--accent-warning)'
  return 'var(--accent-danger)'
}

function aqiLabel(aqi: number): string {
  if (aqi <= 50) return 'Good'
  if (aqi <= 100) return 'Moderate'
  if (aqi <= 150) return 'Unhealthy (Sensitive)'
  return 'Unhealthy'
}

function useSimulatedData() {
  const [data, setData] = useState({
    aqi: 42,
    pm25: 12.4,
    pm10: 28.1,
    co2: 412,
    no2: 18,
    o3: 34,
    humidity: 62,
    temp: 23,
    history: [48, 45, 42, 44, 40, 38, 42, 46, 44, 41, 43, 45, 42, 40, 42],
    sensors: [
      { name: 'Central Park', status: 'online' as const },
      { name: 'Highway A1', status: 'online' as const },
      { name: 'Industrial E', status: 'warning' as const },
      { name: 'Harbor South', status: 'online' as const },
      { name: 'Residential N', status: 'offline' as const },
    ],
  })

  useEffect(() => {
    const iv = setInterval(() => {
      setData(prev => {
        const newAqi = Math.max(10, Math.min(180, prev.aqi + Math.floor(Math.random() * 10 - 5)))
        return {
          ...prev,
          aqi: newAqi,
          pm25: Math.max(2, Math.min(80, prev.pm25 + (Math.random() - 0.5) * 4)),
          pm10: Math.max(5, Math.min(120, prev.pm10 + (Math.random() - 0.5) * 6)),
          co2: Math.max(380, Math.min(500, prev.co2 + Math.floor(Math.random() * 10 - 5))),
          no2: Math.max(5, Math.min(60, prev.no2 + Math.floor(Math.random() * 6 - 3))),
          o3: Math.max(10, Math.min(80, prev.o3 + Math.floor(Math.random() * 6 - 3))),
          humidity: Math.max(30, Math.min(90, prev.humidity + Math.floor(Math.random() * 4 - 2))),
          temp: Math.max(15, Math.min(35, prev.temp + (Math.random() - 0.5) * 2)),
          history: [...prev.history.slice(1), newAqi],
        }
      })
    }, 4500)
    return () => clearInterval(iv)
  }, [])

  return data
}

export default function AirQualityPanel({ delay = 0 }: { delay?: number }) {
  const d = useSimulatedData()
  const color = aqiColor(d.aqi)

  return (
    <HUDPanel
      title="Air Quality"
      delay={delay}
      accentColor="#ffaa00"
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <path d="M17.7 7.7a7.5 7.5 0 1 0-11.4 0" />
          <path d="M9 22h6" />
          <path d="M12 13v9" />
          <circle cx="12" cy="8" r="2" />
        </svg>
      }
    >
      <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
        <HUDGauge value={d.aqi} max={200} label="AQI Index" color={color} size={80} />
        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '0.75rem', fontWeight: 600, color, marginTop: '0.25rem' }}>
          {aqiLabel(d.aqi)}
        </div>
      </div>

      <div className="hud-divider" />

      <HUDMetric label="PM2.5" value={`${d.pm25.toFixed(1)} μg/m³`} color={d.pm25 > 35 ? 'red' : 'green'} />
      <HUDMetric label="PM10" value={`${d.pm10.toFixed(1)} μg/m³`} color={d.pm10 > 50 ? 'amber' : 'green'} />
      <HUDMetric label="CO₂" value={`${d.co2} ppm`} color="cyan" />
      <HUDMetric label="NO₂" value={`${d.no2} ppb`} color="cyan" />
      <HUDMetric label="O₃" value={`${d.o3} ppb`} color="cyan" />

      <div className="hud-divider" />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <HUDMetric label="Humidity" value={`${d.humidity}%`} color="cyan" />
        <HUDMetric label="Temp" value={`${d.temp.toFixed(1)}°C`} color="amber" />
      </div>

      <div className="hud-divider" />

      <div className="hud-metric-label" style={{ marginBottom: '0.25rem' }}>AQI Trend (15 min)</div>
      <HUDSparkline data={d.history} color={color} />

      <div className="hud-divider" />

      <div className="hud-metric-label" style={{ marginBottom: '0.35rem' }}>Sensor Network</div>
      {d.sensors.map(s => (
        <HUDStatusRow key={s.name} name={s.name} status={s.status} />
      ))}
    </HUDPanel>
  )
}
