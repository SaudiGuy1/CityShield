import { useState, useEffect, useRef } from 'react'
import anime from 'animejs'
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import SmartCity3D from '../components/SmartCity3D'
import type { ActiveAttack } from '../App'

interface OverviewProps {
  user: any
  activeAttack: ActiveAttack | null
  onAttackEnd: () => void
}

export default function Overview({ user, activeAttack, onAttackEnd }: OverviewProps) {
  const [stats, setStats] = useState({
    totalLogs: 0,
    activeAlerts: 0,
    activeRules: 0,
    detectionRate: 0
  })
  const [eventData, setEventData] = useState<any[]>([])
  const [pieData, setPieData] = useState<any[]>([])

  const statsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Animate stats cards on mount
    if (statsRef.current) {
      anime({
        targets: statsRef.current.children,
        translateY: [-50, 0],
        opacity: [0, 1],
        delay: anime.stagger(100),
        duration: 800,
        easing: 'easeOutExpo'
      })
    }

    // Fetch initial data
    fetchData()

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token')

      // Fetch logs count
      const logsRes = await fetch('/api/logs/count', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const logsData = await logsRes.ok ? await logsRes.json() : { count: 0 }

      // Fetch alerts
      const alertsRes = await fetch('/api/alerts?status=open', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const alerts = await alertsRes.ok ? await alertsRes.json() : []

      // Fetch rules
      const rulesRes = await fetch('/api/rules', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const rules = await rulesRes.ok ? await rulesRes.json() : []

      // Fetch recent events for chart
      const eventsRes = await fetch('/api/logs/recent?limit=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const events = await eventsRes.ok ? await eventsRes.json() : []

      // Update stats with animation
      const newStats = {
        totalLogs: logsData.count || 0,
        activeAlerts: alerts.filter((a: any) => a.status === 'open').length,
        activeRules: rules.filter((r: any) => r.enabled).length,
        detectionRate: alerts.length > 0 ? Math.round((alerts.length / (logsData.count || 1)) * 100) : 0
      }

      // Animate stat values
      Object.keys(newStats).forEach((key) => {
        const target = { value: stats[key as keyof typeof stats] }
        anime({
          targets: target,
          value: newStats[key as keyof typeof newStats],
          duration: 1000,
          easing: 'easeOutQuad',
          round: 1,
          update: () => {
            setStats(prev => ({ ...prev, [key]: target.value }))
          }
        })
      })

      // Process event data for charts
      const chartData = events.slice(0, 10).reverse().map((event: any, i: number) => ({
        time: i,
        events: i + 1,
        severity: event.severity === 'high' ? 3 : event.severity === 'warning' ? 2 : 1
      }))
      setEventData(chartData)

      // Component activity
      const trafficCount = events.filter((e: any) => e.component === 'traffic_management').length
      const iotCount = events.filter((e: any) => e.component === 'iot_sensors').length
      const networkCount = events.filter((e: any) => e.component === 'network_infrastructure').length

      // Pie chart data
      setPieData([
        { name: 'Traffic', value: trafficCount, color: '#ef4444' },
        { name: 'IoT', value: iotCount, color: '#10b981' },
        { name: 'Network', value: networkCount, color: '#3b82f6' }
      ])

    } catch (error) {
      console.error('Failed to fetch data:', error)
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>CityShield Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back, {user?.username || 'User'}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div ref={statsRef} className="card-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <h3>Total Events</h3>
          <div className="stat-value">{stats.totalLogs.toLocaleString()}</div>
          <div className="stat-label">Logged events</div>
        </div>

        <div className="stat-card">
          <h3>Active Alerts</h3>
          <div className="stat-value" style={{ color: 'var(--accent-danger)' }}>{stats.activeAlerts}</div>
          <div className="stat-label">Requires attention</div>
        </div>

        <div className="stat-card">
          <h3>Active Rules</h3>
          <div className="stat-value" style={{ color: 'var(--accent-success)' }}>{stats.activeRules}</div>
          <div className="stat-label">Detection rules enabled</div>
        </div>

        <div className="stat-card">
          <h3>Detection Rate</h3>
          <div className="stat-value" style={{ color: 'var(--accent-warning)' }}>{stats.detectionRate}%</div>
          <div className="stat-label">Events analyzed</div>
        </div>
      </div>

      {/* 3D City Visualization */}
      <div className="chart-container">
        <h3>Smart City Components</h3>
        <SmartCity3D activeAttack={activeAttack} onAttackEnd={onAttackEnd} />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Event Timeline */}
        <div className="chart-container">
          <h3>Event Activity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={eventData}>
              <defs>
                <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="time" stroke="var(--text-tertiary)" />
              <YAxis stroke="var(--text-tertiary)" />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.5rem',
                  color: 'var(--text-primary)'
                }}
              />
              <Area type="monotone" dataKey="events" stroke="#3b82f6" fillOpacity={1} fill="url(#colorEvents)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Component Distribution */}
        <div className="chart-container">
          <h3>Component Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.5rem',
                  color: 'var(--text-primary)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* System Status and Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="card">
          <h3>System Status</h3>
          <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Traffic Simulator</span>
              <span className="badge badge-success">Active</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>IoT Sensors</span>
              <span className="badge badge-success">Active</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Network Emulator</span>
              <span className="badge badge-success">Active</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Detection Engine</span>
              <span className="badge badge-success">Running</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>External Services</h3>
          <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
            <a
              href="http://localhost:5601"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--text-primary)',
                textDecoration: 'none',
                padding: '0.75rem',
                background: 'var(--bg-tertiary)',
                borderRadius: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid var(--border-color)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)'
                e.currentTarget.style.background = 'var(--bg-card)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)'
                e.currentTarget.style.background = 'var(--bg-tertiary)'
              }}
            >
              <span>OpenSearch Dashboards</span>
              <span style={{ color: 'var(--accent-primary)' }}>→</span>
            </a>

            <button
              style={{
                color: 'var(--text-primary)',
                padding: '0.75rem',
                background: 'var(--bg-tertiary)',
                borderRadius: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
                width: '100%',
                transition: 'all 0.2s',
                fontSize: 'inherit',
                fontFamily: 'inherit',
              }}
              onClick={async () => {
                try {
                  const token = localStorage.getItem('token')
                  const res = await fetch('/api/overview/init-dashboards', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                  })
                  if (res.ok) {
                    const data = await res.json()
                    alert(`Dashboards initialized: ${data.created?.length || 0} objects created`)
                  } else {
                    alert('Failed to initialize dashboards')
                  }
                } catch {
                  alert('Error connecting to server')
                }
              }}
            >
              <span>Initialize Dashboards</span>
              <span style={{ color: 'var(--accent-primary)' }}>+</span>
            </button>

            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--text-primary)',
                textDecoration: 'none',
                padding: '0.75rem',
                background: 'var(--bg-tertiary)',
                borderRadius: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid var(--border-color)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)'
                e.currentTarget.style.background = 'var(--bg-card)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)'
                e.currentTarget.style.background = 'var(--bg-tertiary)'
              }}
            >
              <span>API Documentation</span>
              <span style={{ color: 'var(--accent-primary)' }}>→</span>
            </a>

            <div style={{
              padding: '0.75rem',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '0.5rem',
              border: '1px solid var(--accent-primary)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)'
            }}>
              <strong style={{ color: 'var(--accent-primary)' }}>Note:</strong> Services run on localhost. If links don't work, ensure Docker is running and ports are accessible.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
