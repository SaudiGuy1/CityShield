import { useMemo } from 'react'
import { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import Building from './Building'
import IndustrialBuilding from './IndustrialBuildings'
import { CATEGORY_COLORS } from './materials'
import type { CityAsset } from '../../types/assets'

interface ZonesProps {
  components: CityAsset[]
  selectedId: string | null
  attackedBuildingId?: string | null
  onSelect: (id: string | null) => void
  onHover: (component: CityAsset | null, event?: ThreeEvent<PointerEvent>) => void
}

// Zone layout configuration — four quadrants + center industrial zone
const ZONE_CONFIG: Record<string, { center: [number, number]; label: string }> = {
  'zone-a': { center: [-8, -8], label: 'Traffic' },
  'zone-b': { center: [8, -8], label: 'IoT' },
  'zone-c': { center: [-8, 8], label: 'Network' },
  'zone-d': { center: [8, 8], label: 'Security' },
  'zone-e': { center: [0, 0], label: 'Industrial' },
  'cyber-range': { center: [20, 0], label: 'Cyber Range' },
}

// Place buildings in a grid within their zone
function layoutBuildings(
  components: CityAsset[],
  zoneCenter: [number, number]
): Map<string, [number, number, number]> {
  const positions = new Map<string, [number, number, number]>()
  const cols = Math.ceil(Math.sqrt(components.length))
  const spacing = 1.4

  components.forEach((comp, i) => {
    const row = Math.floor(i / cols)
    const col = i % cols
    const offsetX = (col - (cols - 1) / 2) * spacing
    const offsetZ = (row - (Math.ceil(components.length / cols) - 1) / 2) * spacing
    const compId = comp.id || comp.asset_id
    positions.set(compId, [
      zoneCenter[0] + offsetX,
      0, // y is set by Building based on height
      zoneCenter[1] + offsetZ,
    ])
  })
  return positions
}

export default function Zones({ components, selectedId, attackedBuildingId, onSelect, onHover }: ZonesProps) {
  // Group components by zone
  const grouped = useMemo(() => {
    const map = new Map<string, CityAsset[]>()
    for (const comp of components) {
      const zone = comp.zone || 'zone-a'
      if (!map.has(zone)) map.set(zone, [])
      map.get(zone)!.push(comp)
    }
    return map
  }, [components])

  // Compute stable positions keyed by component id
  const positions = useMemo(() => {
    const all = new Map<string, [number, number, number]>()
    for (const [zone, comps] of grouped) {
      const config = ZONE_CONFIG[zone] || ZONE_CONFIG['zone-a']
      const zonePositions = layoutBuildings(comps, config.center)
      for (const [id, pos] of zonePositions) {
        all.set(id, pos)
      }
    }
    return all
  }, [grouped])

  return (
    <group>
      {/* Zone ground plates */}
      {Array.from(grouped.entries()).map(([zone, comps]) => {
        const config = ZONE_CONFIG[zone] || ZONE_CONFIG['zone-a']
        const category = comps[0]?.category || 'network'
        const accentColor = CATEGORY_COLORS[category] || '#3b82f6'
        return (
          <ZonePlate
            key={zone}
            center={config.center}
            color={accentColor}
          />
        )
      })}

      {/* Buildings */}
      {components.map((comp) => {
        const compId = comp.id || comp.asset_id
        const pos = positions.get(compId)
        if (!pos) return null
        const isUnderAttack = attackedBuildingId === compId

        // Use industrial building for zone-e components
        if (comp.zone === 'zone-e' && compId !== 'ind-wind-04') {
          return (
            <IndustrialBuilding
              key={compId}
              component={comp}
              position={pos}
              selected={selectedId === compId}
              isUnderAttack={isUnderAttack}
              onSelect={onSelect}
              onHover={onHover}
            />
          )
        }

        // Skip windmill component — it's rendered separately
        if (compId === 'ind-wind-04') return null

        return (
          <Building
            key={compId}
            component={comp}
            position={pos}
            selected={selectedId === compId}
            isUnderAttack={isUnderAttack}
            onSelect={onSelect}
            onHover={onHover}
          />
        )
      })}
    </group>
  )
}

function ZonePlate({ center, color }: { center: [number, number]; color: string }) {
  return (
    <group position={[center[0], 0, center[1]]}>
      {/* Zone ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[6.5, 6.5]} />
        <meshStandardMaterial
          color="#0f1623"
          roughness={0.95}
          metalness={0.05}
        />
      </mesh>

      {/* Zone border glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[3.0, 3.25, 4]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Zone edge lines as thin box meshes */}
      {[
        { pos: [0, 0.03, -3.25] as const, size: [6.5, 0.005, 0.02] as const },
        { pos: [3.25, 0.03, 0] as const, size: [0.02, 0.005, 6.5] as const },
        { pos: [0, 0.03, 3.25] as const, size: [6.5, 0.005, 0.02] as const },
        { pos: [-3.25, 0.03, 0] as const, size: [0.02, 0.005, 6.5] as const },
      ].map(({ pos, size }, i) => (
        <mesh key={i} position={[pos[0], pos[1], pos[2]]}>
          <boxGeometry args={[size[0], size[1], size[2]]} />
          <meshBasicMaterial color={color} transparent opacity={0.3} />
        </mesh>
      ))}
    </group>
  )
}
