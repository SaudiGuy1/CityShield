import { useRef, useState, useMemo, useCallback } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { STATUS_COLORS, CATEGORY_COLORS, createEdgeMaterial } from './materials'
import type { CityAsset } from '../../types/assets'

// ── Shape types ──────────────────────────────────────────────────────────────
export type BuildingShape = 'skyscraper' | 'tower' | 'cylinder' | 'hexagon' | 'dome' | 'wideLow'

interface CyberpunkBuildingProps {
  component: CityAsset
  position: [number, number, number]
  shape: BuildingShape
  selected: boolean
  isUnderAttack?: boolean
  isGlass?: boolean
  onSelect: (id: string | null) => void
  onHover: (component: CityAsset | null, event?: ThreeEvent<PointerEvent>) => void
}

// Height from risk score
function computeHeight(component: CityAsset): number {
  const riskScore = component.metrics?.risk_score ?? component.eventsCount ?? 0
  const clamped = Math.max(0, Math.min(100, riskScore))
  return 0.8 + (clamped / 100) * 3.5
}

// ── Cached EdgesGeometry per shape ───────────────────────────────────────────
const edgeCache = new Map<string, THREE.EdgesGeometry>()

function getEdgesGeometry(shape: BuildingShape, w: number, h: number, d: number): THREE.EdgesGeometry {
  const key = `${shape}-${w.toFixed(2)}-${h.toFixed(2)}-${d.toFixed(2)}`
  if (edgeCache.has(key)) return edgeCache.get(key)!

  let geom: THREE.BufferGeometry
  switch (shape) {
    case 'skyscraper':
      geom = new THREE.BoxGeometry(w, h, d)
      break
    case 'tower':
      geom = new THREE.CylinderGeometry(w * 0.4, w * 0.5, h, 8)
      break
    case 'cylinder':
      geom = new THREE.CylinderGeometry(w * 0.5, w * 0.5, h, 16)
      break
    case 'hexagon':
      geom = new THREE.CylinderGeometry(w * 0.5, w * 0.5, h, 6)
      break
    case 'dome':
      geom = new THREE.SphereGeometry(w * 0.6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2)
      break
    case 'wideLow':
      geom = new THREE.BoxGeometry(w * 1.5, h, d * 1.2)
      break
    default:
      geom = new THREE.BoxGeometry(w, h, d)
  }

  const edges = new THREE.EdgesGeometry(geom, 15)
  edgeCache.set(key, edges)
  geom.dispose()
  return edges
}

export default function CyberpunkBuilding({
  component,
  position,
  shape,
  selected,
  isUnderAttack,
  isGlass,
  onSelect,
  onHover,
}: CyberpunkBuildingProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)

  const height = useMemo(() => computeHeight(component), [component])
  const w = shape === 'wideLow' ? 1.4 : shape === 'dome' ? 1.2 : 0.8
  const d = w

  const buildingPos: [number, number, number] = [
    position[0],
    shape === 'dome' ? 0 : height / 2,
    position[2],
  ]

  const status = (component.status || component.state?.status || 'ok') as keyof typeof STATUS_COLORS
  const accentColor = CATEGORY_COLORS[component.category] || '#7c4dff'

  // Edge glow color — category accent by default, override on special states
  const edgeColor = useMemo(() => {
    if (isUnderAttack) return '#ff1867'
    if (selected) return '#00e5ff'
    if (hovered) return '#60d0ff'
    return accentColor
  }, [isUnderAttack, selected, hovered, accentColor])

  const edgeMat = useMemo(() => createEdgeMaterial(edgeColor, 1.0), [edgeColor])

  // Body material
  const bodyColor = useMemo(() => {
    if (isUnderAttack) return '#2a0a15'
    return '#0e1220'
  }, [isUnderAttack])

  const emissiveColor = useMemo(() => {
    if (isUnderAttack) return '#ff1867'
    if (selected) return '#00e5ff'
    if (hovered) return '#00b8d4'
    if (status === 'critical') return STATUS_COLORS.critical
    return accentColor
  }, [isUnderAttack, selected, hovered, status, accentColor])

  const baseEmissiveIntensity = useMemo(() => {
    if (isUnderAttack) return 0.8
    if (selected) return 0.7
    if (hovered) return 0.5
    if (status === 'critical') return 0.5
    return 0.25
  }, [isUnderAttack, selected, hovered, status])

  // Pulse for critical / attack
  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    if (isUnderAttack) {
      mat.emissiveIntensity = 0.4 + Math.sin(clock.elapsedTime * 5) * 0.3
    } else if (status === 'critical' && !hovered && !selected) {
      mat.emissiveIntensity = 0.25 + Math.sin(clock.elapsedTime * 3) * 0.15
    }
  })

  // Edges geometry (cached)
  const edgesGeom = useMemo(
    () => getEdgesGeometry(shape, w, height, d),
    [shape, w, height, d],
  )

  // Interaction handlers
  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHovered(true)
    onHover(component, e)
    document.body.style.cursor = 'pointer'
  }, [component, onHover])

  const handlePointerOut = useCallback(() => {
    setHovered(false)
    onHover(null)
    document.body.style.cursor = 'auto'
  }, [onHover])

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const compId = component.id || component.asset_id
    onSelect(selected ? null : compId)
  }, [component.id, component.asset_id, selected, onSelect])

  const scaleVal = isUnderAttack ? 1.08 : hovered && !selected ? 1.04 : 1

  return (
    <group position={buildingPos}>
      {/* Main body mesh */}
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        scale={[scaleVal, scaleVal, scaleVal]}
      >
        <ShapeGeometry shape={shape} w={w} h={height} d={d} />
        {isGlass ? (
          <meshPhysicalMaterial
            color={bodyColor}
            metalness={0.1}
            roughness={0.05}
            transmission={0.3}
            transparent
            opacity={0.85}
            emissive={emissiveColor}
            emissiveIntensity={baseEmissiveIntensity}
            clearcoat={1.0}
            clearcoatRoughness={0.1}
          />
        ) : (
          <meshStandardMaterial
            color={bodyColor}
            roughness={0.25}
            metalness={0.85}
            emissive={emissiveColor}
            emissiveIntensity={baseEmissiveIntensity}
            transparent={status === 'offline'}
            opacity={status === 'offline' ? 0.4 : 1}
          />
        )}
      </mesh>

      {/* Edge glow lines — Bloom makes these glow */}
      <lineSegments geometry={edgesGeom} material={edgeMat} scale={[scaleVal, scaleVal, scaleVal]} />

      {/* Device accents — category-specific embedded elements */}
      <DeviceAccents
        category={component.category}
        height={height}
        width={w}
        accentColor={accentColor}
        status={status}
      />

      {/* Selection ring */}
      {selected && (
        <mesh
          position={[0, shape === 'dome' ? 0.02 : -height / 2 + 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[w * 0.8, w * 1.0, 32]} />
          <meshBasicMaterial color="#00e5ff" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Attack indicator */}
      {isUnderAttack && (
        <>
          <spotLight
            position={[0, height + 2, 0]}
            angle={0.4}
            penumbra={0.5}
            intensity={3}
            distance={height + 5}
            color="#ff1867"
            castShadow={false}
          />
          <mesh
            position={[0, shape === 'dome' ? 0.02 : -height / 2 + 0.02, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[w * 0.6, w * 0.85, 32]} />
            <meshBasicMaterial color="#ff1867" transparent opacity={0.5} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
    </group>
  )
}

// ── Shape Geometry Component ─────────────────────────────────────────────────
function ShapeGeometry({ shape, w, h, d }: { shape: BuildingShape; w: number; h: number; d: number }) {
  switch (shape) {
    case 'skyscraper':
      return <boxGeometry args={[w, h, d]} />
    case 'tower':
      return <cylinderGeometry args={[w * 0.4, w * 0.5, h, 8]} />
    case 'cylinder':
      return <cylinderGeometry args={[w * 0.5, w * 0.5, h, 16]} />
    case 'hexagon':
      return <cylinderGeometry args={[w * 0.5, w * 0.5, h, 6]} />
    case 'dome':
      return <sphereGeometry args={[w * 0.6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
    case 'wideLow':
      return <boxGeometry args={[w * 1.5, h, d * 1.2]} />
    default:
      return <boxGeometry args={[w, h, d]} />
  }
}

// ── Device Accent Elements ───────────────────────────────────────────────────
function DeviceAccents({
  category,
  height,
  width,
  accentColor,
  status,
}: {
  category: string
  height: number
  width: number
  accentColor: string
  status: string
}) {
  const emissiveIntensity = status === 'offline' ? 0 : 0.6

  switch (category) {
    case 'traffic':
      // Camera dome on roof
      return (
        <mesh position={[0, height / 2 + 0.12, 0]}>
          <sphereGeometry args={[0.08, 12, 8]} />
          <meshStandardMaterial
            color="#222"
            emissive={accentColor}
            emissiveIntensity={emissiveIntensity}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      )

    case 'iot':
      // Antenna mast on roof
      return (
        <group position={[0, height / 2, 0]}>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.4, 4]} />
            <meshStandardMaterial
              color="#444"
              emissive={accentColor}
              emissiveIntensity={emissiveIntensity * 0.3}
              metalness={0.9}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0, 0.42, 0]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial
              color={accentColor}
              emissive={accentColor}
              emissiveIntensity={emissiveIntensity}
              metalness={0.5}
              roughness={0.2}
            />
          </mesh>
        </group>
      )

    case 'network':
      // Server panel strips on front face
      return (
        <group>
          {[0.3, 0.5, 0.7].map((t, i) => (
            <mesh
              key={i}
              position={[0, -height / 2 + height * t, width / 2 + 0.005]}
            >
              <planeGeometry args={[width * 0.7, 0.05]} />
              <meshStandardMaterial
                color={accentColor}
                emissive={accentColor}
                emissiveIntensity={emissiveIntensity}
                roughness={0.1}
                metalness={0.9}
              />
            </mesh>
          ))}
        </group>
      )

    case 'security':
      // Shield emblem / scanning light on front
      return (
        <mesh position={[0, 0, width / 2 + 0.005]}>
          <planeGeometry args={[width * 0.4, width * 0.4]} />
          <meshStandardMaterial
            color={accentColor}
            emissive={accentColor}
            emissiveIntensity={emissiveIntensity}
            roughness={0.1}
            metalness={0.9}
            transparent
            opacity={0.8}
          />
        </mesh>
      )

    case 'industrial':
      // Smokestack on top
      return (
        <mesh position={[width * 0.3, height / 2 + 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.06, 0.5, 6]} />
          <meshStandardMaterial
            color="#333"
            emissive={accentColor}
            emissiveIntensity={emissiveIntensity * 0.3}
            metalness={0.7}
            roughness={0.5}
          />
        </mesh>
      )

    case 'training':
      // Target reticle ring on roof
      return (
        <mesh position={[0, height / 2 + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[width * 0.2, width * 0.35, 16]} />
          <meshStandardMaterial
            color={accentColor}
            emissive={accentColor}
            emissiveIntensity={emissiveIntensity}
            roughness={0.1}
            metalness={0.9}
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      )

    default:
      return null
  }
}
