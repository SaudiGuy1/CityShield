import { useRef, useState, useMemo, useCallback } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { STATUS_COLORS, CATEGORY_COLORS } from './materials'
import type { CityAsset } from '../../types/assets'

interface BuildingProps {
  component: CityAsset
  position: [number, number, number]
  selected: boolean
  isUnderAttack?: boolean
  onSelect: (id: string | null) => void
  onHover: (component: CityAsset | null, event?: ThreeEvent<PointerEvent>) => void
}

// Height scaling: map risk_score (0-100) to visual range
function computeHeightFromRisk(riskScore: number): number {
  const minH = 0.6
  const maxH = 4.0
  // Linear scale: risk_score is already 0-100
  const t = Math.max(0, Math.min(100, riskScore)) / 100
  return minH + t * (maxH - minH)
}

// Fallback for assets without risk_score (use event count)
function computeHeight(eventsCount: number): number {
  const minH = 0.6
  const maxH = 4.0
  const t = Math.log1p(eventsCount) / Math.log1p(800)
  return minH + Math.min(t, 1) * (maxH - minH)
}

// Building width based on category to add visual variety
const CATEGORY_WIDTH: Record<string, number> = {
  traffic: 0.7,
  iot: 0.55,
  network: 0.65,
  security: 0.8,
  industrial: 0.75,
  training: 0.7,
}

export default function Building({ component, position, selected, isUnderAttack, onSelect, onHover }: BuildingProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)

  // Use risk_score for height (HighTopo-equivalent visual encoding)
  const height = useMemo(() => {
    const riskScore = component.metrics?.risk_score ?? component.eventsCount
    return typeof riskScore === 'number' && riskScore <= 100
      ? computeHeightFromRisk(riskScore)
      : computeHeight(component.eventsCount || 0)
  }, [component.metrics?.risk_score, component.eventsCount])

  const width = CATEGORY_WIDTH[component.category] || 0.65

  // Position building so its base sits on the ground (y = height/2)
  const buildingPos: [number, number, number] = [position[0], height / 2, position[2]]

  const color = useMemo(() => {
    if (isUnderAttack) return '#ef4444'
    if (hovered || selected) return '#3b82f6'
    const status = component.status || component.state?.status || 'ok'
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#6b7280'
  }, [hovered, selected, component.status, component.state?.status, isUnderAttack])

  const emissiveColor = useMemo(() => {
    if (isUnderAttack) return '#ef4444'
    if (selected) return '#3b82f6'
    if (hovered) return '#60a5fa'
    if (component.status === 'critical') return STATUS_COLORS.critical
    return '#000000'
  }, [hovered, selected, component.status, isUnderAttack])

  const emissiveIntensity = useMemo(() => {
    if (isUnderAttack) return 0.5
    if (selected) return 0.6
    if (hovered) return 0.4
    if (component.status === 'critical') return 0.3 + Math.sin(Date.now() * 0.003) * 0.15
    return 0
  }, [hovered, selected, component.status, isUnderAttack])

  // Subtle pulse for critical buildings and attack pulse
  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    if (isUnderAttack) {
      mat.emissiveIntensity = 0.4 + Math.sin(clock.elapsedTime * 5) * 0.3
    } else if (component.status === 'critical' && !hovered && !selected) {
      mat.emissiveIntensity = 0.3 + Math.sin(clock.elapsedTime * 3) * 0.15
    }
  })

  // Roof accent strip color (category color)
  const accentColor = CATEGORY_COLORS[component.category] || '#3b82f6'

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

  const scaleVal = isUnderAttack ? 1.1 : hovered && !selected ? 1.05 : 1

  return (
    <group position={buildingPos}>
      {/* Main building body */}
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        scale={[scaleVal, scaleVal, scaleVal]}
      >
        <boxGeometry args={[width, height, width]} />
        <meshStandardMaterial
          color={color}
          roughness={0.4}
          metalness={0.6}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          transparent={component.status === 'offline'}
          opacity={component.status === 'offline' ? 0.5 : 1}
        />
      </mesh>

      {/* Roof accent stripe */}
      <mesh position={[0, height / 2 + 0.02, 0]} castShadow>
        <boxGeometry args={[width + 0.04, 0.04, width + 0.04]} />
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={0.3}
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>

      {/* Window rows – procedural detail */}
      {height > 1.2 && (
        <WindowRows width={width} height={height} status={component.status || 'ok'} />
      )}

      {/* Selection ring */}
      {selected && (
        <mesh position={[0, -height / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[width * 0.7, width * 0.85, 32]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Attack spotlight and ring */}
      {isUnderAttack && (
        <>
          <spotLight
            position={[0, height + 2, 0]}
            angle={0.4}
            penumbra={0.5}
            intensity={3}
            distance={height + 4}
            color="#ef4444"
            castShadow={false}
          />
          <mesh position={[0, -height / 2 + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[width * 0.6, width * 0.8, 32]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
    </group>
  )
}

function WindowRows({ width, height, status }: { width: number; height: number; status: string }) {
  const windowColor = status === 'offline' ? '#1a1f2e' : '#1e3a5f'
  const windowEmissive = status === 'offline' ? '#000000' : '#3b82f6'
  const intensity = status === 'offline' ? 0 : 0.15

  const rows = Math.floor(height / 0.5)
  return (
    <>
      {Array.from({ length: Math.min(rows, 6) }, (_, i) => (
        <mesh
          key={i}
          position={[0, -height / 2 + 0.5 + i * (height / (rows + 1)), width / 2 + 0.005]}
        >
          <planeGeometry args={[width * 0.6, 0.12]} />
          <meshStandardMaterial
            color={windowColor}
            emissive={windowEmissive}
            emissiveIntensity={intensity}
            roughness={0.2}
            metalness={0.9}
          />
        </mesh>
      ))}
    </>
  )
}
