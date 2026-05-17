import { useEffect, useState } from 'react'
import { useLang } from '../hooks/useLang'
import type { AwarenessSummary } from '../hooks/useAwarenessProgress'

// All copy on this page goes through `useLang().tk`; previously inlined
// strings were migrated to keys under team.*, common.*

interface TeamMember {
  user: {
    username: string
    email: string
    role: string
    manager_username: string | null
    is_active: boolean
  }
  summary: AwarenessSummary
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token')
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' }
}

function categoryProgress(s: AwarenessSummary, categoryId: string) {
  return s.categories.find(c => c.category_id === categoryId)
}

export default function TeamAnalytics({ user }: { user: { username?: string; role?: string } | null }) {
  const { lang, dir, tk } = useLang()
  const [rows, setRows] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/awareness/progress/team', { headers: authHeaders() })
      .then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<TeamMember[]>
      })
      .then(data => { if (!cancelled) setRows(data) })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const labels = {
    title: tk('team.title'),
    subtitle: lang === 'ar'
      ? `عرض تقدم تدريب التوعية لكل عضو في فريق ${user?.username ?? ''}`
      : `Awareness training progress for everyone reporting to ${user?.username ?? ''}`,
    empty: tk('team.empty'),
    user: tk('team.user'),
    role: tk('team.role'),
    employees: lang === 'ar' ? 'موظفون' : 'Employees',
    executives: lang === 'ar' ? 'تنفيذيون' : 'Executives',
    it: lang === 'ar' ? 'تقنية' : 'IT',
    events: tk('team.events'),
    lastPre: tk('team.last_pre'),
    none: tk('common.none'),
    passed: tk('common.passed').toUpperCase(),
    pending: tk('team.pending'),
    loading: tk('common.loading'),
  }

  const CATEGORY_COLUMNS: { id: string; label: string }[] = [
    { id: 'employees', label: labels.employees },
    { id: 'executives', label: labels.executives },
    { id: 'it-staff', label: labels.it },
  ]

  return (
    <div className="container" style={{ maxWidth: 1080 }} dir={dir}>
      <div className="page-header">
        <div>
          <h1>{labels.title}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '-1rem' }}>{labels.subtitle}</p>
        </div>
      </div>

      {loading && <div className="card">{labels.loading}</div>}
      {error && (
        <div className="card" style={{ borderInlineStart: '3px solid var(--accent-danger)' }}>
          <p style={{ color: 'var(--accent-danger)', margin: 0 }}>{error}</p>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{labels.empty}</p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr style={{ textAlign: 'start', color: 'var(--text-tertiary)', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.6rem 0.5rem' }}>{labels.user}</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>{labels.role}</th>
                {CATEGORY_COLUMNS.map(c => (
                  <th key={c.id} style={{ padding: '0.6rem 0.5rem' }}>{c.label}</th>
                ))}
                <th style={{ padding: '0.6rem 0.5rem' }}>{labels.events}</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>{labels.lastPre}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.user.username} style={{ borderTop: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.user.username}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{row.user.email}</div>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>{row.user.role}</td>
                  {CATEGORY_COLUMNS.map(c => {
                    const cp = categoryProgress(row.summary, c.id)
                    if (!cp) {
                      return <td key={c.id} style={{ padding: '0.75rem 0.5rem', color: 'var(--text-tertiary)' }}>{labels.none}</td>
                    }
                    const scoreCell = cp.best_quiz_score !== null && cp.best_quiz_total !== null
                      ? `${cp.best_quiz_score}/${cp.best_quiz_total}`
                      : labels.pending
                    return (
                      <td key={c.id} style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ color: cp.passed ? 'var(--accent-success)' : 'var(--text-secondary)' }}>
                            {scoreCell}
                          </span>
                          {cp.passed && (
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              letterSpacing: '0.05em',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '0.35rem',
                              background: 'rgba(0, 255, 136, 0.15)',
                              color: 'var(--accent-success)',
                              border: '1px solid rgba(0, 255, 136, 0.4)',
                            }}>{labels.passed}</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
                          {cp.modules_viewed.length}m · {cp.concepts_viewed.length}c
                        </div>
                      </td>
                    )
                  })}
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>{row.summary.total_events}</td>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                    {row.summary.last_pre_assessment_at
                      ? new Date(row.summary.last_pre_assessment_at).toLocaleDateString()
                      : labels.none}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
