import { useState, useEffect } from 'react'

interface AttackEffectivenessProps {
  runId: string
  onClose: () => void
}

interface TechniqueResult {
  technique: string
  status: string
  events_generated: number
  detection_expected: boolean
  mitre_technique: string
  [key: string]: any
}

interface DetectionGap {
  technique: string
  mitre_id: string
  events_generated: number
  reason: string
}

interface EffectivenessResults {
  run_id: string
  techniques_executed: TechniqueResult[]
  total_events_generated: number
  alerts_triggered: number
  detection_gaps: DetectionGap[]
  timeline: Array<{
    timestamp: string
    technique: string
    result: TechniqueResult
  }>
}

export default function AttackEffectivenessAnalyzer({ runId, onClose }: AttackEffectivenessProps) {
  const [results, setResults] = useState<EffectivenessResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchResults()
  }, [runId])

  const fetchResults = async () => {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`/api/scenarios/runs/${runId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const run = await res.json()
        setResults(run.results)
      } else {
        setError('Failed to load attack results')
      }
    } catch (err) {
      setError('Error loading results')
    } finally {
      setLoading(false)
    }
  }

  const getDetectionRate = () => {
    if (!results) return 0
    const expected = results.techniques_executed.filter(t => t.detection_expected).length
    if (expected === 0) return 100
    const detected = expected - results.detection_gaps.length
    return Math.round((detected / expected) * 100)
  }

  if (loading) {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={panelStyle} onClick={e => e.stopPropagation()}>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading analysis...</p>
        </div>
      </div>
    )
  }

  if (error || !results) {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={panelStyle} onClick={e => e.stopPropagation()}>
          <h2>Analysis Error</h2>
          <p style={{ color: 'var(--danger)' }}>{error || 'No results available'}</p>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    )
  }

  const detectionRate = getDetectionRate()

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={panelStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>Attack Effectiveness Analysis</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Run ID: <code>{runId.substring(0, 12)}</code>
            </p>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '0.5rem 1rem' }}>
            ✕
          </button>
        </div>

        {/* Detection Rate Summary */}
        <div className="card" style={{ background: 'var(--bg-tertiary)', marginBottom: '1.5rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>
                Detection Rate
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 700, color: detectionRate >= 80 ? 'var(--success)' : detectionRate >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                {detectionRate}%
              </div>
            </div>
            <div style={{ flex: 2, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Techniques Executed</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{results.techniques_executed.length}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Events Generated</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{results.total_events_generated}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Alerts Triggered</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--accent-primary)' }}>{results.alerts_triggered}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Detection Gaps */}
        {results.detection_gaps.length > 0 && (
          <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', marginBottom: '1.5rem', padding: '1.5rem' }}>
            <h3 style={{ margin: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              Detection Gaps Identified ({results.detection_gaps.length})
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              These attack techniques were expected to trigger alerts but went undetected:
            </p>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {results.detection_gaps.map((gap, idx) => (
                <div key={idx} className="card" style={{ padding: '1rem', background: 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{gap.technique}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        MITRE: {gap.mitre_id} • {gap.events_generated} events generated
                      </div>
                    </div>
                    <span className="badge badge-danger">Undetected</span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    {gap.reason}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technique Execution Timeline */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: 0, marginBottom: '1rem' }}>Attack Execution Timeline</h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {results.techniques_executed.map((technique, idx) => {
              const wasDetected = technique.detection_expected && !results.detection_gaps.some(
                gap => gap.mitre_id === technique.mitre_technique
              )
              const shouldHaveBeenDetected = technique.detection_expected

              return (
                <div
                  key={idx}
                  className="card"
                  style={{
                    padding: '1rem',
                    background: 'var(--bg-tertiary)',
                    borderLeft: `4px solid ${shouldHaveBeenDetected ? (wasDetected ? 'var(--success)' : 'var(--danger)') : 'var(--text-tertiary)'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
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
                          {idx + 1}
                        </span>
                        <span style={{ fontWeight: 600 }}>{technique.technique}</span>
                        <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                          {technique.mitre_technique}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginLeft: '2rem' }}>
                        Status: <strong>{technique.status}</strong> •
                        Events: <strong>{technique.events_generated}</strong>
                        {Object.keys(technique).filter(k => !['technique', 'status', 'events_generated', 'detection_expected', 'mitre_technique'].includes(k)).map(key => (
                          <span key={key}> • {key}: <strong>{String(technique[key])}</strong></span>
                        ))}
                      </div>
                    </div>
                    <div>
                      {shouldHaveBeenDetected ? (
                        wasDetected ? (
                          <span className="badge badge-success">✓ Detected</span>
                        ) : (
                          <span className="badge badge-danger">✗ Missed</span>
                        )
                      ) : (
                        <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                          Not Expected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recommendations */}
        {results.detection_gaps.length > 0 && (
          <div className="card" style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--accent-primary)' }}>
            <h3 style={{ margin: 0, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>💡</span>
              Recommendations
            </h3>
            <ul style={{ marginLeft: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <li>Review detection rules for MITRE techniques: {results.detection_gaps.map(g => g.mitre_id).join(', ')}</li>
              <li>Adjust rule thresholds to detect lower-volume attacks</li>
              <li>Consider adding correlation rules that combine multiple weak signals</li>
              <li>Review log sources - ensure all attack events are being collected</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.7)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
}

const panelStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '0.75rem',
  padding: '2rem',
  width: '900px',
  maxWidth: '95vw',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
}
