import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import anime from 'animejs'
import type { ActiveAttack } from '../App'
import AttackEffectivenessAnalyzer from '../components/AttackEffectivenessAnalyzer'
import ResearchLab from '../components/ResearchLab'
import { formatDateTimeWithSeconds } from '../utils/datetime'

interface ScenarioBuilderProps {
  onAttackLaunched: (attack: ActiveAttack) => void
}

interface DeviceTarget {
  id: string
  name: string
  category: string
  zone: string
}

interface MitreTechLookup {
  id: string
  name: string
}

export default function ScenarioBuilder({ onAttackLaunched }: ScenarioBuilderProps) {
  const [scenarios, setScenarios] = useState<{ scenario_id: string; name?: string; description?: string; attack_pattern?: string; target_component?: string; components?: string[]; duration_seconds?: number; category?: string; mitre_technique_ids?: string[] }[]>([])
  const [runs, setRuns] = useState<{ run_id: string; scenario_id: string; status: string; started_at?: string; scenario_name?: string; target_device_id?: string; results?: Record<string, unknown> }[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState<{ [key: string]: boolean }>({})
  const [targetModal, setTargetModal] = useState<{ scenarioId: string; targetComponent: string } | null>(null)
  const [devices, setDevices] = useState<DeviceTarget[]>([])
  const [analysisRunId, setAnalysisRunId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'scenarios' | 'lab'>('scenarios')
  const [mitreLookup, setMitreLookup] = useState<MitreTechLookup[]>([])
  const navigate = useNavigate()

  const fetchData = useCallback(async () => {
    await Promise.all([fetchScenarios(), fetchRuns()])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
    // Fetch MITRE techniques for name lookup (once)
  }, [fetchData])

  useEffect(() => {
    const fetchMitre = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/mitre/techniques', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) setMitreLookup(await res.json())
      } catch { /* ignore */ }
    }
    fetchMitre()
  }, [])

  const fetchScenarios = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/scenarios', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) setScenarios(await res.json())
    } catch (err) {
      console.error(err)
    }
  }

  const fetchRuns = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/scenarios/runs', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) setRuns(await res.json())
    } catch (err) {
      console.error(err)
    }
  }

  const fetchDevices = async (targetComponent: string) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/overview/city-components', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const all: DeviceTarget[] = await res.json()
        // Map scenario target_component to category/zone filtering
        const zoneMap: Record<string, string> = {
          traffic_management: 'zone-a',
          traffic_sim: 'zone-a',
          iot_sensors: 'zone-b',
          iot_sim: 'zone-b',
          network_infrastructure: 'zone-c',
          network_emulator: 'zone-c',
          security: 'zone-d',
          industrial_systems: 'zone-e',
        }
        const targetZone = zoneMap[targetComponent]
        if (targetZone) {
          setDevices(all.filter(d => d.zone === targetZone))
        } else {
          setDevices(all)
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const openTargetModal = async (scenarioId: string) => {
    const scenario = scenarios.find(s => s.scenario_id === scenarioId)
    if (!scenario) return
    const targetComponent = scenario.components?.[0] || scenario.target_component || 'unknown'
    setTargetModal({ scenarioId, targetComponent })
    await fetchDevices(targetComponent)
  }

  const runScenario = async (scenarioId: string, targetDeviceId?: string) => {
    setTargetModal(null)
    setRunning({ ...running, [scenarioId]: true })

    try {
      const token = localStorage.getItem('token')
      const body: Record<string, string> = { scenario_id: scenarioId }
      if (targetDeviceId) body.target_device_id = targetDeviceId

      const res = await fetch('/api/scenarios/runs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        const run = await res.json()
        const scenario = scenarios.find(s => s.scenario_id === scenarioId)

        // Animate success
        anime({
          targets: `#scenario-${scenarioId}`,
          scale: [1, 1.05, 1],
          duration: 300
        })

        // Signal attack started and navigate to map
        if (scenario) {
          onAttackLaunched({
            runId: run.run_id,
            scenarioId: scenarioId,
            scenarioName: scenario.name || 'Unknown Scenario',
            attackPattern: scenario.attack_pattern || 'Unknown',
            targetComponent: scenario.components?.[0] || scenario.target_component || 'unknown',
            durationSeconds: scenario.duration_seconds || 60,
            startedAt: new Date().toISOString(),
            targetDeviceId: targetDeviceId || run.target_device_id,
          })
          navigate('/')
        }

        await fetchData()
      } else {
        alert('Failed to start scenario')
      }
    } catch (err) {
      console.error(err)
      alert('Error starting scenario')
    } finally {
      setTimeout(() => {
        setRunning({ ...running, [scenarioId]: false })
      }, 1000)
    }
  }

  const getAttackIcon = (attackPattern: string) => {
    switch (attackPattern) {
      case 'DDoS': return '\u{1F30A}'
      case 'Brute Force': return '\u{1F528}'
      case 'Port Scan': return '\u{1F50D}'
      case 'Malware': return '\u{1F9A0}'
      case 'Data Exfiltration': return '\u{1F4E4}'
      case 'SQL Injection': return '\u{1F489}'
      default: return '\u{26A0}\u{FE0F}'
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'running': return 'badge-warning'
      case 'completed': return 'badge-success'
      case 'failed': return 'badge-danger'
      default: return 'badge-info'
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>Attack Scenario Builder</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Launch attack simulations or open your personal research lab</p>
        </div>
        {activeTab === 'scenarios' && (
          <button
            className="btn btn-primary"
            onClick={() => navigate('/scenarios/custom')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span style={{ fontSize: '1.2rem' }}>⚙️</span>
            Custom Scenario Builder
          </button>
        )}
      </div>

      {/* Tab Bar */}
      <div style={{
        display: 'flex',
        gap: '0',
        marginBottom: '1.5rem',
        borderBottom: '1px solid var(--border-color)',
      }}>
        {([
          { key: 'scenarios' as const, label: 'Attack Scenarios' },
          { key: 'lab' as const, label: 'Research Lab' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
              fontWeight: activeTab === tab.key ? 600 : 400,
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'lab' && <ResearchLab />}

      {activeTab === 'scenarios' && <>

      {/* Target Selection Modal */}
      {targetModal && (
        <div style={modalOverlayStyle} onClick={() => setTargetModal(null)}>
          <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 0.75rem', color: 'var(--text-primary)' }}>Select Target Device</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Choose a specific device to target or let the system pick randomly
            </p>
            <div style={{ display: 'grid', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
              <button
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '0.75rem' }}
                onClick={() => runScenario(targetModal.scenarioId)}
              >
                Random Target
              </button>
              {devices.map(device => (
                <button
                  key={device.id}
                  className="btn btn-danger"
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: 'var(--text-primary)' }}
                  onClick={() => runScenario(targetModal.scenarioId, device.id)}
                >
                  <span style={{ fontWeight: 600 }}>{device.name}</span>
                  <span style={{ color: 'var(--text-tertiary)', marginLeft: '0.5rem', fontSize: '0.8rem' }}>{device.id}</span>
                </button>
              ))}
            </div>
            <button
              className="btn btn-secondary"
              style={{ marginTop: '1rem', width: '100%' }}
              onClick={() => setTargetModal(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Quick Launch */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Quick Launch Attacks</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Launch an attack and automatically switch to the 3D city map to watch it unfold in real-time
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {[
            { pattern: 'DDoS', icon: '\u{1F30A}', label: 'Launch DDoS' },
            { pattern: 'Port Scan', icon: '\u{1F50D}', label: 'Port Scan' },
            { pattern: 'Brute Force', icon: '\u{1F528}', label: 'Brute Force' },
            { pattern: 'Malware', icon: '\u{1F9A0}', label: 'Malware Attack' },
          ].map(({ pattern, icon, label }) => (
            <button
              key={pattern}
              className="btn btn-danger"
              style={{ padding: '1rem', fontSize: '1rem' }}
              onClick={() => {
                const s = scenarios.find(sc => sc.attack_pattern === pattern)
                if (s) openTargetModal(s.scenario_id)
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Available Scenarios */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Available Attack Scenarios</h3>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>Loading scenarios...</p>
        ) : scenarios.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No scenarios available</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
            {scenarios.map(scenario => (
              <div
                key={scenario.scenario_id}
                id={`scenario-${scenario.scenario_id}`}
                className="card"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  padding: '1.5rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>{getAttackIcon(scenario.attack_pattern || '')}</span>
                      {scenario.name}
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
                      {scenario.description}
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                      <div>
                        <strong style={{ color: 'var(--text-tertiary)' }}>Pattern:</strong>{' '}
                        <span className="badge badge-danger">{scenario.attack_pattern}</span>
                        {scenario.category === 'owasp' && (
                          <span className="badge badge-warning" style={{ marginLeft: '0.5rem' }}>OWASP</span>
                        )}
                      </div>
                      <div>
                        <strong style={{ color: 'var(--text-tertiary)' }}>Duration:</strong>{' '}
                        <code>{scenario.duration_seconds}s</code>
                      </div>
                      {scenario.target_component && (
                        <div>
                          <strong style={{ color: 'var(--text-tertiary)' }}>Target:</strong>{' '}
                          <code>{scenario.target_component}</code>
                        </div>
                      )}
                    </div>
                    {scenario.mitre_technique_ids && scenario.mitre_technique_ids.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        {scenario.mitre_technique_ids.slice(0, 3).map(id => {
                          const t = mitreLookup.find(m => m.id === id)
                          return (
                            <span key={id} className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                              {id}{t ? `: ${t.name}` : ''}
                            </span>
                          )
                        })}
                        {scenario.mitre_technique_ids.length > 3 && (
                          <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>
                            +{scenario.mitre_technique_ids.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    className={`btn ${running[scenario.scenario_id] ? 'btn-secondary' : 'btn-danger'}`}
                    onClick={() => openTargetModal(scenario.scenario_id)}
                    disabled={running[scenario.scenario_id]}
                    style={{ minWidth: '140px' }}
                  >
                    {running[scenario.scenario_id] ? 'Launching...' : 'Run & Watch'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Runs */}
      <div className="card">
        <h3>Recent Scenario Runs</h3>
        {runs.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
            No scenarios have been run yet. Launch a scenario above to begin testing.
          </p>
        ) : (
          <div className="table-responsive" style={{ marginTop: '1rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Scenario</th>
                  <th>Status</th>
                  <th>Target</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.slice(0, 10).map(run => {
                  const scenario = scenarios.find(s => s.scenario_id === run.scenario_id)
                  return (
                    <tr key={run.run_id}>
                      <td><code>{run.run_id.substring(0, 8)}</code></td>
                      <td>
                        {scenario ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>{getAttackIcon(scenario.attack_pattern || '')}</span>
                            <span>{scenario.name}</span>
                          </div>
                        ) : (
                          run.scenario_id.substring(0, 8)
                        )}
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(run.status)}`}>
                          {run.status}
                        </span>
                      </td>
                      <td>
                        <code style={{ fontSize: '0.8rem' }}>{run.target_device_id || '-'}</code>
                      </td>
                      <td style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                        {formatDateTimeWithSeconds(run.started_at || '')}
                      </td>
                      <td>
                        {scenario ? `${scenario.duration_seconds}s` : '-'}
                      </td>
                      <td>
                        {run.status === 'completed' && run.results ? (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => setAnalysisRunId(run.run_id)}
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                          >
                            📊 View Analysis
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attack Effectiveness Analyzer */}
      {analysisRunId && (
        <AttackEffectivenessAnalyzer
          runId={analysisRunId}
          onClose={() => setAnalysisRunId(null)}
        />
      )}

      </>}
    </div>
  )
}

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.6)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
}

const modalContentStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '0.75rem',
  padding: '1.5rem',
  width: '400px',
  maxWidth: '90vw',
  boxShadow: 'var(--shadow-lg)',
}
