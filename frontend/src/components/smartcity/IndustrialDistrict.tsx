import { useRef, useMemo } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { CATEGORY_COLORS, createEdgeMaterial } from './materials'
import Windmill from './Windmill'
import type { CityAsset } from '../../types/assets'

interface IndustrialDistrictProps {
  components: CityAsset[]
  selectedId: string | null
  attackedBuildingId?: string | null
  onSelect: (id: string | null) => void
  onHover: (component: CityAsset | null, event?: ThreeEvent<PointerEvent>) => void
  windmillData?: { rpm: number; temperature: number; isHacked: boolean }
  onWindmillInteract?: () => void
}

const ACCENT = CATEGORY_COLORS.industrial || '#ff6d00'

// Building slot positions relative to district center
const SLOTS: Array<{ pos: [number, number, number]; type: 'factory' | 'powerplant' | 'tank' | 'default' }> = [
  { pos: [-2.5, 0, -1.5], type: 'factory' },
  { pos: [-0.5, 0, -1.5], type: 'powerplant' },
  { pos: [1.5, 0, -1.5], type: 'tank' },
  { pos: [-2.5, 0, 1.0], type: 'default' },
  { pos: [-0.5, 0, 1.0], type: 'factory' },
  { pos: [1.5, 0, 1.0], type: 'default' },
]

export default function IndustrialDistrict({
  components,
  selectedId,
  attackedBuildingId,
  onSelect,
  onHover,
  windmillData,
  onWindmillInteract,
}: IndustrialDistrictProps) {
  // Separate windmill component from regular buildings
  const buildingComps = components.filter(c => (c.id || c.asset_id) !== 'ind-wind-04')

  return (
    <group>
      {/* Industrial buildings */}
      {buildingComps.map((comp, i) => {
        const slot = SLOTS[i % SLOTS.length]
        const compId = comp.id || comp.asset_id
        return (
          <IndustrialBuildingCyberpunk
            key={compId}
            component={comp}
            position={slot.pos}
            type={slot.type}
            selected={selectedId === compId}
            isUnderAttack={attackedBuildingId === compId}
            onSelect={onSelect}
            onHover={onHover}
          />
        )
      })}

      {/* Windmill — neon-restyled, positioned at edge of district */}
      <Windmill
        position={[3.5, 0, 0]}
        rpm={windmillData?.rpm ?? 12}
        temperature={windmillData?.temperature ?? 45}
        isHacked={windmillData?.isHacked ?? false}
        onInteract={onWindmillInteract}
      />

      {/* Ambient industrial decoration: pipes connecting buildings */}
      <mesh position={[0, 0.4, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 6, 4]} />
        <meshStandardMaterial
          color="#333"
          emissive={ACCENT}
          emissiveIntensity={0.15}
          metalness={0.9}
          roughness={0.3}
        />
      </mesh>
    </group>
  )
}

// ── Individual Industrial Building ───────────────────────────────────────────
interface IndustrialBuildingCyberpunkProps {
  component: CityAsset
  position: [number, number, number]
  type: 'factory' | 'powerplant' | 'tank' | 'default'
  selected: boolean
  isUnderAttack?: boolean
  onSelect: (id: string | null) => void
  onHover: (component: CityAsset | null, event?: ThreeEvent<PointerEvent>) => void
}

function IndustrialBuildingCyberpunk({
  component,
  position,
  type,
  selected,
  isUnderAttack,
  onSelect,
  onHover,
}: IndustrialBuildingCyberpunkProps) {
  const meshRef = useRef<THREE.Mesh>(null!)

  const height = useMemo(() => {
    const rs = component.metrics?.risk_score ?? component.eventsCount ?? 0
    return 0.8 + (Math.min(rs, 100) / 100) * 2.5
  }, [component.metrics?.risk_score, component.eventsCount])

  const status = (component.status || 'ok') as string

  const emissiveColor = useMemo(() => {
    if (isUnderAttack) return '#ff1867'
    if (selected) return '#00e5ff'
    return ACCENT
  }, [isUnderAttack, selected])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    if (isUnderAttack) {
      mat.emissiveIntensity = 0.4 + Math.sin(clock.elapsedTime * 5) * 0.3
    }
  })

  const edgeColor = isUnderAttack ? '#ff1867' : selected ? '#00e5ff' : ACCENT
  const edgeMat = useMemo(() => createEdgeMaterial(edgeColor, 0.6), [edgeColor])

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onHover(component, e)
    document.body.style.cursor = 'pointer'
  }
  const handlePointerOut = () => {
    onHover(null)
    document.body.style.cursor = 'auto'
  }
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const compId = component.id || component.asset_id
    onSelect(selected ? null : compId)
  }

  const buildingPos: [number, number, number] = [position[0], height / 2, position[2]]

  // Build geometry based on type
  let geom: THREE.BufferGeometry
  switch (type) {
    case 'factory':
      geom = new THREE.BoxGeometry(1.0, height, 0.8)
      break
    case 'powerplant':
      geom = new THREE.CylinderGeometry(0.3, 0.5, height, 8)
      break
    case 'tank':
      geom = new THREE.CylinderGeometry(0.45, 0.45, height, 12)
      break
    default:
      geom = new THREE.BoxGeometry(0.8, height, 0.8)
  }

  const edgesGeom = useMemo(() => new THREE.EdgesGeometry(geom, 15), [geom])

  return (
    <group position={buildingPos}>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        geometry={geom}
      >
        <meshStandardMaterial
          color="#0e1220"
          roughness={0.3}
          metalness={0.85}
          emissive={emissiveColor}
          emissiveIntensity={isUnderAttack ? 0.5 : selected ? 0.4 : 0.1}
          transparent={status === 'offline'}
          opacity={status === 'offline' ? 0.4 : 1}
        />
      </mesh>

      <lineSegments geometry={edgesGeom} material={edgeMat} />

      {/* Smokestack for factories */}
      {type === 'factory' && (
        <mesh position={[0.35, height / 2 + 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.06, 0.6, 6]} />
          <meshStandardMaterial
            color="#333"
            emissive={ACCENT}
            emissiveIntensity={0.3}
            metalness={0.8}
            roughness={0.4}
          />
        </mesh>
      )}

      {/* Selection ring */}
      {selected && (
        <mesh position={[0, -height / 2 + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.65, 32]} />
          <meshBasicMaterial color="#00e5ff" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Attack indicator */}
      {isUnderAttack && (
        <spotLight
          position={[0, height + 2, 0]}
          angle={0.4}
          penumbra={0.5}
          intensity={3}
          distance={height + 4}
          color="#ff1867"
          castShadow={false}
        />
      )}
    </group>
  )
}
