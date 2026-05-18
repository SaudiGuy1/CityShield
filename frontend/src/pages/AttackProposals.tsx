import { useState, useEffect, useCallback } from 'react'
import { useLang } from '../hooks/useLang'

interface Proposal {
  proposal_id: string
  title: string
  description: string
  technique_ids: string[]
  target_component: string
  attack_pattern: string
  duration_seconds: number
  parameters: Record<string, unknown>
  submitted_by: string
  submitted_at: string
  status: string
  reviewed_by?: string
  reviewed_at?: string
  review_comment?: string
  scenario_id?: string
}

interface MitreTechnique {
  id: string
  name: string
  tactic: string
}

const COMPONENTS = [
  { value: 'network_infrastructure', label: 'Network Infrastructure' },
  { value: 'traffic_management', label: 'Traffic Management' },
  { value: 'iot_sensors', label: 'IoT Sensors' },
  { value: 'security', label: 'Security Operations' },
  { value: 'industrial_systems', label: 'Industrial Systems' },
  { value: 'cyber_range', label: 'Cyber Range' },
]

const ATTACK_PATTERNS = ['Port Scan', 'Brute Force', 'DDoS', 'Data Exfiltration', 'Malware', 'Ransomware']

const statusBadge = (status: string) => {
  switch (status) {
    case 'pending': return 'badge-info'
    case 'approved': return 'badge-success'
    case 'rejected': return 'badge-danger'
    default: return 'badge-secondary'
  }
}

const formatDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return d }
}

export default function AttackProposals({ user }: { user: { username?: string; role?: string } | null }) {
  const { tk, dir } = useLang()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('')
  const [techniques, setTechniques] = useState<MitreTechnique[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    technique_ids: [] as string[],
    target_component: 'network_infrastructure',
    attack_pattern: 'Port Scan',
    duration_seconds: 300,
    parameters: {} as Record<string, unknown>,
  })

  const [reviewModal, setReviewModal] = useState<Proposal | null>(null)
  const [reviewComment, setReviewComment] = useState('')

  const isAdmin = user?.role === 'Administrator'

  const fetchProposals = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/proposals' + (filter ? `?status=${filter}` : ''), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) setProposals(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchProposals()
    const fetchTechniques = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/mitre/techniques', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) setTechniques(await res.json())
      } catch { /* ignore */ }
    }
    fetchTechniques()
  }, [fetchProposals])

  useEffect(() => {
    setLoading(true)
    fetchProposals()
  }, [fetchProposals])

  const submitProposal = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!formData.title || !formData.description) {
      setError('Title and description are required')
      return
    }
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setSuccess('Proposal submitted successfully!')
        setShowForm(false)
        setFormData({ title: '', description: '', technique_ids: [], target_component: 'network_infrastructure', attack_pattern: 'Port Scan', duration_seconds: 300, parameters: {} })
        await fetchProposals()
      } else {
        const data = await res.json()
        setError(data.detail || 'Failed to submit proposal')
      }
    } catch { setError('Error submitting proposal') }
  }

  const reviewProposal = async (status: string) => {
    if (!reviewModal) return
    setError('')
    setSuccess('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/proposals/${reviewModal.proposal_id}/review`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, review_comment: reviewComment }),
      })
      if (res.ok) {
        setSuccess(`Proposal ${status}!`)
        setReviewModal(null)
        setReviewComment('')
        await fetchProposals()
      } else {
        const data = await res.json()
        setError(data.detail || 'Failed to review proposal')
      }
    } catch { setError('Error reviewing proposal') }
  }

  const toggleTechnique = (id: string) => {
    setFormData(prev => ({
      ...prev,
      technique_ids: prev.technique_ids.includes(id)
        ? prev.technique_ids.filter(t => t !== id)
        : [...prev.technique_ids, id]
    }))
  }

  return (
    <div className="container" dir={dir}>
      <div className="page-header">
        <div>
          <h1>{tk('proposals.title')}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {isAdmin ? tk('proposals.subtitle_admin') : tk('proposals.subtitle_user')}
          </p>
        </div>
        {(user?.role === 'Researcher' || isAdmin) && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            {tk('proposals.submit')}
          </button>
        )}
      </div>

      {error && (
        <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-danger)', marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--accent-danger)', margin: 0 }}>{error}</p>
        </div>
      )}
      {success && (
        <div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-success)', marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--accent-success)', margin: 0 }}>{success}</p>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['', 'pending', 'approved', 'rejected'].map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f)}
          >
            {f === '' ? tk('proposals.all') : f === 'pending' ? tk('proposals.pending') : f === 'approved' ? tk('proposals.approved') : tk('proposals.rejected')}
          </button>
        ))}
      </div>

      {/* Submit Proposal Modal */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowForm(false)}>
          <div className="card" style={{ maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3>{tk('proposals.submit_title')}</h3>
            <form onSubmit={submitProposal} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label">{tk('proposals.form_title')}</label>
                <input type="text" className="form-control" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">{tk('proposals.form_desc')}</label>
                <textarea className="form-control" rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">{tk('proposals.form_target')}</label>
                <select className="form-control" value={formData.target_component} onChange={e => setFormData({ ...formData, target_component: e.target.value })}>
                  {COMPONENTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{tk('proposals.form_pattern')}</label>
                <select className="form-control" value={formData.attack_pattern} onChange={e => setFormData({ ...formData, attack_pattern: e.target.value })}>
                  {ATTACK_PATTERNS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{tk('proposals.form_duration')}</label>
                <input type="number" className="form-control" min={60} max={3600} value={formData.duration_seconds} onChange={e => setFormData({ ...formData, duration_seconds: parseInt(e.target.value) || 300 })} />
              </div>
              <div className="form-group">
                <label className="form-label">{tk('proposals.form_mitre')}</label>
                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.5rem' }}>
                  {techniques.map(t => (
                    <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={formData.technique_ids.includes(t.id)} onChange={() => toggleTechnique(t.id)} />
                      <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{t.id}</span>
                      {t.name}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary">{tk('proposals.submit_btn')}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>{tk('common.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setReviewModal(null)}>
          <div className="card" style={{ maxWidth: '500px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3>{tk('proposals.review_title')}</h3>
            <div style={{ marginTop: '1rem' }}>
              <p><strong>{reviewModal.title}</strong></p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{reviewModal.description}</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <span className="badge badge-secondary">{reviewModal.attack_pattern}</span>
                <span className="badge badge-secondary">{reviewModal.target_component}</span>
                {reviewModal.technique_ids.map(id => (
                  <span key={id} className="badge badge-info">{id}</span>
                ))}
              </div>
              <div className="form-group">
                <label className="form-label">{tk('proposals.review_comment')}</label>
                <textarea className="form-control" rows={2} value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Reason for approval or rejection..." />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button className="btn btn-success" onClick={() => reviewProposal('approved')}>{tk('common.approve')}</button>
                <button className="btn btn-danger" onClick={() => reviewProposal('rejected')}>{tk('common.reject')}</button>
                <button className="btn btn-secondary" onClick={() => setReviewModal(null)}>{tk('common.cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proposals List */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>{tk('proposals.loading')}</p>
        </div>
      ) : proposals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>{tk('proposals.no_proposals')}</p>
        </div>
      ) : (
        <div className="card">
          <h3>Proposals ({proposals.length})</h3>
          <div className="table-responsive" style={{ marginTop: '1rem' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>{tk('proposals.col_title')}</th>
                  <th>{tk('proposals.col_target')}</th>
                  <th>{tk('proposals.col_pattern')}</th>
                  <th>{tk('proposals.col_status')}</th>
                  <th>{tk('proposals.col_submitted_by')}</th>
                  <th>{tk('proposals.col_date')}</th>
                  {isAdmin && <th>{tk('common.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {proposals.map(p => (
                  <tr key={p.proposal_id}>
                    <td>
                      <strong>{p.title}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                        {p.description.length > 80 ? p.description.slice(0, 80) + '...' : p.description}
                      </div>
                      {p.technique_ids.length > 0 && (
                        <div style={{ marginTop: '0.25rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {p.technique_ids.map(id => (
                            <span key={id} className="badge badge-info" style={{ fontSize: '0.65rem' }}>{id}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>{p.target_component}</td>
                    <td><span className="badge badge-secondary">{p.attack_pattern}</span></td>
                    <td><span className={`badge ${statusBadge(p.status)}`}>{p.status}</span></td>
                    <td style={{ fontSize: '0.875rem' }}>{p.submitted_by}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{formatDate(p.submitted_at)}</td>
                    {isAdmin && (
                      <td>
                        {p.status === 'pending' ? (
                          <button className="btn btn-sm btn-primary" onClick={() => { setReviewModal(p); setReviewComment('') }}>Review</button>
                        ) : p.scenario_id ? (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Scenario: {p.scenario_id}</span>
                        ) : p.review_comment ? (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{p.review_comment}</span>
                        ) : null}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
