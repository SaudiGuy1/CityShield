import { useCallback, useEffect, useRef, useState } from 'react'

export type AwarenessEventType =
  | 'module_view'
  | 'concept_view'
  | 'scenario_view'
  | 'video_open'
  | 'quiz_submit'
  | 'pre_assessment_submit'

export interface AwarenessProgressEventInput {
  event_type: AwarenessEventType
  category_id: string
  module_id?: string
  concept_id?: string
  scenario_id?: string
  video_key?: string
  quiz_score?: number
  quiz_total?: number
  passed?: boolean
  pre_assessment_weak_categories?: string[]
  lang?: 'en' | 'ar'
  metadata?: Record<string, unknown>
}

export interface AwarenessCategorySummary {
  category_id: string
  modules_viewed: string[]
  concepts_viewed: string[]
  scenarios_viewed: string[]
  videos_opened: string[]
  best_quiz_score: number | null
  best_quiz_total: number | null
  passed: boolean
  last_activity: string | null
}

export interface AwarenessSummary {
  username: string
  categories: AwarenessCategorySummary[]
  last_pre_assessment_weak_categories: string[]
  last_pre_assessment_at: string | null
  total_events: number
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token')
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' }
}

/**
 * Records awareness training progress and exposes a per-user summary.
 *
 * - `record(event)` POSTs to /api/awareness/progress and silently swallows
 *   network errors (the page must keep working offline / unauthenticated).
 * - `summary` is fetched once on mount and refreshed after each successful
 *   record, so the UI can highlight already-completed modules.
 */
export function useAwarenessProgress() {
  const [summary, setSummary] = useState<AwarenessSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const dedupe = useRef<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/awareness/progress/me', { headers: authHeaders() })
      if (!res.ok) return
      const data: AwarenessSummary = await res.json()
      setSummary(data)
    } catch {
      // network unavailable — leave summary as is
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const record = useCallback(
    async (event: AwarenessProgressEventInput, opts?: { dedupeKey?: string }) => {
      if (opts?.dedupeKey) {
        if (dedupe.current.has(opts.dedupeKey)) return
        dedupe.current.add(opts.dedupeKey)
      }
      try {
        const res = await fetch('/api/awareness/progress', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(event),
        })
        if (!res.ok) return
        // Refresh in the background; do not block the caller.
        void refresh()
      } catch {
        // swallow — progress is best-effort
      }
    },
    [refresh],
  )

  return { summary, loading, record, refresh }
}
