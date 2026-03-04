import * as THREE from 'three'

// ── Cyberpunk Status Colors ──────────────────────────────────────────────────
export const STATUS_COLORS = {
  ok: '#00e5ff',       // cyan
  warning: '#ffab00',  // amber-gold
  critical: '#ff1867', // hot pink
  offline: '#384258',  // dim slate
} as const

// ── Category Accent Colors (neon-themed) ─────────────────────────────────────
export const CATEGORY_COLORS: Record<string, string> = {
  traffic: '#ff4060',    // hot coral
  iot: '#00e5ff',        // cyan
  network: '#7c4dff',    // electric violet
  security: '#e040fb',   // neon magenta
  industrial: '#ff6d00', // orange neon
  training: '#00e676',   // neon green
} as const

// ── Glass Material (MeshPhysicalMaterial for hero buildings) ─────────────────
export function createGlassMaterial(tint: string): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: tint,
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.3,
    transparent: true,
    opacity: 0.85,
    envMapIntensity: 1.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  })
}

// ── Edge Glow Material (LineBasicMaterial — Bloom makes it glow) ─────────────
export function createEdgeMaterial(color: string, opacity = 1.0): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    linewidth: 2,
  })
}

// ── Building Material Factory ────────────────────────────────────────────────
export function createBuildingMaterial(
  status: 'ok' | 'warning' | 'critical' | 'offline',
): THREE.MeshStandardMaterial {
  const baseColor = STATUS_COLORS[status]
  return new THREE.MeshStandardMaterial({
    color: '#1a1e2e',
    roughness: 0.3,
    metalness: 0.8,
    emissive: baseColor,
    emissiveIntensity: status === 'critical' ? 0.4 : status === 'offline' ? 0 : 0.15,
    transparent: status === 'offline',
    opacity: status === 'offline' ? 0.4 : 1.0,
  })
}

// ── Dark Metallic Material (shared base for most buildings) ──────────────────
export function createDarkMetalMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: '#0e1220',
    roughness: 0.25,
    metalness: 0.9,
  })
}

// ── Highlight Material (selection glow) ──────────────────────────────────────
export function createHighlightMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: '#00e5ff',
    roughness: 0.2,
    metalness: 0.8,
    emissive: '#00e5ff',
    emissiveIntensity: 0.6,
  })
}

// ── Emissive Panel Material (device accents) ─────────────────────────────────
export function createPanelMaterial(color: string, intensity = 0.8): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.1,
    metalness: 0.9,
  })
}

// ── Ground Material ──────────────────────────────────────────────────────────
export const groundMaterial = new THREE.MeshStandardMaterial({
  color: '#060a14',
  roughness: 0.95,
  metalness: 0.1,
})

// ── Road Material ────────────────────────────────────────────────────────────
export const roadMaterial = new THREE.MeshStandardMaterial({
  color: '#0c1018',
  roughness: 0.7,
  metalness: 0.2,
})

// ── Zone Border Material ─────────────────────────────────────────────────────
export const zoneBorderMaterial = new THREE.MeshStandardMaterial({
  color: '#1a2845',
  roughness: 0.8,
  metalness: 0.1,
  transparent: true,
  opacity: 0.5,
})

// ── Grid Line Material ───────────────────────────────────────────────────────
export const gridLineMaterial = new THREE.LineBasicMaterial({
  color: '#0d1a33',
  transparent: true,
  opacity: 0.3,
})
