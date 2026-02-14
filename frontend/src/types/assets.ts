/**
 * CityShield Asset Types - Production Schema
 * Maps 1:1 with backend city-assets index
 */

export interface CityAsset {
  // Core Identity
  asset_id: string
  id?: string  // Backward compatibility
  asset_type: string
  asset_class: 'iot_device' | 'network_device' | 'security_device' | 'industrial_control' | 'network_service'
  name: string

  // Classification
  zone: string
  category: 'traffic' | 'iot' | 'network' | 'security' | 'industrial'
  criticality: 'low' | 'medium' | 'high' | 'critical'

  // Real-Time Metrics
  metrics?: {
    events_1h: number
    alerts_open: number
    risk_score: number  // 0-100
    last_seen: string
  }

  // Backward compatibility
  eventsCount?: number
  alertsCount?: number
  lastUpdated?: string

  // Derived State
  state?: {
    status: 'normal' | 'elevated' | 'suspicious' | 'compromised'
    is_under_attack: boolean
    risk_level: 'low' | 'medium' | 'high' | 'critical'
  }

  // Backward compatibility
  status?: 'ok' | 'warning' | 'critical' | 'offline'

  // Network Context
  network?: {
    ip_address?: string
    subnet?: string
    mac_address?: string
  }

  // Detection Context
  detection_rules?: string[]
  dependencies?: string[]
  tags?: string[]

  // Backward compatibility (from logs)
  component?: string
  metadata?: Record<string, any>
}

export interface AttackPath {
  path_id: string
  correlation_id: string
  attack_name: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  started_at: string

  // Spatial Flow
  hops: AttackHop[]

  // Visual Encoding
  visual: {
    color: string
    thickness: number
    speed: number
    particle_count: number
  }
}

export interface AttackHop {
  asset_id: string
  step_type: 'initial_access' | 'lateral_movement' | 'privilege_escalation' | 'exfiltration'
  timestamp: string
  alert_id?: string
}

export interface AssetTelemetryMessage {
  type: 'asset_update' | 'attack_path' | 'pong'
  timestamp: string
  assets?: CityAsset[]
  path?: AttackPath
}

// Device Management Types
export interface DeviceLocation {
  zone?: string
  subnet?: string
  building?: string
  floor?: string
  coordinates?: { lat: number; lon: number }
}

export interface DeviceNetwork {
  ip_address?: string
  mac_address?: string
  vlan?: string
  gateway?: string
}

export interface Device {
  asset_id: string
  name: string
  asset_type: string
  asset_class?: string
  criticality: 'low' | 'medium' | 'high' | 'critical'
  location?: DeviceLocation
  network?: DeviceNetwork
  status: 'active' | 'inactive' | 'maintenance' | 'decommissioned'
  last_seen?: string
  events_1h: number
  alerts_open: number
  risk_score: number
  tags: string[]
  device_type: 'simulated' | 'physical' | 'virtual'
  last_heartbeat?: string
  lifecycle_state?: string
}

export interface DeviceMetrics {
  events_24h: number
  events_7d: number
  alerts_24h: number
  alerts_7d: number
  uptime_percentage: number
  last_incident?: string
}

export interface RecentEvent {
  timestamp: string
  event_type: string
  severity?: string
  message?: string
}

export interface RecentAlert {
  alert_id: string
  triggered_at: string
  rule_name: string
  severity: string
  status: string
}

export interface DeviceDetail extends Device {
  metrics?: DeviceMetrics
  recent_events: RecentEvent[]
  recent_alerts: RecentAlert[]
  metadata?: Record<string, any>
}
