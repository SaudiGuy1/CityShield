import { useState, useEffect, useRef, useCallback } from 'react'
import anime from 'animejs'
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import SmartCityMap3D from '../components/SmartCityMap3D'
import type { ActiveAttack } from '../App'
import { useLang } from '../hooks/useLang'

interface OverviewProps {
  user: { username?: string; role?: string } | null
  activeAttack: ActiveAttack | null
  onAttackEnd: () => void
}

export default function Overview({ user, activeAttack, onAttackEnd }: OverviewProps) {
  const { tk, dir } = useLang()
  const [stats, setStats] = useState({
    totalLogs: 0,
    activeAlerts: 0,
    activeRules: 0,
    detectionRate: 0
  })
  const [eventData, setEventData] = useState<{ time: number; events: number; severity: number }[]>([])
  const [pieData, setPieData] = useState<{ name: string; value: number; color: string }[]>([])

  const statsRef = useRef<HTMLDivElement>(null)
  const isFirstFetch = useRef(true)

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      // Fetch logs count
      const logsRes = await fetch('/api/logs/count', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (logsRes.status === 401 || logsRes.status === 403) {
        localStorage.removeItem('token')
        window.location.href = '/login'
        return
      }
      const logsData = await logsRes.ok ? await logsRes.json() : { count: 0 }

      // Fetch alert summary (uses OpenSearch aggregation — accurate count)
      const alertSummaryRes = await fetch('/api/alerts/stats/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const alertSummary = await alertSummaryRes.ok ? await alertSummaryRes.json() : { total_alerts: 0, by_status: {} }

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

      // Update stats
      const openAlerts = alertSummary.by_status?.open || 0
      const totalAlerts = alertSummary.total_alerts || 0
      const newStats = {
        totalLogs: logsData.count || 0,
        activeAlerts: openAlerts,
        activeRules: rules.filter((r: { enabled: boolean }) => r.enabled).length,
        detectionRate: totalAlerts > 0 ? Math.round((totalAlerts / (logsData.count || 1)) * 100) : 0
      }

      // Animate stat values only on first load; update directly after
      if (isFirstFetch.current) {
        isFirstFetch.current = false
        Object.keys(newStats).forEach((key) => {
          const target = { value: 0 }
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
      } else {
        setStats(newStats)
      }

      // Process event data for charts
      const chartData = events.slice(0, 10).reverse().map((event: { severity: string }, i: number) => ({
        time: i,
        events: i + 1,
        severity: event.severity === 'high' ? 3 : event.severity === 'warning' ? 2 : 1
      }))
      setEventData(chartData)

      // Component activity
      const trafficCount = events.filter((e: { component: string }) => e.component === 'traffic_management').length
      const iotCount = events.filter((e: { component: string }) => e.component === 'iot_sensors').length
      const networkCount = events.filter((e: { component: string }) => e.component === 'network_infrastructure').length

      // Pie chart data
      setPieData([
        { name: 'Traffic', value: trafficCount, color: '#ff003c' },
        { name: 'IoT', value: iotCount, color: '#00ff88' },
        { name: 'Network', value: networkCount, color: '#00f0ff' }
      ])

    } catch (error) {
      console.error('Failed to fetch data:', error)
    }
  }, [])

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
  }, [fetchData])

  return (
    <div className="container" dir={dir}>
      <div className="page-header">
        <div>
          <h1>{tk('overview.title')}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{tk('overview.welcome', { username: user?.username || 'User' })}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div ref={statsRef} className="card-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <h3>{tk('overview.total_events')}</h3>
          <div className="stat-value">{stats.totalLogs.toLocaleString()}</div>
          <div className="stat-label">{tk('overview.logged_events')}</div>
        </div>

        <div className="stat-card">
          <h3>{tk('overview.active_alerts')}</h3>
          <div className="stat-value" style={{ color: 'var(--accent-danger)' }}>{stats.activeAlerts}</div>
          <div className="stat-label">{tk('overview.requires_attention')}</div>
        </div>

        <div className="stat-card">
          <h3>{tk('overview.active_rules')}</h3>
          <div className="stat-value" style={{ color: 'var(--accent-success)' }}>{stats.activeRules}</div>
          <div className="stat-label">{tk('overview.rules_enabled')}</div>
        </div>

        <div className="stat-card">
          <h3>{tk('overview.detection_rate')}</h3>
          <div className="stat-value" style={{ color: 'var(--accent-warning)' }}>{stats.detectionRate}%</div>
          <div className="stat-label">{tk('overview.events_analyzed')}</div>
        </div>
      </div>

      {/* 3D City Visualization */}
      <div className="chart-container">
        <h3>{tk('overview.smart_city_components')}</h3>
        <SmartCityMap3D
          activeAttack={activeAttack}
          onAttackEnd={onAttackEnd}
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Event Timeline */}
        <div className="chart-container">
          <h3>{tk('overview.event_activity')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={eventData}>
              <defs>
                <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00f0ff" stopOpacity={0}/>
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
              <Area type="monotone" dataKey="events" stroke="#00f0ff" fillOpacity={1} fill="url(#colorEvents)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Component Distribution */}
        <div className="chart-container">
          <h3>{tk('overview.component_distribution')}</h3>
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
          <h3>{tk('overview.system_status')}</h3>
          <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{tk('overview.traffic_simulator')}</span>
              <span className="badge badge-success">{tk('common.active')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{tk('overview.iot_sensors')}</span>
              <span className="badge badge-success">{tk('common.active')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{tk('overview.network_emulator')}</span>
              <span className="badge badge-success">{tk('common.active')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{tk('overview.detection_engine')}</span>
              <span className="badge badge-success">{tk('overview.running')}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>{tk('overview.external_services')}</h3>
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
              <span>{tk('overview.opensearch_dashboards')}</span>
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
                  const data = await res.json()
                  if (res.ok) {
                    alert(`Dashboards initialized: ${data.created?.length || 0} index patterns created`)
                  } else {
                    alert(`Failed to initialize dashboards: ${data.detail || 'Unknown error'}`)
                  }
                } catch {
                  alert('Error connecting to server')
                }
              }}
            >
              <span>{tk('overview.init_dashboards')}</span>
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
              <span>{tk('overview.api_docs')}</span>
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
              {tk('overview.services_note')}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
