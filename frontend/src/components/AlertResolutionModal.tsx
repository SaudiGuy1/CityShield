import { useEffect, useState } from 'react'
import { useLang } from '../hooks/useLang'

export type AlertClassification = 'true_positive' | 'false_positive' | 'benign' | 'informational'

export interface AlertResolution {
  classification: AlertClassification
  resolution_notes: string
  investigation_notes?: string | null
  remediation_notes?: string | null
  resolved_by: string
  resolved_at: string
  last_amended_by?: string | null
  last_amended_at?: string | null
}

const CLASSIFICATION_VALUES: AlertClassification[] = [
  'true_positive',
  'false_positive',
  'benign',
  'informational',
]

const CLASSIFICATION_COLOR: Record<AlertClassification, string> = {
  true_positive: 'var(--accent-danger)',
  false_positive: 'var(--accent-warning)',
  benign: 'var(--accent-primary)',
  informational: 'var(--text-tertiary)',
}

interface Props {
  open: boolean
  alertId: string
  /** When provided, the modal switches to "amend" mode. */
  existingResolution?: AlertResolution | null
  onClose: () => void
  onResolved: () => void
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token')
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' }
}

export default function AlertResolutionModal({ open, alertId, existingResolution, onClose, onResolved }: Props) {
  const { tk, dir } = useLang()
  const amendMode = !!existingResolution
  const [classification, setClassification] = useState<AlertClassification>(
    existingResolution?.classification ?? 'true_positive',
  )
  const [resolutionNotes, setResolutionNotes] = useState(existingResolution?.resolution_notes ?? '')
  const [investigationNotes, setInvestigationNotes] = useState(existingResolution?.investigation_notes ?? '')
  const [remediationNotes, setRemediationNotes] = useState(existingResolution?.remediation_notes ?? '')
  const [amendReason, setAmendReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setClassification(existingResolution?.classification ?? 'true_positive')
      setResolutionNotes(existingResolution?.resolution_notes ?? '')
      setInvestigationNotes(existingResolution?.investigation_notes ?? '')
      setRemediationNotes(existingResolution?.remediation_notes ?? '')
      setAmendReason('')
      setError(null)
    }
  }, [open, existingResolution])

  if (!open) return null

  const trimmedNotes = resolutionNotes.trim()
  const canSubmit = (() => {
    if (submitting) return false
    if (amendMode) return amendReason.trim().length > 0
    return trimmedNotes.length > 0
  })()

  const submit = async () => {
    setError(null)
    setSubmitting(true)
    try {
      let res: Response
      if (amendMode) {
        const body: Record<string, unknown> = { reason: amendReason.trim() }
        if (classification !== existingResolution?.classification) body.classification = classification
        if (resolutionNotes !== (existingResolution?.resolution_notes ?? '') && resolutionNotes.trim()) {
          body.resolution_notes = resolutionNotes
        }
        if (investigationNotes !== (existingResolution?.investigation_notes ?? '')) {
          body.investigation_notes = investigationNotes || null
        }
        if (remediationNotes !== (existingResolution?.remediation_notes ?? '')) {
          body.remediation_notes = remediationNotes || null
        }
        res = await fetch(`/api/alerts/${alertId}/resolution`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch(`/api/alerts/${alertId}/resolve`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            classification,
            resolution_notes: resolutionNotes,
            investigation_notes: investigationNotes || null,
            remediation_notes: remediationNotes || null,
          }),
        })
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail ?? 'Request failed')
        setError(detail)
        return
      }
      onResolved()
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      dir={dir}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="card"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <h3 style={{ marginTop: 0 }}>
          {amendMode ? tk('resolution.title.amend') : tk('resolution.title.resolve')}
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '-0.5rem', fontSize: '0.9rem' }}>
          {amendMode ? tk('resolution.intro.amend') : tk('resolution.intro.resolve')}
        </p>

        <div className="form-group">
          <label className="form-label">{tk('resolution.classification')}</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {CLASSIFICATION_VALUES.map(value => {
              const sel = classification === value
              const color = CLASSIFICATION_COLOR[value]
              return (
                <button
                  type="button"
                  key={value}
                  onClick={() => setClassification(value)}
                  aria-pressed={sel}
                  style={{
                    textAlign: 'start',
                    padding: '0.75rem 0.9rem',
                    borderRadius: '0.5rem',
                    border: `1px solid ${sel ? color : 'var(--border-color)'}`,
                    background: sel ? 'rgba(127, 127, 127, 0.08)' : 'var(--bg-tertiary)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 700, color }}>{tk(`resolution.classification.${value}` as const)}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                    {tk(`resolution.classification.${value}.help` as const)}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            {tk('resolution.notes')} <span style={{ color: 'var(--accent-danger)' }}>*</span>
          </label>
          <textarea
            className="form-control"
            rows={3}
            value={resolutionNotes}
            onChange={e => setResolutionNotes(e.target.value)}
            placeholder={tk('resolution.notes.placeholder')}
            required
          />
          <small style={{ color: 'var(--text-tertiary)' }}>{tk('resolution.notes.required_hint')}</small>
        </div>

        <div className="form-group">
          <label className="form-label">{tk('resolution.investigation')} ({tk('common.optional')})</label>
          <textarea
            className="form-control"
            rows={3}
            value={investigationNotes ?? ''}
            onChange={e => setInvestigationNotes(e.target.value)}
            placeholder={tk('resolution.investigation.placeholder')}
          />
        </div>

        <div className="form-group">
          <label className="form-label">{tk('resolution.remediation')} ({tk('common.optional')})</label>
          <textarea
            className="form-control"
            rows={3}
            value={remediationNotes ?? ''}
            onChange={e => setRemediationNotes(e.target.value)}
            placeholder={tk('resolution.remediation.placeholder')}
          />
        </div>

        {amendMode && (
          <div className="form-group">
            <label className="form-label">
              {tk('resolution.amend_reason')} <span style={{ color: 'var(--accent-danger)' }}>*</span>
            </label>
            <textarea
              className="form-control"
              rows={2}
              value={amendReason}
              onChange={e => setAmendReason(e.target.value)}
              placeholder={tk('resolution.amend_reason.placeholder')}
            />
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--accent-danger)',
            padding: '0.6rem 0.85rem',
            borderRadius: '0.5rem',
            marginBottom: '0.75rem',
          }}>
            <p style={{ color: 'var(--accent-danger)', margin: 0, fontSize: '0.85rem' }}>{error}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            {tk('common.cancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={!canSubmit}>
            {submitting ? tk('resolution.saving') : amendMode ? tk('resolution.save') : tk('resolution.resolve')}
          </button>
        </div>
      </div>
    </div>
  )
}
