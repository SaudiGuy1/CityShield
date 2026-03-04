import { useState, useEffect } from 'react'
import HUDPanel, { HUDMetric, HUDGauge, HUDSparkline, HUDStatusRow, HUDBar } from '../HUDPanel'

function useSimulatedData() {
  const [data, setData] = useState({
    bandwidth: 8.4,
    maxBandwidth: 10,
    latency: 12,
    packetLoss: 0.02,
    activeConnections: 14832,
    throughput: 6.2,
    firewallBlocked: 847,
    dnsQueries: 23400,
    uptime: 99.97,
    history: [7.8, 8.1, 8.0, 8.3, 8.2, 8.5, 8.4, 8.1, 8.6, 8.4, 8.3, 8.5, 8.4, 8.2, 8.4],
    nodes: [
      { name: 'Core Router A', status: 'online' as const, val: '1.2ms' },
      { name: 'Core Router B', status: 'online' as const, val: '1.4ms' },
      { name: 'Edge Switch N1', status: 'online' as const, val: '3.1ms' },
      { name: 'Edge Switch S2', status: 'warning' as const, val: '8.7ms' },
      { name: 'Firewall Main', status: 'online' as const, val: '0.8ms' },
      { name: 'CDN Proxy', status: 'online' as const, val: '2.1ms' },
      { name: 'IoT Gateway', status: 'critical' as const, val: '45ms' },
    ],
  })

  useEffect(() => {
    const iv = setInterval(() => {
      setData(prev => {
        const newBw = Math.max(4, Math.min(10, prev.bandwidth + (Math.random() - 0.5) * 0.8))
        return {
          ...prev,
          bandwidth: newBw,
          latency: Math.max(5, Math.min(80, prev.latency + Math.floor(Math.random() * 6 - 3))),
          packetLoss: Math.max(0, Math.min(5, prev.packetLoss + (Math.random() - 0.5) * 0.1)),
          activeConnections: Math.max(10000, prev.activeConnections + Math.floor(Math.random() * 400 - 200)),
          throughput: Math.max(2, Math.min(9.5, prev.throughput + (Math.random() - 0.5) * 0.6)),
          firewallBlocked: prev.firewallBlocked + Math.floor(Math.random() * 20),
          dnsQueries: prev.dnsQueries + Math.floor(Math.random() * 200),
          history: [...prev.history.slice(1), newBw],
        }
      })
    }, 3500)
    return () => clearInterval(iv)
  }, [])

  return data
}

export default function NetworkPanel({ delay = 0 }: { delay?: number }) {
  const d = useSimulatedData()
  const bwPct = (d.bandwidth / d.maxBandwidth) * 100

  return (
    <HUDPanel
      title="Network"
      delay={delay}
      accentColor="#00f0ff"
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <path d="M5 12.55a11 11 0 0 1 14 0" />
          <path d="M1.42 9a16 16 0 0 1 21.16 0" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <circle cx="12" cy="20" r="1" />
        </svg>
      }
    >
      <div className="hud-gauges-row">
        <HUDGauge value={d.bandwidth} max={d.maxBandwidth} label="Gbps" color="var(--accent-primary)" size={68} />
        <HUDGauge value={d.latency} max={100} label="Latency ms" color={d.latency > 30 ? 'var(--accent-warning)' : 'var(--accent-success)'} size={68} />
      </div>

      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
          <span className="hud-metric-label">Bandwidth Usage</span>
          <span className="hud-metric-value cyan">{bwPct.toFixed(0)}%</span>
        </div>
        <HUDBar value={bwPct} color={bwPct > 85 ? 'red' : bwPct > 65 ? 'amber' : 'cyan'} />
      </div>

      <div className="hud-divider" />

      <HUDMetric label="Active Connections" value={d.activeConnections.toLocaleString()} color="cyan" />
      <HUDMetric label="Throughput" value={`${d.throughput.toFixed(1)} Gbps`} color="green" />
      <HUDMetric label="Packet Loss" value={`${d.packetLoss.toFixed(2)}%`} color={d.packetLoss > 1 ? 'red' : 'green'} />
      <HUDMetric label="Firewall Blocked" value={d.firewallBlocked.toLocaleString()} color="red" />
      <HUDMetric label="DNS Queries" value={d.dnsQueries.toLocaleString()} color="cyan" />
      <HUDMetric label="Uptime" value={`${d.uptime}%`} color="green" />

      <div className="hud-divider" />

      <div className="hud-metric-label" style={{ marginBottom: '0.25rem' }}>Bandwidth (15 min)</div>
      <HUDSparkline data={d.history} color="var(--accent-primary)" />

      <div className="hud-divider" />

      <div className="hud-metric-label" style={{ marginBottom: '0.35rem' }}>Node Status</div>
      {d.nodes.map(n => (
        <HUDStatusRow key={n.name} name={n.name} status={n.status} value={n.val} />
      ))}
    </HUDPanel>
  )
}
