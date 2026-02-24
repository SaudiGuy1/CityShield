import { useState, useEffect, useCallback } from 'react'
import ResearcherTerminal from './ResearcherTerminal'

interface LabStatus {
  status: string
  container_id: string | null
  name: string
  provisioned: boolean
  targets?: { metasploitable?: boolean }
}

export default function ResearchLab() {
  const [labStatus, setLabStatus] = useState<LabStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [connected, setConnected] = useState(false)
  const token = localStorage.getItem('token') || ''

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/lab/status', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setLabStatus(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch lab status:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const doAction = async (action: string, method = 'POST') => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/lab/${action}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setLabStatus(await res.json())
      } else {
        const err = await res.json().catch(() => ({ detail: 'Action failed' }))
        alert(err.detail || 'Action failed')
      }
    } catch (err) {
      console.error(err)
      alert('Network error')
    } finally {
      setActionLoading(false)
    }
  }

  const isRunning = labStatus?.status === 'running'
  const isProvisioned = labStatus?.provisioned === true
  const isStopped = labStatus?.status === 'exited'

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading lab status...</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Status bar */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: isRunning ? '#22c55e' : '#6b7280',
              display: 'inline-block',
              boxShadow: isRunning ? '0 0 8px #22c55e' : 'none',
            }}
          />
          <span style={{ fontWeight: 600 }}>Research Lab</span>
          <span
            className={`badge ${isRunning ? 'badge-success' : isStopped ? 'badge-warning' : 'badge-info'}`}
          >
            {labStatus?.status || 'unknown'}
          </span>
          {isRunning && connected && (
            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
              Terminal Connected
            </span>
          )}
          {isRunning && labStatus?.targets?.metasploitable && (
            <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
              Metasploitable Reachable
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {!isProvisioned && (
            <button
              className="btn btn-primary"
              onClick={() => doAction('provision')}
              disabled={actionLoading}
            >
              {actionLoading ? 'Provisioning...' : 'Provision Lab'}
            </button>
          )}
          {isStopped && (
            <button
              className="btn btn-primary"
              onClick={() => doAction('start')}
              disabled={actionLoading}
            >
              {actionLoading ? 'Starting...' : 'Start'}
            </button>
          )}
          {isRunning && (
            <button
              className="btn btn-warning"
              onClick={() => doAction('stop')}
              disabled={actionLoading}
              style={{
                background: 'rgba(234, 179, 8, 0.15)',
                borderColor: 'rgba(234, 179, 8, 0.4)',
                color: '#eab308',
              }}
            >
              {actionLoading ? 'Stopping...' : 'Stop'}
            </button>
          )}
          {isProvisioned && !isRunning && (
            <button
              className="btn btn-danger"
              onClick={() => doAction('remove', 'DELETE')}
              disabled={actionLoading}
              style={{ fontSize: '0.85rem' }}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Terminal or placeholder */}
      {isRunning ? (
        <div
          className="card"
          style={{
            padding: '0.5rem',
            height: 'calc(100vh - 280px)',
            minHeight: '400px',
            overflow: 'hidden',
          }}
        >
          <ResearcherTerminal
            token={token}
            onConnectionChange={setConnected}
          />
        </div>
      ) : (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#128421;</div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            {isProvisioned ? 'Lab Stopped' : 'No Lab Provisioned'}
          </h3>
          <p style={{ maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
            {isProvisioned
              ? 'Your lab container is stopped. Click "Start" to resume your session. Your files are preserved.'
              : 'Provision a personal Linux lab environment with security tools (nmap, hydra, nikto, etc.) connected to the CityShield network. Your home directory is persisted across sessions.'}
          </p>
        </div>
      )}
    </div>
  )
}
