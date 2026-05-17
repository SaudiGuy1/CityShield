import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatDateTimeWithSeconds } from '../utils/datetime'
import { useLang } from '../hooks/useLang'

type Classification = 'true_positive' | 'false_positive' | 'benign' | 'informational'

interface TrendBucket {
  bucket_start: string
  true_positive: number
  false_positive: number
  benign: number
  informational: number
}

interface TrendResponse {
  interval: string
  buckets: TrendBucket[]
  totals: Record<Classification, number>
}

interface AnalystRow {
  analyst: string
  total_actions: number
  resolves: number
  amendments: number
  reopens: number
  classifications: Record<string, number>
}

interface TimelineSample {
  alert_id: string
  triggered_at: string
  resolved_at: string
  classification: Classification
  resolution_seconds: number
}

interface TimelineResponse {
  samples: TimelineSample[]
  average_seconds: number | null
  median_seconds: number | null
  p95_seconds: number | null
}

const CLASS_COLOR: Record<Classification, string> = {
  true_positive: 'var(--accent-danger)',
  false_positive: 'var(--accent-warning)',
  benign: 'var(--accent-primary)',
  informational: 'var(--text-tertiary)',
}

// Class label resolution lives inside the component (depends on tk(lang)).

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function humanSeconds(s: number | null | undefined): string {
  if (s === null || s === undefined) return '—'
  if (s < 60) return `${Math.round(s)}s`
  if (s < 3600) return `${Math.round(s / 60)}m`
  if (s < 86400) return `${(s / 3600).toFixed(1)}h`
  return `${(s / 86400).toFixed(1)}d`
}

export default function ResolutionAnalytics() {
  const { tk, dir } = useLang()
  const [bucketInterval, setBucketInterval] = useState<'hour' | 'day' | 'week'>('day')
  const [windowDays, setWindowDays] = useState(30)
  const [trend, setTrend] = useState<TrendResponse | null>(null)
  const [analysts, setAnalysts] = useState<AnalystRow[] | null>(null)
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { start, end } = useMemo(() => {
    const e = new Date()
    const s = new Date(Date.now() - windowDays * 86400_000)
    return { start: s.toISOString(), end: e.toISOString() }
  }, [windowDays])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = (extra = '') => `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}${extra}`
      const [tRes, aRes, lRes] = await Promise.all([
        fetch(`/api/alerts/analytics/tp-fp-trends${qs(`&interval=${bucketInterval}`)}`, { headers: authHeaders() }),
        fetch(`/api/alerts/analytics/analyst-activity${qs()}`, { headers: authHeaders() }),
        fetch(`/api/alerts/analytics/resolution-timelines${qs()}`, { headers: authHeaders() }),
      ])
      if (!tRes.ok || !aRes.ok || !lRes.ok) {
        const status = [tRes.status, aRes.status, lRes.status]
        if (status.includes(403)) throw new Error(tk('analytics.forbidden'))
        throw new Error(`Analytics request failed (${status.join('/')})`)
      }
      setTrend(await tRes.json())
      setAnalysts(await aRes.json())
      setTimeline(await lRes.json())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [bucketInterval, start, end, tk])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return (
    <div className="container" style={{ maxWidth: 1080 }} dir={dir}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1>{tk('analytics.title')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '-1rem' }}>{tk('analytics.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{tk('analytics.window')}</label>
          <select className="form-control" style={{ maxWidth: 120 }} value={windowDays} onChange={e => setWindowDays(Number(e.target.value))}>
            <option value={1}>{tk('analytics.window.1d')}</option>
            <option value={7}>{tk('analytics.window.7d')}</option>
            <option value={30}>{tk('analytics.window.30d')}</option>
            <option value={90}>{tk('analytics.window.90d')}</option>
          </select>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{tk('analytics.bucket')}</label>
          <select className="form-control" style={{ maxWidth: 120 }} value={bucketInterval} onChange={e => setBucketInterval(e.target.value as 'hour' | 'day' | 'week')}>
            <option value="hour">{tk('analytics.bucket.hour')}</option>
            <option value="day">{tk('analytics.bucket.day')}</option>
            <option value="week">{tk('analytics.bucket.week')}</option>
          </select>
        </div>
      </div>

      {loading && <div className="card">{tk('common.loading')}</div>}
      {error && (
        <div className="card" style={{ borderInlineStart: '3px solid var(--accent-danger)' }}>
          <p style={{ color: 'var(--accent-danger)', margin: 0 }}>{error}</p>
        </div>
      )}

      {!loading && !error && trend && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>{tk('analytics.totals_title')}</h3>
          <ClassificationTotals totals={trend.totals} />
          <TrendBarChart buckets={trend.buckets} />
        </div>
      )}

      {!loading && !error && analysts && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>{tk('analytics.analyst_activity')}</h3>
          <AnalystActivityTable rows={analysts} />
        </div>
      )}

      {!loading && !error && timeline && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{tk('analytics.timeline_title')}</h3>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <Stat label={tk('analytics.mean')} value={humanSeconds(timeline.average_seconds)} />
            <Stat label={tk('analytics.median')} value={humanSeconds(timeline.median_seconds)} />
            <Stat label={tk('analytics.p95')} value={humanSeconds(timeline.p95_seconds)} />
            <Stat label={tk('analytics.samples')} value={String(timeline.samples.length)} />
          </div>
          <TimelineList samples={timeline.samples.slice(0, 50)} />
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}

function ClassificationTotals({ totals }: { totals: Record<string, number> }) {
  const { tk } = useLang()
  const order: Classification[] = ['true_positive', 'false_positive', 'benign', 'informational']
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
      {order.map(k => (
        <div key={k} style={{
          flex: '1 1 140px',
          padding: '0.75rem 0.9rem',
          borderRadius: '0.55rem',
          background: 'var(--bg-tertiary)',
          borderInlineStart: `3px solid ${CLASS_COLOR[k]}`,
        }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>
            {tk(`resolution.classification.${k}` as const).toUpperCase()}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: CLASS_COLOR[k] }}>
            {totals[k] ?? 0}
          </div>
        </div>
      ))}
    </div>
  )
}

function TrendBarChart({ buckets }: { buckets: TrendBucket[] }) {
  const { tk } = useLang()
  if (buckets.length === 0) {
    return <p style={{ color: 'var(--text-tertiary)' }}>{tk('analytics.no_data')}</p>
  }
  const max = Math.max(1, ...buckets.map(b => b.true_positive + b.false_positive + b.benign + b.informational))
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: 180, paddingBlock: '0.5rem' }}>
      {buckets.map(b => {
        const total = b.true_positive + b.false_positive + b.benign + b.informational
        return (
          <div key={b.bucket_start} title={`${new Date(b.bucket_start).toLocaleDateString()} — TP:${b.true_positive} FP:${b.false_positive} Benign:${b.benign} Info:${b.informational}`}
            style={{ flex: 1, display: 'flex', flexDirection: 'column-reverse', minWidth: 6 }}>
            <Segment value={b.true_positive} max={max} color={CLASS_COLOR.true_positive} />
            <Segment value={b.false_positive} max={max} color={CLASS_COLOR.false_positive} />
            <Segment value={b.benign} max={max} color={CLASS_COLOR.benign} />
            <Segment value={b.informational} max={max} color={CLASS_COLOR.informational} />
            <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>{total}</div>
          </div>
        )
      })}
    </div>
  )
}

function Segment({ value, max, color }: { value: number; max: number; color: string }) {
  if (value <= 0) return null
  const height = (value / max) * 160
  return <div style={{ height, background: color, borderRadius: '2px 2px 0 0' }} />
}

function AnalystActivityTable({ rows }: { rows: AnalystRow[] }) {
  const { tk } = useLang()
  if (rows.length === 0) return <p style={{ color: 'var(--text-tertiary)' }}>{tk('analytics.no_activity')}</p>
  const maxTotal = Math.max(1, ...rows.map(r => r.total_actions))
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>{tk('analytics.analyst_activity').split(' ')[0]}</th>
            <th>{tk('analytics.resolves')}</th>
            <th>{tk('analytics.amendments')}</th>
            <th>{tk('analytics.reopens')}</th>
            <th>{tk('analytics.total')}</th>
            <th style={{ width: '30%' }}>{tk('analytics.activity')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.analyst}>
              <td><strong>{r.analyst}</strong></td>
              <td>{r.resolves}</td>
              <td>{r.amendments}</td>
              <td>{r.reopens}</td>
              <td>{r.total_actions}</td>
              <td>
                <div style={{
                  width: `${(r.total_actions / maxTotal) * 100}%`,
                  height: 10,
                  background: 'var(--accent-primary)',
                  borderRadius: 4,
                }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TimelineList({ samples }: { samples: TimelineSample[] }) {
  const { tk } = useLang()
  if (samples.length === 0) return <p style={{ color: 'var(--text-tertiary)' }}>{tk('analytics.no_resolved')}</p>
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>{tk('analytics.alert')}</th>
            <th>{tk('resolution.classification')}</th>
            <th>{tk('analytics.triggered')}</th>
            <th>{tk('analytics.resolved')}</th>
            <th>{tk('analytics.time_to_resolve')}</th>
          </tr>
        </thead>
        <tbody>
          {samples.map(s => (
            <tr key={s.alert_id}>
              <td><code style={{ fontSize: '0.8rem' }}>{s.alert_id.slice(0, 16)}</code></td>
              <td>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  padding: '0.18rem 0.5rem',
                  borderRadius: '0.4rem',
                  background: 'rgba(127,127,127,0.08)',
                  color: CLASS_COLOR[s.classification],
                  border: `1px solid ${CLASS_COLOR[s.classification]}`,
                }}>
                  {tk(`resolution.classification.${s.classification}` as const)}
                </span>
              </td>
              <td style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{formatDateTimeWithSeconds(s.triggered_at)}</td>
              <td style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{formatDateTimeWithSeconds(s.resolved_at)}</td>
              <td><strong>{humanSeconds(s.resolution_seconds)}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
