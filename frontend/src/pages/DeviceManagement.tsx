import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Device, DeviceDetail } from '../types/assets'
import DeviceStatusBadge from '../components/DeviceStatusBadge'
import RiskScoreBar from '../components/RiskScoreBar'
import { formatDateTimeWithSeconds } from '../utils/datetime'

interface DeviceManagementProps {
  user?: { username?: string; role?: string } | null
}

export default function DeviceManagement({ user }: DeviceManagementProps) {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDevice, setSelectedDevice] = useState<DeviceDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [filters, setFilters] = useState({
    zone: '',
    asset_type: '',
    status: '',
    criticality: '',
    search: '',
    has_alerts: ''
  })
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const fetchDevices = useCallback(async () => {
    const token = localStorage.getItem('token')
    const params = new URLSearchParams()

    if (filters.zone) params.append('zone', filters.zone)
    if (filters.asset_type) params.append('asset_type', filters.asset_type)
    if (filters.status) params.append('status', filters.status)
    if (filters.criticality) params.append('criticality', filters.criticality)
    if (filters.search) params.append('search', filters.search)
    if (filters.has_alerts) params.append('has_alerts', filters.has_alerts)

    try {
      const res = await fetch(`/api/devices?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setDevices(data)
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchDevices()
    const interval = setInterval(fetchDevices, 5000)
    return () => clearInterval(interval)
  }, [fetchDevices])

  useEffect(() => {
    // If navigated with ?device=xxx, select that device
    const deviceParam = searchParams.get('device')
    if (deviceParam && devices.length > 0) {
      const device = devices.find(d => d.asset_id === deviceParam)
      if (device) {
        fetchDeviceDetail(deviceParam)
      }
    }
  }, [searchParams, devices])

  const fetchDeviceDetail = async (assetId: string) => {
    setDetailLoading(true)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`/api/devices/${assetId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setSelectedDevice(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch device detail:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  const performDeviceAction = async (assetId: string, action: string) => {
    if (togglingId) return
    setTogglingId(assetId)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`/api/devices/${assetId}/action`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      })
      if (res.ok) {
        fetchDevices()
        if (selectedDevice?.asset_id === assetId) {
          fetchDeviceDetail(assetId)
        }
      }
    } catch (err) {
      console.error('Failed to perform device action:', err)
    } finally {
      setTogglingId(null)
    }
  }

  const isAdmin = user?.role === 'Administrator'

  // Calculate summary stats
  const totalDevices = devices.length
  const activeDevices = devices.filter(d => d.status === 'active').length
  const devicesWithAlerts = devices.filter(d => d.alerts_open > 0).length

  // Get unique zones and asset types for filters
  const uniqueZones = [...new Set(devices.map(d => d.location?.zone).filter(Boolean))]
  const uniqueTypes = [...new Set(devices.map(d => d.asset_type))]

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>Device Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Monitor and manage smart city devices and assets
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span className="badge badge-info" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
            {totalDevices} Total
          </span>
          <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
            {activeDevices} Active
          </span>
          {devicesWithAlerts > 0 && (
            <span className="badge badge-danger" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
              {devicesWithAlerts} With Alerts
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Filters</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>
              Zone
            </label>
            <select
              value={filters.zone}
              onChange={e => setFilters({ ...filters, zone: e.target.value })}
              style={{ width: '100%' }}
            >
              <option value="">All Zones</option>
              {uniqueZones.map(zone => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>
              Type
            </label>
            <select
              value={filters.asset_type}
              onChange={e => setFilters({ ...filters, asset_type: e.target.value })}
              style={{ width: '100%' }}
            >
              <option value="">All Types</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>
              Status
            </label>
            <select
              value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}
              style={{ width: '100%' }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
              <option value="decommissioned">Decommissioned</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>
              Criticality
            </label>
            <select
              value={filters.criticality}
              onChange={e => setFilters({ ...filters, criticality: e.target.value })}
              style={{ width: '100%' }}
            >
              <option value="">All Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>
              Search
            </label>
            <input
              type="text"
              placeholder="Device ID or name..."
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
            {Object.values(filters).some(v => v !== '') && (
              <button
                className="btn btn-sm"
                onClick={() => setFilters({ zone: '', asset_type: '', status: '', criticality: '', search: '', has_alerts: '' })}
                style={{ width: '100%' }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Devices Table */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading devices...</p>
        </div>
      ) : devices.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            No devices found. {Object.values(filters).some(v => v !== '') ? 'Try adjusting your filters.' : 'No devices available.'}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Device
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Type
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Zone
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Status
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Events (1h)
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Alerts
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Risk Score
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {devices.map(device => (
                  <tr
                    key={device.asset_id}
                    onClick={() => fetchDeviceDetail(device.asset_id)}
                    style={{
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.2s',
                      background: selectedDevice?.asset_id === device.asset_id ? 'var(--bg-tertiary)' : 'transparent'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={e => e.currentTarget.style.background = selectedDevice?.asset_id === device.asset_id ? 'var(--bg-tertiary)' : 'transparent'}
                  >
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                          {device.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                          {device.asset_id}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {device.asset_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                        {device.location?.zone || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <DeviceStatusBadge status={device.status} size="sm" />
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {device.events_1h}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {device.alerts_open > 0 ? (
                        <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
                          {device.alerts_open}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', minWidth: '150px' }}>
                      <RiskScoreBar score={device.risk_score} showLabel={false} height={6} />
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      {isAdmin && (
                        <label className={`toggle-switch${togglingId === device.asset_id ? ' disabled' : ''}`}>
                          <input
                            type="checkbox"
                            checked={device.status === 'active'}
                            onChange={() => performDeviceAction(device.asset_id, device.status === 'active' ? 'disable' : 'enable')}
                          />
                          <span className="toggle-track" />
                        </label>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Device Detail Panel */}
      {selectedDevice && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setSelectedDevice(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '40%',
              minWidth: '500px',
              background: 'var(--bg-primary)',
              height: '100vh',
              overflowY: 'auto',
              boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ padding: '2rem' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: 0, marginBottom: '0.25rem' }}>{selectedDevice.name}</h2>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {selectedDevice.asset_id}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    <DeviceStatusBadge status={selectedDevice.status} />
                    <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                      {selectedDevice.device_type}
                    </span>
                    <span className={`badge badge-${selectedDevice.criticality === 'critical' ? 'danger' : selectedDevice.criticality === 'high' ? 'warning' : 'info'}`} style={{ fontSize: '0.7rem' }}>
                      {selectedDevice.criticality}
                    </span>
                  </div>
                </div>
                <button
                  className="btn btn-sm"
                  onClick={() => setSelectedDevice(null)}
                  style={{ padding: '0.5rem 1rem' }}
                >
                  Close
                </button>
              </div>

              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                  <p style={{ color: 'var(--text-secondary)' }}>Loading details...</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  {/* Risk Score */}
                  <div className="card">
                    <h3 style={{ marginBottom: '0.75rem' }}>Risk Score</h3>
                    <RiskScoreBar score={selectedDevice.risk_score} />
                  </div>

                  {/* Network Info */}
                  {selectedDevice.network && (
                    <div className="card">
                      <h3 style={{ marginBottom: '0.75rem' }}>Network Information</h3>
                      <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.8rem' }}>
                        {selectedDevice.network.ip_address && (
                          <div>
                            <span style={{ color: 'var(--text-tertiary)' }}>IP Address: </span>
                            <code style={{ color: 'var(--accent-primary)' }}>{selectedDevice.network.ip_address}</code>
                          </div>
                        )}
                        {selectedDevice.network.mac_address && (
                          <div>
                            <span style={{ color: 'var(--text-tertiary)' }}>MAC Address: </span>
                            <code style={{ color: 'var(--accent-primary)' }}>{selectedDevice.network.mac_address}</code>
                          </div>
                        )}
                        {selectedDevice.location?.subnet && (
                          <div>
                            <span style={{ color: 'var(--text-tertiary)' }}>Subnet: </span>
                            <code style={{ color: 'var(--accent-primary)' }}>{selectedDevice.location.subnet}</code>
                          </div>
                        )}
                        {selectedDevice.location?.zone && (
                          <div>
                            <span style={{ color: 'var(--text-tertiary)' }}>Zone: </span>
                            <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{selectedDevice.location.zone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metrics */}
                  {selectedDevice.metrics && (
                    <div className="card">
                      <h3 style={{ marginBottom: '0.75rem' }}>Activity Metrics</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                            Events (24h)
                          </div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {selectedDevice.metrics.events_24h}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                            Events (7d)
                          </div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {selectedDevice.metrics.events_7d}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                            Alerts (24h)
                          </div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: selectedDevice.metrics.alerts_24h > 0 ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
                            {selectedDevice.metrics.alerts_24h}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                            Alerts (7d)
                          </div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: selectedDevice.metrics.alerts_7d > 0 ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
                            {selectedDevice.metrics.alerts_7d}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recent Events */}
                  {selectedDevice.recent_events && selectedDevice.recent_events.length > 0 && (
                    <div className="card">
                      <h3 style={{ marginBottom: '0.75rem' }}>Recent Events</h3>
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {selectedDevice.recent_events.slice(0, 10).map((event, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '0.5rem',
                              background: 'var(--bg-tertiary)',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              borderLeft: `3px solid ${event.severity === 'critical' || event.severity === 'high' ? 'var(--accent-danger)' : 'var(--accent-secondary)'}`
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {event.event_type}
                              </span>
                              {event.severity && (
                                <span className={`badge badge-${event.severity === 'critical' || event.severity === 'high' ? 'danger' : 'info'}`} style={{ fontSize: '0.65rem' }}>
                                  {event.severity}
                                </span>
                              )}
                            </div>
                            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem' }}>
                              {formatDateTimeWithSeconds(event.timestamp)}
                            </div>
                            {event.message && (
                              <div style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                {event.message}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Alerts */}
                  {selectedDevice.recent_alerts && selectedDevice.recent_alerts.length > 0 && (
                    <div className="card">
                      <h3 style={{ marginBottom: '0.75rem' }}>Recent Alerts</h3>
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {selectedDevice.recent_alerts.map(alert => (
                          <div
                            key={alert.alert_id}
                            onClick={() => {
                              setSelectedDevice(null)
                              navigate(`/alerts?alert=${alert.alert_id}`)
                            }}
                            style={{
                              padding: '0.75rem',
                              background: 'var(--bg-tertiary)',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              borderLeft: `3px solid ${alert.severity === 'critical' ? 'var(--accent-danger)' : alert.severity === 'high' ? '#f97316' : 'var(--accent-warning)'}`,
                              transition: 'transform 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                                {alert.rule_name}
                              </span>
                              <span className={`badge badge-${alert.severity === 'critical' ? 'danger' : alert.severity === 'high' ? 'warning' : 'info'}`} style={{ fontSize: '0.65rem' }}>
                                {alert.severity}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                              {formatDateTimeWithSeconds(alert.triggered_at)}
                            </div>
                            <div style={{ marginTop: '0.25rem' }}>
                              <span className={`badge badge-${alert.status === 'open' ? 'danger' : alert.status === 'triaged' ? 'warning' : 'success'}`} style={{ fontSize: '0.65rem' }}>
                                {alert.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Admin Actions */}
                  {isAdmin && (
                    <div className="card">
                      <h3 style={{ marginBottom: '0.75rem' }}>Admin Actions</h3>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <label className={`toggle-switch${togglingId === selectedDevice.asset_id ? ' disabled' : ''}`}>
                            <input
                              type="checkbox"
                              checked={selectedDevice.status === 'active'}
                              onChange={() => performDeviceAction(selectedDevice.asset_id, selectedDevice.status === 'active' ? 'disable' : 'enable')}
                            />
                            <span className="toggle-track" />
                          </label>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Device Power
                          </span>
                        </div>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => performDeviceAction(selectedDevice.asset_id, 'restart')}
                        >
                          Restart Device
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedDevice.tags && selectedDevice.tags.length > 0 && (
                    <div className="card">
                      <h3 style={{ marginBottom: '0.75rem' }}>Tags</h3>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {selectedDevice.tags.map(tag => (
                          <span key={tag} className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
