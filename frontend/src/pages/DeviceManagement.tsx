import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Device, DeviceDetail } from '../types/assets'
import DeviceStatusBadge from '../components/DeviceStatusBadge'
import RiskScoreBar from '../components/RiskScoreBar'
import { formatDateTimeWithSeconds } from '../utils/datetime'
import { useLang } from '../hooks/useLang'

interface DeviceManagementProps {
  user?: { username?: string; role?: string } | null
}

export default function DeviceManagement({ user }: DeviceManagementProps) {
  const { tk, dir } = useLang()
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
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [registerForm, setRegisterForm] = useState({
    asset_id: '',
    name: '',
    asset_type: 'traffic_signal',
    device_type: 'physical',
    ip_address: '',
    mac_address: '',
    zone: 'zone-a',
    criticality: 'high',
    building: '',
  })
  const [registerLoading, setRegisterLoading] = useState(false)
  const [registerError, setRegisterError] = useState('')
  const [discoveredDevices, setDiscoveredDevices] = useState<any[]>([])
  const [discovering, setDiscovering] = useState(false)
  const [attackRunning, setAttackRunning] = useState(false)
  const [attackLog, setAttackLog] = useState<string[]>([])
  const serialPortRef = useRef<any>(null)
  const [serialConnected, setSerialConnected] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const sendSerialCommand = async (command: string, waitForOk = true): Promise<string> => {
    const port = serialPortRef.current
    if (!port?.writable || !port?.readable) throw new Error('Serial port not connected')
    const encoder = new TextEncoder()
    const writer = port.writable.getWriter()
    await writer.write(encoder.encode(command + '\n'))
    writer.releaseLock()
    if (!waitForOk) return ''
    const reader = port.readable.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let timedOut = false
    const timer = setTimeout(() => { timedOut = true; reader.cancel() }, 5000)
    try {
      while (!timedOut) {
        const { value, done } = await reader.read()
        if (done) break
        if (value) buffer += decoder.decode(value, { stream: true })
        // Check for complete JSON line
        const jsonIdx = buffer.indexOf('DEVICE_JSON:')
        if (jsonIdx !== -1) {
          const afterMarker = buffer.substring(jsonIdx + 'DEVICE_JSON:'.length)
          if (afterMarker.includes('\n')) break
          continue
        }
        if (buffer.includes('CMD_OK:') && buffer.includes('\n')) break
      }
    } catch {
      // reader.cancel() causes an exception, that's fine
    } finally {
      clearTimeout(timer)
      try { reader.releaseLock() } catch { /* ignore */ }
    }
    return buffer
  }

  const disconnectSerial = async () => {
    try {
      if (serialPortRef.current) {
        await serialPortRef.current.close()
      }
    } catch { /* ignore */ }
    serialPortRef.current = null
    setSerialConnected(false)
  }

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
      // 1. Update status in backend (OpenSearch)
      const res = await fetch(`/api/devices/${assetId}/action`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      })

      // 2. For physical devices, send command via USB serial (most reliable)
      //    Falls back to HTTP if serial not connected
      const device = devices.find(d => d.asset_id === assetId) || selectedDevice
      if (device?.device_type === 'physical') {
        if (serialConnected && serialPortRef.current) {
          try {
            await sendSerialCommand(action)
            console.log(`Command '${action}' sent via USB serial`)
          } catch (err) {
            console.warn('Serial command failed:', err)
          }
        } else if (device?.network?.ip_address) {
          try {
            await fetch(`http://${device.network.ip_address}/command`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action }),
            })
          } catch (hwErr) {
            console.warn('HTTP command failed (connect via USB for reliable control):', hwErr)
          }
        }
      }

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

  const [probeIp, setProbeIp] = useState('')

  const discoverFromUSB = async () => {
    setDiscovering(true)
    setRegisterError('')
    setDiscoveredDevices([])

    if (!('serial' in navigator)) {
      setRegisterError('Web Serial API not supported. Use Chrome or Edge browser.')
      setDiscovering(false)
      return
    }

    try {
      // Close existing connection if any
      await disconnectSerial()

      // Browser shows native USB port picker dropdown
      const port = await (navigator as any).serial.requestPort()
      await port.open({ baudRate: 115200 })
      serialPortRef.current = port
      setSerialConnected(true)

      // Send "status" command
      const response = await sendSerialCommand('status')
      const marker = 'DEVICE_JSON:'
      const idx = response.indexOf(marker)
      if (idx !== -1) {
        const jsonStr = response.substring(idx + marker.length).split('\n')[0].trim()
        const data = JSON.parse(jsonStr)
        setDiscoveredDevices([{
          asset_id: data.asset_id,
          ip_address: data.ip,
          zone: data.zone || 'zone-a',
          signal_state: data.signal_state || 'unknown',
          state: data.state || 'unknown',
          event_count: 0,
          free_heap: data.free_heap,
          device_type: data.device_type || 'physical_esp32',
          live: true,  // USB-connected = always live
        }])
      } else {
        await disconnectSerial()
        setRegisterError('No response from device. Make sure the updated firmware is uploaded to the ESP32.')
      }
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        setRegisterError('')
      } else {
        setRegisterError(`Serial error: ${err.message}. Close Arduino Serial Monitor first — only one program can use the port.`)
      }
      await disconnectSerial()
    } finally {
      setDiscovering(false)
    }
  }

  const discoverFromIP = async () => {
    const targetIp = probeIp.trim()
    if (!targetIp) return
    setDiscovering(true)
    setRegisterError('')
    try {
      const res = await fetch(`http://${targetIp}/status`, {
        signal: AbortSignal.timeout(4000)
      })
      if (res.ok) {
        const data = await res.json()
        setDiscoveredDevices([{
          asset_id: data.asset_id || `esp32-${targetIp.replace(/\./g, '-')}`,
          ip_address: data.ip || targetIp,
          zone: data.zone || 'zone-a',
          signal_state: data.signal_state || 'unknown',
          state: data.state || 'unknown',
          event_count: data.flood_count || 0,
          free_heap: data.free_heap,
          device_type: data.device_type || 'physical_esp32',
          live: true,
        }])
      } else {
        setRegisterError(`Device at ${targetIp} returned status ${res.status}.`)
      }
    } catch {
      setRegisterError(`Cannot reach ${targetIp}. Make sure the ESP32 is on the same network.`)
    } finally {
      setDiscovering(false)
    }
  }

  const selectDiscoveredDevice = (device: any) => {
    setRegisterForm({
      ...registerForm,
      asset_id: device.asset_id,
      name: device.asset_id.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
      ip_address: device.ip_address,
      zone: device.zone || 'zone-a',
      device_type: 'physical',
      asset_type: 'traffic_signal',
      criticality: 'high',
      mac_address: '',
      building: '',
    })
    setRegisterError('')
  }

  const registerDevice = async () => {
    if (!registerForm.asset_id.trim() || !registerForm.name.trim()) {
      setRegisterError('Device ID and Name are required')
      return
    }
    setRegisterLoading(true)
    setRegisterError('')
    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registerForm)
      })
      if (res.ok) {
        setShowRegisterModal(false)
        setRegisterForm({
          asset_id: '', name: '', asset_type: 'traffic_signal', device_type: 'physical',
          ip_address: '', mac_address: '', zone: 'zone-a', criticality: 'high', building: '',
        })
        fetchDevices()
      } else {
        const err = await res.json()
        setRegisterError(err.detail || 'Registration failed')
      }
    } catch (err) {
      setRegisterError('Network error')
    } finally {
      setRegisterLoading(false)
    }
  }

  const launchFloodAttack = async (assetId: string) => {
    if (attackRunning) return
    if (!serialConnected) {
      setAttackLog(['Error: USB serial not connected. Click "Detect from USB Port" first.'])
      return
    }
    if (!confirm(`Launch IoT Flood Attack against ${assetId}?\n\nThis will crash the physical traffic light via USB. All signals will go dark.\n\nProceed?`)) return
    setAttackRunning(true)
    setAttackLog(['[Phase 1] Reconnaissance via USB serial...'])
    const token = localStorage.getItem('token')

    try {
      // Phase 1: Check device status
      const statusResp = await sendSerialCommand('status')
      const marker = 'DEVICE_JSON:'
      const idx = statusResp.indexOf(marker)
      if (idx !== -1) {
        const jsonStr = statusResp.substring(idx + marker.length).split('\n')[0].trim()
        try {
          const data = JSON.parse(jsonStr)
          setAttackLog(prev => [...prev,
            `  Device: ${data.asset_id} | State: ${data.state} | Signal: ${data.signal_state}`,
            `  Free heap: ${data.free_heap} bytes | WiFi RSSI: ${data.wifi_rssi}`,
          ])
        } catch { /* parse error, continue anyway */ }
      }
      setAttackLog(prev => [...prev, '', '[Phase 2] Sending flood command via USB...'])

      // Phase 2: Send flood command — ESP32 will crash itself
      await new Promise(r => setTimeout(r, 500))
      const floodResp = await sendSerialCommand('flood')
      const crashed = floodResp.includes('CMD_OK:flood') || floodResp.includes('CRASHED')
      setAttackLog(prev => [...prev, `  Response: ${floodResp.trim().split('\n').filter((l: string) => l.trim()).join(' | ')}`])

      // Phase 3: Verify
      setAttackLog(prev => [...prev, '', '[Phase 3] Verifying device state...'])
      await new Promise(r => setTimeout(r, 1500))
      const verifyResp = await sendSerialCommand('status')
      const vidx = verifyResp.indexOf(marker)
      if (vidx !== -1) {
        try {
          const vdata = JSON.parse(verifyResp.substring(vidx + marker.length).split('\n')[0].trim())
          setAttackLog(prev => [...prev, `  State: ${vdata.state} | Signal: ${vdata.signal_state}`])
        } catch { /* ignore */ }
      }

      if (crashed) {
        setAttackLog(prev => [...prev, '', 'ATTACK SUCCESSFUL — TRAFFIC LIGHT CRASHED', 'All signals are dark — intersection is UNSAFE.', 'Use "Restart Device" to recover.'])
        try {
          await fetch(`/api/devices/${assetId}/action`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'crash_detected' })
          })
        } catch { /* best-effort */ }
      } else {
        setAttackLog(prev => [...prev, '', 'Device may not have crashed. Try again.'])
      }
      fetchDevices()
      if (selectedDevice?.asset_id === assetId) fetchDeviceDetail(assetId)
    } catch (err) {
      setAttackLog(prev => [...prev, `Error: ${err}`])
    } finally {
      setAttackRunning(false)
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
    <div className="container" dir={dir}>
      <div className="page-header">
        <div>
          <h1>{tk('devices.title')}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {tk('devices.subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
          {isAdmin && (
            <button
              className="btn btn-sm"
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                fontWeight: 600,
                padding: '0.4rem 1rem',
                marginLeft: '0.5rem'
              }}
              onClick={() => { setShowRegisterModal(true); setDiscoveredDevices([]); setRegisterError(''); setProbeIp(''); }}
            >
              {tk('devices.register')}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>{tk('common.filters')}</h3>
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
              <option value="">{tk('devices.all_zones')}</option>
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
              <option value="">{tk('devices.all_types')}</option>
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
              <option value="">{tk('devices.all_statuses')}</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="isolated">Isolated</option>
              <option value="crashed">Crashed</option>
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
              <option value="">{tk('devices.all_levels')}</option>
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
          <p style={{ color: 'var(--text-secondary)' }}>{tk('devices.loading')}</p>
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

      {/* Register Device Modal */}
      {showRegisterModal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', zIndex: 1100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowRegisterModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-primary)', borderRadius: '0.75rem',
              padding: '2rem', width: '500px', maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Register Physical Device</h2>

            {/* Discover connected devices */}
            <div style={{
              background: 'var(--bg-tertiary)', borderRadius: '0.5rem',
              padding: '1rem', marginBottom: '1.5rem',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>Detect Device</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.75rem' }}>
                  Connect via USB cable or enter IP manually
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <button
                    className="btn btn-sm"
                    style={{
                      backgroundColor: '#10b981', color: 'white', border: 'none',
                      opacity: discovering ? 0.6 : 1, flex: 1, fontWeight: 600,
                      padding: '0.6rem 1rem',
                    }}
                    disabled={discovering}
                    onClick={discoverFromUSB}
                  >
                    {discovering ? 'Reading USB...' : 'Detect from USB Port'}
                  </button>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textAlign: 'center', marginBottom: '0.5rem' }}>
                  or enter IP manually
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="e.g. 172.20.10.4"
                    value={probeIp}
                    onChange={e => setProbeIp(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && probeIp.trim()) discoverFromIP() }}
                    style={{ flex: 1, fontSize: '0.85rem' }}
                  />
                  <button
                    className="btn btn-sm"
                    style={{
                      backgroundColor: '#3b82f6', color: 'white', border: 'none',
                      opacity: discovering ? 0.6 : 1, whiteSpace: 'nowrap',
                    }}
                    disabled={discovering || !probeIp.trim()}
                    onClick={discoverFromIP}
                  >
                    Connect
                  </button>
                </div>
              </div>

              {discoveredDevices.length > 0 && (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {discoveredDevices.map(dev => (
                    <div
                      key={dev.asset_id}
                      onClick={() => selectDiscoveredDevice(dev)}
                      style={{
                        padding: '0.75rem',
                        background: registerForm.asset_id === dev.asset_id ? 'rgba(16,185,129,0.15)' : 'var(--bg-primary)',
                        border: registerForm.asset_id === dev.asset_id ? '2px solid #10b981' : '1px solid var(--border-color)',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{dev.asset_id}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
                            IP: <code style={{ color: 'var(--accent-primary)' }}>{dev.ip_address}</code>
                            {' '} | Zone: {dev.zone}
                            {' '} | Signal: {dev.signal_state}
                            {' '} | Events: {dev.event_count}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {dev.live && (
                            <span style={{
                              display: 'inline-block', width: 8, height: 8,
                              borderRadius: '50%', backgroundColor: '#10b981',
                              boxShadow: '0 0 6px #10b981',
                            }} title="Device online" />
                          )}
                          {dev.live === false && (
                            <span style={{
                              display: 'inline-block', width: 8, height: 8,
                              borderRadius: '50%', backgroundColor: '#ef4444',
                            }} title="Device offline" />
                          )}
                          {registerForm.asset_id === dev.asset_id && (
                            <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>SELECTED</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {discoveredDevices.length === 0 && !discovering && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center', padding: '0.5rem' }}>
                  Click "Detect from USB Port" to auto-detect the connected ESP32
                </div>
              )}
            </div>

            {registerError && (
              <div style={{
                background: '#fee2e2', color: '#dc2626', padding: '0.75rem',
                borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.85rem'
              }}>
                {registerError}
              </div>
            )}

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Device ID *
                </label>
                <input
                  type="text"
                  placeholder="Select a detected device above, or enter manually"
                  value={registerForm.asset_id}
                  onChange={e => setRegisterForm({ ...registerForm, asset_id: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Device Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. ESP32 Physical Traffic Light"
                  value={registerForm.name}
                  onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    Device Type
                  </label>
                  <select
                    value={registerForm.device_type}
                    onChange={e => setRegisterForm({ ...registerForm, device_type: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="physical">Physical</option>
                    <option value="simulated">Simulated</option>
                    <option value="virtual">Virtual</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    Asset Type
                  </label>
                  <select
                    value={registerForm.asset_type}
                    onChange={e => setRegisterForm({ ...registerForm, asset_type: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="traffic_signal">Traffic Signal</option>
                    <option value="traffic_controller">Traffic Controller</option>
                    <option value="traffic_camera">Traffic Camera</option>
                    <option value="iot_sensor">IoT Sensor</option>
                    <option value="environmental_sensor">Environmental Sensor</option>
                    <option value="water_flow_sensor">Water Flow Sensor</option>
                    <option value="parking_sensor">Parking Sensor</option>
                    <option value="network_switch">Network Switch</option>
                    <option value="firewall">Firewall</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  IP Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 172.20.10.4"
                  value={registerForm.ip_address}
                  onChange={e => setRegisterForm({ ...registerForm, ip_address: e.target.value })}
                  style={{ width: '100%' }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                  Required for physical devices — used to send commands
                </span>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  MAC Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. AA:BB:CC:DD:EE:FF"
                  value={registerForm.mac_address}
                  onChange={e => setRegisterForm({ ...registerForm, mac_address: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    Zone
                  </label>
                  <select
                    value={registerForm.zone}
                    onChange={e => setRegisterForm({ ...registerForm, zone: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="zone-a">Zone A</option>
                    <option value="zone-b">Zone B</option>
                    <option value="zone-c">Zone C</option>
                    <option value="zone-d">Zone D</option>
                    <option value="zone-central">Zone Central</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    Criticality
                  </label>
                  <select
                    value={registerForm.criticality}
                    onChange={e => setRegisterForm({ ...registerForm, criticality: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Building / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Intersection, Building A"
                  value={registerForm.building}
                  onChange={e => setRegisterForm({ ...registerForm, building: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowRegisterModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-sm"
                style={{
                  backgroundColor: '#10b981', color: 'white', border: 'none',
                  fontWeight: 600, opacity: registerLoading ? 0.6 : 1,
                }}
                disabled={registerLoading}
                onClick={registerDevice}
              >
                {registerLoading ? 'Registering...' : 'Register Device'}
              </button>
            </div>
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
                  {tk('common.close')}
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
                        <button
                          className="btn btn-sm"
                          style={{
                            backgroundColor: selectedDevice.status === 'isolated' ? '#6b7280' : '#dc2626',
                            color: 'white',
                            border: 'none',
                            cursor: selectedDevice.status === 'isolated' ? 'not-allowed' : 'pointer',
                            opacity: selectedDevice.status === 'isolated' ? 0.6 : 1
                          }}
                          disabled={selectedDevice.status === 'isolated'}
                          onClick={() => {
                            if (confirm(`Isolate device ${selectedDevice.asset_id}? This will cut all network communication.`)) {
                              performDeviceAction(selectedDevice.asset_id, 'isolate')
                            }
                          }}
                        >
                          {selectedDevice.status === 'isolated' ? 'Isolated' : 'Isolate Device'}
                        </button>
                        {selectedDevice.device_type === 'physical' && (
                          <>
                            {!serialConnected && (
                              <button
                                className="btn btn-sm"
                                style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', fontSize: '0.75rem' }}
                                onClick={discoverFromUSB}
                              >
                                Connect USB
                              </button>
                            )}
                            {serialConnected && (
                              <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                                USB Connected
                              </span>
                            )}
                            <button
                              className="btn btn-sm"
                              style={{
                                backgroundColor: attackRunning ? '#6b7280' : '#7c3aed',
                                color: 'white',
                                border: 'none',
                                opacity: (attackRunning || !serialConnected) ? 0.6 : 1
                              }}
                              disabled={attackRunning || !serialConnected || selectedDevice.status === 'crashed'}
                              onClick={() => launchFloodAttack(selectedDevice.asset_id)}
                              title={!serialConnected ? 'Connect USB first' : ''}
                            >
                              {attackRunning ? 'Attacking...' : selectedDevice.status === 'crashed' ? 'Device Crashed' : 'Launch Flood Attack'}
                            </button>
                          </>
                        )}
                      </div>
                      {attackLog.length > 0 && (
                        <div style={{
                          marginTop: '1rem',
                          background: '#0f172a',
                          borderRadius: '0.375rem',
                          padding: '0.75rem',
                          fontFamily: 'monospace',
                          fontSize: '0.7rem',
                          color: '#e2e8f0',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          lineHeight: 1.6,
                        }}>
                          {attackLog.map((line, i) => (
                            <div key={i} style={{
                              color: line.includes('CRASHED') || line.includes('SUCCESSFUL') ? '#ef4444'
                                : line.includes('Phase') ? '#38bdf8'
                                : line.includes('survived') ? '#10b981'
                                : '#e2e8f0'
                            }}>
                              {line || '\u00A0'}
                            </div>
                          ))}
                        </div>
                      )}
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
