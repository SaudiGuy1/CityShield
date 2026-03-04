import { useMemo } from 'react'
import { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { CATEGORY_COLORS, createEdgeMaterial } from './materials'
import CyberpunkBuilding from './CyberpunkBuilding'
import type { BuildingShape } from './CyberpunkBuilding'
import type { CityAsset } from '../../types/assets'

interface CyberRangeCompoundProps {
  components: CityAsset[]
  selectedId: string | null
  attackedBuildingId?: string | null
  onSelect: (id: string | null) => void
  onHover: (component: CityAsset | null, event?: ThreeEvent<PointerEvent>) => void
}

const ACCENT = CATEGORY_COLORS.training || '#00e676'

// Building slots inside the compound
const COMPOUND_SLOTS: Array<{ pos: [number, number, number]; shape: BuildingShape }> = [
  { pos: [-1.5, 0, -1.0], shape: 'hexagon' },
  { pos: [0, 0, -1.0], shape: 'skyscraper' },
  { pos: [1.5, 0, -1.0], shape: 'dome' },
  { pos: [-1.0, 0, 1.0], shape: 'wideLow' },
  { pos: [1.0, 0, 1.0], shape: 'tower' },
]

export default function CyberRangeCompound({
  components,
  selectedId,
  attackedBuildingId,
  onSelect,
  onHover,
}: CyberRangeCompoundProps) {
  const wallEdgeMat = useMemo(() => createEdgeMaterial(ACCENT, 0.5), [])

  // Wall dimensions
  const wallW = 7
  const wallD = 5
  const wallH = 0.6
  const hw = wallW / 2
  const hd = wallD / 2

  const wallGeom = useMemo(() => {
    const geom = new THREE.BoxGeometry(wallW, wallH, 0.08)
    return new THREE.EdgesGeometry(geom, 15)
  }, [])

  return (
    <group>
      {/* Perimeter walls */}
      {[
        { pos: [0, wallH / 2, -hd] as const, rot: [0, 0, 0] as const },
        { pos: [0, wallH / 2, hd] as const, rot: [0, 0, 0] as const },
        { pos: [-hw, wallH / 2, 0] as const, rot: [0, Math.PI / 2, 0] as const },
        { pos: [hw, wallH / 2, 0] as const, rot: [0, Math.PI / 2, 0] as const },
      ].map(({ pos, rot }, i) => (
        <group key={`wall-${i}`} position={[pos[0], pos[1], pos[2]]} rotation={[rot[0], rot[1], rot[2]]}>
          <mesh castShadow>
            <boxGeometry args={[i < 2 ? wallW : wallD, wallH, 0.08]} />
            <meshStandardMaterial
              color="#0a0f1a"
              roughness={0.3}
              metalness={0.85}
              emissive={ACCENT}
              emissiveIntensity={0.08}
            />
          </mesh>
          <lineSegments geometry={wallGeom} material={wallEdgeMat} />
        </group>
      ))}

      {/* Corner towers — tall glowing pillars */}
      {[
        [-hw, -hd],
        [hw, -hd],
        [-hw, hd],
        [hw, hd],
      ].map(([x, z], i) => (
        <group key={`tower-${i}`} position={[x, 0, z]}>
          <mesh position={[0, 0.7, 0]} castShadow>
            <boxGeometry args={[0.25, 1.4, 0.25]} />
            <meshStandardMaterial
              color="#0a0f1a"
              roughness={0.2}
              metalness={0.9}
              emissive={ACCENT}
              emissiveIntensity={0.3}
            />
          </mesh>
          {/* Tower top beacon */}
          <mesh position={[0, 1.45, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial
              color={ACCENT}
              emissive={ACCENT}
              emissiveIntensity={1.0}
              roughness={0.1}
              metalness={0.5}
            />
          </mesh>
          <pointLight position={[0, 1.5, 0]} intensity={0.3} distance={4} color={ACCENT} />
        </group>
      ))}

      {/* Inner buildings */}
      {components.map((comp, i) => {
        const slot = COMPOUND_SLOTS[i % COMPOUND_SLOTS.length]
        const compId = comp.id || comp.asset_id
        return (
          <CyberpunkBuilding
            key={compId}
            component={comp}
            position={slot.pos}
            shape={slot.shape}
            selected={selectedId === compId}
            isUnderAttack={attackedBuildingId === compId}
            onSelect={onSelect}
            onHover={onHover}
          />
        )
      })}
    </group>
  )
}
