import { useState, useEffect } from 'react'
import anime from 'animejs'

export default function ScenarioBuilder() {
  const [scenarios, setScenarios] = useState<any[]>([])
  const [runs, setRuns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000) // Poll for updates
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    await Promise.all([fetchScenarios(), fetchRuns()])
    setLoading(false)
  }

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

  const runScenario = async (scenarioId: string) => {
    setRunning({ ...running, [scenarioId]: true })

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/scenarios/runs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ scenario_id: scenarioId })
      })

      if (res.ok) {
        // Animate success
        anime({
          targets: `#scenario-${scenarioId}`,
          scale: [1, 1.05, 1],
          duration: 300
        })
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
    switch(attackPattern) {
      case 'DDoS': return '🌊'
      case 'Brute Force': return '🔨'
      case 'Port Scan': return '🔍'
      case 'Malware': return '🦠'
      case 'Data Exfiltration': return '📤'
      case 'SQL Injection': return '💉'
      default: return '⚠️'
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'running': return 'badge-warning'
      case 'completed': return 'badge-success'
      case 'failed': return 'badge-danger'
      default: return 'badge-secondary'
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>Attack Scenario Builder</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Launch cyber attack simulations for testing detection rules</p>
        </div>
      </div>

      {/* Quick Launch Attacks */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Quick Launch Attacks</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Launch common attack patterns directly to test your defenses
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <button
            className="btn btn-danger"
            style={{ padding: '1rem', fontSize: '1rem' }}
            onClick={() => {
              const ddosScenario = scenarios.find(s => s.attack_pattern === 'DDoS')
              if (ddosScenario) runScenario(ddosScenario.scenario_id)
            }}
          >
            🌊 Launch DDoS
          </button>
          <button
            className="btn btn-danger"
            style={{ padding: '1rem', fontSize: '1rem' }}
            onClick={() => {
              const scanScenario = scenarios.find(s => s.attack_pattern === 'Port Scan')
              if (scanScenario) runScenario(scanScenario.scenario_id)
            }}
          >
            🔍 Port Scan
          </button>
          <button
            className="btn btn-danger"
            style={{ padding: '1rem', fontSize: '1rem' }}
            onClick={() => {
              const bruteForceScenario = scenarios.find(s => s.attack_pattern === 'Brute Force')
              if (bruteForceScenario) runScenario(bruteForceScenario.scenario_id)
            }}
          >
            🔨 Brute Force
          </button>
          <button
            className="btn btn-danger"
            style={{ padding: '1rem', fontSize: '1rem' }}
            onClick={() => {
              const malwareScenario = scenarios.find(s => s.attack_pattern === 'Malware')
              if (malwareScenario) runScenario(malwareScenario.scenario_id)
            }}
          >
            🦠 Malware Attack
          </button>
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
                      <span style={{ fontSize: '1.5rem' }}>{getAttackIcon(scenario.attack_pattern)}</span>
                      {scenario.name}
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
                      {scenario.description}
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                      <div>
                        <strong style={{ color: 'var(--text-tertiary)' }}>Pattern:</strong>{' '}
                        <span className="badge badge-danger">{scenario.attack_pattern}</span>
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
                  </div>
                  <button
                    className={`btn ${running[scenario.scenario_id] ? 'btn-secondary' : 'btn-danger'}`}
                    onClick={() => runScenario(scenario.scenario_id)}
                    disabled={running[scenario.scenario_id]}
                    style={{ minWidth: '120px' }}
                  >
                    {running[scenario.scenario_id] ? 'Starting...' : 'Run Scenario'}
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
            <table className="table">
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Scenario</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Duration</th>
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
                            <span>{getAttackIcon(scenario.attack_pattern)}</span>
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
                      <td style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                        {new Date(run.started_at).toLocaleString()}
                      </td>
                      <td>
                        {scenario ? `${scenario.duration_seconds}s` : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
