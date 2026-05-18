import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AttackEffectivenessAnalyzer from '../components/AttackEffectivenessAnalyzer'
import { useLang } from '../hooks/useLang'

interface ParameterConfig {
  type: string
  description: string
  default: string | number | boolean
  options?: string[]
  min?: number
  max?: number
}

interface AttackTechnique {
  technique: string
  name: string
  description: string
  mitre_technique: string
  tactic?: string
  parameters: Record<string, ParameterConfig>
}

interface AttackConfig {
  technique: string
  parameters: Record<string, string | number | boolean>
}

interface MitreTechnique {
  id: string
  name: string
  tactic: string
}

export default function CustomScenarioBuilder() {
  const { tk, dir } = useLang()
  const [availableTechniques, setAvailableTechniques] = useState<AttackTechnique[]>([])
  const [scenarioName, setScenarioName] = useState('')
  const [scenarioDescription, setScenarioDescription] = useState('')
  const [targetComponent, setTargetComponent] = useState('network_infrastructure')
  const [targetDevice, setTargetDevice] = useState('')
  const [attackChain, setAttackChain] = useState<AttackConfig[]>([])
  const [selectedTechnique, setSelectedTechnique] = useState<AttackTechnique | null>(null)
  const [currentParams, setCurrentParams] = useState<Record<string, string | number | boolean>>({})
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [completedRunId, setCompletedRunId] = useState<string | null>(null)
  const [analysisRunId, setAnalysisRunId] = useState<string | null>(null)
  const [mitreTechniques, setMitreTechniques] = useState<MitreTechnique[]>([])
  const [selectedMitre, setSelectedMitre] = useState<string[]>([])
  const [mitreSearch, setMitreSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchAvailableTechniques()
    fetchMitreTechniques()
  }, [])

  const fetchAvailableTechniques = async () => {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/scenarios/attack-techniques', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setAvailableTechniques(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch attack techniques:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMitreTechniques = async () => {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/mitre/techniques', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) setMitreTechniques(await res.json())
    } catch (err) {
      console.error('Failed to fetch MITRE techniques:', err)
    }
  }

  const toggleMitre = (id: string) => {
    setSelectedMitre(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  const addToChain = () => {
    if (!selectedTechnique) return

    const config: AttackConfig = {
      technique: selectedTechnique.technique,
      parameters: { ...currentParams }
    }

    setAttackChain([...attackChain, config])
    setSelectedTechnique(null)
    setCurrentParams({})
  }

  const removeFromChain = (index: number) => {
    setAttackChain(attackChain.filter((_, i) => i !== index))
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const newChain = [...attackChain]
    ;[newChain[index - 1], newChain[index]] = [newChain[index], newChain[index - 1]]
    setAttackChain(newChain)
  }

  const moveDown = (index: number) => {
    if (index === attackChain.length - 1) return
    const newChain = [...attackChain]
    ;[newChain[index], newChain[index + 1]] = [newChain[index + 1], newChain[index]]
    setAttackChain(newChain)
  }

  const executeScenario = async () => {
    if (!scenarioName || attackChain.length === 0) {
      alert('Please provide scenario name and at least one attack technique')
      return
    }

    setExecuting(true)
    const token = localStorage.getItem('token')

    try {
      const res = await fetch('/api/scenarios/custom', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: scenarioName,
          description: scenarioDescription,
          target_component: targetComponent,
          target_device_id: targetDevice || null,
          attack_chain: attackChain,
          mitre_technique_ids: selectedMitre
        })
      })

      if (res.ok) {
        const run = await res.json()
        setCompletedRunId(run.run_id)

        // Poll for completion
        const pollInterval = setInterval(async () => {
          const statusRes = await fetch(`/api/scenarios/runs/${run.run_id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (statusRes.ok) {
            const runStatus = await statusRes.json()
            if (runStatus.status === 'completed' || runStatus.status === 'failed') {
              clearInterval(pollInterval)
              setExecuting(false)
              if (runStatus.status === 'completed') {
                // Scenario completed successfully
              }
            }
          }
        }, 3000)

        // Clear interval after 10 minutes
        setTimeout(() => clearInterval(pollInterval), 600000)
      } else {
        alert('Failed to execute scenario')
      }
    } catch (err) {
      console.error('Failed to execute scenario:', err)
      alert('Error executing scenario')
    } finally {
      setExecuting(false)
    }
  }

  const renderParameterInput = (paramName: string, paramConfig: ParameterConfig) => {
    const value = currentParams[paramName] ?? paramConfig.default

    if (paramConfig.type === 'boolean') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={value as boolean}
            onChange={e => setCurrentParams({ ...currentParams, [paramName]: e.target.checked })}
          />
          <span>{paramConfig.description}</span>
        </label>
      )
    }

    if (paramConfig.type === 'select') {
      return (
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
            {paramConfig.description}
          </label>
          <select
            value={value as string}
            onChange={e => setCurrentParams({ ...currentParams, [paramName]: e.target.value })}
            style={{ width: '100%' }}
          >
            {paramConfig.options?.map((opt: string) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )
    }

    if (paramConfig.type === 'int') {
      return (
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
            {paramConfig.description}
          </label>
          <input
            type="number"
            value={value as number}
            min={paramConfig.min}
            max={paramConfig.max}
            onChange={e => setCurrentParams({ ...currentParams, [paramName]: parseInt(e.target.value) })}
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
            Range: {paramConfig.min} - {paramConfig.max}
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="container" dir={dir}>
      <div className="page-header">
        <div>
          <h1>{tk('custom_scenario.title')}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {tk('custom_scenario.subtitle')}
          </p>
        </div>
      </div>

      {/* Success Banner */}
      {completedRunId && !executing && (
        <div className="card" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--success)', marginBottom: '1.5rem', padding: '1.5rem' }}>
          <h3 style={{ margin: 0, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
            <span style={{ fontSize: '1.5rem' }}>✓</span>
            Attack Scenario Completed!
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Run ID: <code>{completedRunId}</code>
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              className="btn btn-primary"
              onClick={() => setAnalysisRunId(completedRunId)}
            >
              📊 View Attack Effectiveness Analysis
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setCompletedRunId(null)
                setScenarioName('')
                setScenarioDescription('')
                setAttackChain([])
                setSelectedMitre([])
              }}
            >
              Create Another Scenario
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/scenarios')}
            >
              {tk('custom_scenario.back')}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Left: Configuration */}
        <div>
          {/* Scenario Details */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3>{tk('custom_scenario.details')}</h3>
            <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  {tk('custom_scenario.name')}
                </label>
                <input
                  type="text"
                  value={scenarioName}
                  onChange={e => setScenarioName(e.target.value)}
                  placeholder={tk('custom_scenario.name_placeholder')}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Description
                </label>
                <textarea
                  value={scenarioDescription}
                  onChange={e => setScenarioDescription(e.target.value)}
                  placeholder="Describe the attack scenario and objectives..."
                  rows={3}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  {tk('custom_scenario.target_component')}
                </label>
                <select
                  value={targetComponent}
                  onChange={e => setTargetComponent(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="traffic_management">{tk('custom_scenario.comp_traffic')}</option>
                  <option value="iot_sensors">{tk('custom_scenario.comp_iot')}</option>
                  <option value="network_infrastructure">{tk('custom_scenario.comp_network')}</option>
                  <option value="security">{tk('custom_scenario.comp_security')}</option>
                  <option value="industrial_systems">{tk('custom_scenario.comp_industrial')}</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  {tk('custom_scenario.target_device')}
                </label>
                <input
                  type="text"
                  value={targetDevice}
                  onChange={e => setTargetDevice(e.target.value)}
                  placeholder={tk('custom_scenario.target_device_placeholder')}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  {tk('custom_scenario.mitre_techniques')}
                </label>
                {selectedMitre.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    {selectedMitre.map(id => {
                      const t = mitreTechniques.find(m => m.id === id)
                      return (
                        <span
                          key={id}
                          className="badge badge-info"
                          style={{ cursor: 'pointer', fontSize: '0.7rem' }}
                          onClick={() => toggleMitre(id)}
                          title="Click to remove"
                        >
                          {id}{t ? ` ${t.name}` : ''} ✕
                        </span>
                      )
                    })}
                  </div>
                )}
                <input
                  type="text"
                  value={mitreSearch}
                  onChange={e => setMitreSearch(e.target.value)}
                  placeholder="Search techniques by ID or name..."
                  style={{ width: '100%', marginBottom: '0.5rem' }}
                />
                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '0.375rem', padding: '0.5rem' }}>
                  {mitreTechniques
                    .filter(t => {
                      if (!mitreSearch) return true
                      const q = mitreSearch.toLowerCase()
                      return t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || t.tactic.toLowerCase().includes(q)
                    })
                    .map(t => (
                      <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedMitre.includes(t.id)}
                          onChange={() => toggleMitre(t.id)}
                        />
                        <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{t.id}</span>
                        {t.name}
                      </label>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Available Techniques */}
          <div className="card">
            <h3>{tk('custom_scenario.available_techniques')}</h3>
            {loading ? (
              <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>{tk('custom_scenario.loading_techniques')}</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
                {availableTechniques.map(tech => (
                  <div
                    key={tech.technique}
                    onClick={() => {
                      setSelectedTechnique(tech)
                      // Initialize with default values
                      const defaults: Record<string, string | number | boolean> = {}
                      Object.entries(tech.parameters).forEach(([name, config]) => {
                        defaults[name] = config.default
                      })
                      setCurrentParams(defaults)
                    }}
                    className="card"
                    style={{
                      cursor: 'pointer',
                      padding: '1rem',
                      border: selectedTechnique?.technique === tech.technique ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      background: selectedTechnique?.technique === tech.technique ? 'var(--bg-tertiary)' : 'var(--bg-card)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{tech.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                          {tech.description}
                        </div>
                        <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                          {tech.mitre_technique}
                        </span>
                        {tech.tactic && (
                          <span className="badge badge-secondary" style={{ fontSize: '0.6rem' }}>
                            {tech.tactic}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Parameter Configuration */}
            {selectedTechnique && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                <h4>{tk('custom_scenario.configure_params')}</h4>
                <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                  {Object.entries(selectedTechnique.parameters).map(([paramName, paramConfig]) => (
                    <div key={paramName}>
                      {renderParameterInput(paramName, paramConfig)}
                    </div>
                  ))}
                </div>
                <button
                  className="btn btn-primary"
                  onClick={addToChain}
                  style={{ marginTop: '1rem', width: '100%' }}
                >
                  {tk('custom_scenario.add_to_chain')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Attack Chain */}
        <div>
          <div className="card">
            <h3>Attack Chain ({attackChain.length} techniques)</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Techniques will execute in order from top to bottom
            </p>

            {attackChain.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
                <p style={{ color: 'var(--text-tertiary)' }}>
                  No techniques added yet. Select a technique from the left to begin building your attack chain.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {attackChain.map((config, index) => {
                  const tech = availableTechniques.find(t => t.technique === config.technique)
                  if (!tech) return null

                  return (
                    <div
                      key={index}
                      className="card"
                      style={{
                        padding: '1rem',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        borderLeft: '4px solid var(--accent-primary)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style={{
                              background: 'var(--accent-primary)',
                              color: 'white',
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}>
                              {index + 1}
                            </span>
                            <span style={{ fontWeight: 600 }}>{tech.name}</span>
                            <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                              {tech.mitre_technique}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginLeft: '2rem' }}>
                            {Object.entries(config.parameters).map(([key, val]) => (
                              <div key={key}>
                                <strong>{key}:</strong> {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                          <button
                            className="btn btn-sm"
                            onClick={() => moveUp(index)}
                            disabled={index === 0}
                            style={{ padding: '0.25rem 0.5rem' }}
                          >
                            ↑
                          </button>
                          <button
                            className="btn btn-sm"
                            onClick={() => moveDown(index)}
                            disabled={index === attackChain.length - 1}
                            style={{ padding: '0.25rem 0.5rem' }}
                          >
                            ↓
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => removeFromChain(index)}
                            style={{ padding: '0.25rem 0.5rem' }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {attackChain.length > 0 && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                <button
                  className="btn btn-success"
                  onClick={executeScenario}
                  disabled={executing || !scenarioName}
                  style={{ width: '100%', padding: '0.75rem' }}
                >
                  {executing ? 'Executing Attack...' : `Execute Attack Scenario (${attackChain.length} techniques)`}
                </button>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.5rem', textAlign: 'center' }}>
                  This will generate real attack traffic and events
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attack Effectiveness Analyzer */}
      {analysisRunId && (
        <AttackEffectivenessAnalyzer
          runId={analysisRunId}
          onClose={() => setAnalysisRunId(null)}
        />
      )}
    </div>
  )
}
