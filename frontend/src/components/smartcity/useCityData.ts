import { useState, useEffect, useCallback, useRef } from 'react'

export interface CityComponent {
  id: string
  name: string
  category: 'traffic' | 'iot' | 'network' | 'security' | 'industrial'
  status: 'ok' | 'warning' | 'critical' | 'offline'
  zone: string
  eventsCount: number
  alertsCount: number
  lastUpdated: string
}

export function useCityData(pollInterval = 5000) {
  const [components, setComponents] = useState<CityComponent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/overview/city-components', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: CityComponent[] = await res.json()
      if (mountedRef.current) {
        setComponents(data)
        setError(null)
        setLoading(false)
      }
    } catch (e: unknown) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : 'Failed to fetch city data')
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchData()
    const interval = setInterval(fetchData, pollInterval)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [fetchData, pollInterval])

  return { components, loading, error, refetch: fetchData }
}
