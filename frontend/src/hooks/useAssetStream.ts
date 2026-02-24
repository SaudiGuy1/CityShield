import { useState, useEffect, useCallback, useRef } from 'react'
import type { CityAsset, AttackPath, AssetTelemetryMessage } from '../types/assets'

interface UseAssetStreamReturn {
  assets: CityAsset[]
  attackPaths: AttackPath[]
  connected: boolean
  error: string | null
  reconnect: () => void
}

export function useAssetStream(): UseAssetStreamReturn {
  const [assets, setAssets] = useState<CityAsset[]>([])
  const [attackPaths, setAttackPaths] = useState<AttackPath[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('[AssetStream] No auth token found')
        setError('Authentication required')
        return
      }

      // Determine WebSocket URL with auth token
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.host.includes('localhost')
        ? 'localhost:8000'
        : window.location.host
      const wsUrl = `${protocol}//${host}/ws/city-telemetry?token=${encodeURIComponent(token)}`

      console.log('[AssetStream] Connecting to WebSocket (authenticated)')

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        console.log('[AssetStream] Connected')
        setConnected(true)
        setError(null)

        // Start heartbeat
        if (heartbeatRef.current) clearInterval(heartbeatRef.current)
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping')
          }
        }, 30000) // 30 seconds
      }

      ws.onmessage = (event) => {
        if (!mountedRef.current) return

        try {
          const message: AssetTelemetryMessage = JSON.parse(event.data)

          switch (message.type) {
            case 'asset_update':
              if (message.assets) {
                // Convert backend schema to frontend schema (backward compatibility)
                const normalizedAssets = message.assets.map(asset => ({
                  ...asset,
                  id: asset.asset_id,  // Backward compat
                  eventsCount: asset.metrics?.events_1h ?? 0,
                  alertsCount: asset.metrics?.alerts_open ?? 0,
                  lastUpdated: asset.metrics?.last_seen ?? new Date().toISOString(),
                  status: asset.state?.status
                    ? mapStatusFromState(asset.state.status)
                    : (asset.status || 'ok'),
                }))
                setAssets(normalizedAssets)
                console.log(`[AssetStream] Updated ${normalizedAssets.length} assets`)
              }
              break

            case 'attack_path':
              if (message.path) {
                setAttackPaths(prev => {
                  // Add new path, keep paths from last 5 minutes
                  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
                  const recentPaths = prev.filter(p =>
                    new Date(p.started_at).getTime() > fiveMinutesAgo
                  )
                  return [...recentPaths, message.path!]
                })
                console.log('[AssetStream] New attack path:', message.path.attack_name)
              }
              break

            case 'pong':
              // Heartbeat response
              break
          }
        } catch (err) {
          console.error('[AssetStream] Parse error:', err)
        }
      }

      ws.onerror = (event) => {
        console.error('[AssetStream] WebSocket error:', event)
        setError('WebSocket connection error')
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        console.log('[AssetStream] Disconnected')
        setConnected(false)

        // Clear heartbeat
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current)
          heartbeatRef.current = null
        }

        // Attempt reconnect after 3 seconds
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            console.log('[AssetStream] Reconnecting...')
            connect()
          }
        }, 3000)
      }
    } catch (err) {
      console.error('[AssetStream] Connection error:', err)
      setError('Failed to establish WebSocket connection')
    }
  }, [])

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
    }
    connect()
  }, [connect])

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connect])

  return { assets, attackPaths, connected, error, reconnect }
}

// Map backend state.status to frontend status
function mapStatusFromState(stateStatus?: string): 'ok' | 'warning' | 'critical' | 'offline' {
  switch (stateStatus) {
    case 'normal':
    case 'elevated':
      return 'ok'
    case 'suspicious':
      return 'warning'
    case 'compromised':
      return 'critical'
    default:
      return 'ok'
  }
}
