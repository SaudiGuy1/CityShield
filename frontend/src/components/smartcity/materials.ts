import * as THREE from 'three'

// Status colors matching the project's design system
export const STATUS_COLORS = {
  ok: '#10b981',       // green
  warning: '#f59e0b',  // amber
  critical: '#ef4444', // red
  offline: '#6b7280',  // gray
} as const

// Category accent colors for zone identification
export const CATEGORY_COLORS: Record<string, string> = {
  traffic: '#ef4444',
  iot: '#10b981',
  network: '#3b82f6',
  security: '#8b5cf6',
  industrial: '#f97316',
  training: '#06b6d4',
} as const

// Shared ground material
export const groundMaterial = new THREE.MeshStandardMaterial({
  color: '#0d1117',
  roughness: 0.95,
  metalness: 0.05,
})

// Road material
export const roadMaterial = new THREE.MeshStandardMaterial({
  color: '#1a1f2e',
  roughness: 0.8,
  metalness: 0.1,
})

// Sidewalk / zone border material
export const zoneBorderMaterial = new THREE.MeshStandardMaterial({
  color: '#2d3e5f',
  roughness: 0.9,
  metalness: 0.05,
  transparent: true,
  opacity: 0.6,
})

// Building material factory – creates a unique material per status to allow emissive glow
export function createBuildingMaterial(
  status: 'ok' | 'warning' | 'critical' | 'offline',
): THREE.MeshStandardMaterial {
  const baseColor = STATUS_COLORS[status]
  const mat = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.4,
    metalness: 0.6,
    emissive: status === 'critical' ? baseColor : '#000000',
    emissiveIntensity: status === 'critical' ? 0.4 : 0,
    transparent: status === 'offline',
    opacity: status === 'offline' ? 0.5 : 1.0,
  })
  return mat
}

// Highlight material for hovered buildings
export function createHighlightMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: '#3b82f6',
    roughness: 0.3,
    metalness: 0.7,
    emissive: '#3b82f6',
    emissiveIntensity: 0.5,
  })
}

// Grid overlay line material
export const gridLineMaterial = new THREE.LineBasicMaterial({
  color: '#1e2d4d',
  transparent: true,
  opacity: 0.4,
})
