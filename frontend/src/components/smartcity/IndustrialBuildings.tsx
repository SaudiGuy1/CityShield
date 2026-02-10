import { useRef, useState, useMemo, useCallback } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { STATUS_COLORS, CATEGORY_COLORS } from './materials'
import type { CityAsset } from '../../types/assets'

interface IndustrialBuildingProps {
  component: CityAsset
  position: [number, number, number]
  selected: boolean
  isUnderAttack?: boolean
  onSelect: (id: string | null) => void
  onHover: (component: CityAsset | null, event?: ThreeEvent<PointerEvent>) => void
}

function computeHeight(eventsCount: number): number {
  const minH = 0.8
  const maxH = 3.5
  const t = Math.log1p(eventsCount) / Math.log1p(800)
  return minH + Math.min(t, 1) * (maxH - minH)
}

export default function IndustrialBuilding({ component, position, selected, isUnderAttack, onSelect, onHover }: IndustrialBuildingProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)
  const height = useMemo(() => computeHeight(component.eventsCount || 0), [component.eventsCount])

  const accentColor = CATEGORY_COLORS.industrial || '#f97316'

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

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    if (isUnderAttack) {
      mat.emissiveIntensity = 0.4 + Math.sin(clock.elapsedTime * 5) * 0.3
    } else if (component.status === 'critical' && !hovered && !selected) {
      mat.emissiveIntensity = 0.3 + Math.sin(clock.elapsedTime * 3) * 0.15
    }
  })

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

  const buildingPos: [number, number, number] = [position[0], height / 2, position[2]]

  // Determine building type based on component name
  const compId = component.id || component.asset_id
  const type = getBuildingType(compId)

  return (
    <group position={buildingPos}>
      {type === 'factory' && (
        <Factory
          meshRef={meshRef}
          height={height}
          color={color}
          emissiveColor={emissiveColor}
          accentColor={accentColor}
          isUnderAttack={isUnderAttack}
          hovered={hovered}
          selected={selected}
          handlePointerOver={handlePointerOver}
          handlePointerOut={handlePointerOut}
          handleClick={handleClick}
        />
      )}
      {type === 'powerplant' && (
        <PowerPlant
          meshRef={meshRef}
          height={height}
          color={color}
          emissiveColor={emissiveColor}
          accentColor={accentColor}
          isUnderAttack={isUnderAttack}
          hovered={hovered}
          selected={selected}
          handlePointerOver={handlePointerOver}
          handlePointerOut={handlePointerOut}
          handleClick={handleClick}
        />
      )}
      {type === 'watertank' && (
        <WaterTank
          meshRef={meshRef}
          height={height}
          color={color}
          emissiveColor={emissiveColor}
          accentColor={accentColor}
          isUnderAttack={isUnderAttack}
          hovered={hovered}
          selected={selected}
          handlePointerOver={handlePointerOver}
          handlePointerOut={handlePointerOut}
          handleClick={handleClick}
        />
      )}
      {type === 'default' && (
        <DefaultIndustrial
          meshRef={meshRef}
          height={height}
          color={color}
          emissiveColor={emissiveColor}
          accentColor={accentColor}
          isUnderAttack={isUnderAttack}
          hovered={hovered}
          selected={selected}
          handlePointerOver={handlePointerOver}
          handlePointerOut={handlePointerOut}
          handleClick={handleClick}
        />
      )}

      {/* Selection ring */}
      {selected && (
        <mesh position={[0, -height / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.75, 32]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Attack spotlight */}
      {isUnderAttack && (
        <>
          <spotLight
            position={[0, height + 2, 0]}
            angle={0.4}
            penumbra={0.5}
            intensity={3}
            distance={height + 4}
            color="#ef4444"
            target-position={[0, 0, 0]}
            castShadow={false}
          />
          <mesh position={[0, -height / 2 + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.5, 0.7, 32]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
    </group>
  )
}

function getBuildingType(id: string): 'factory' | 'powerplant' | 'watertank' | 'default' {
  if (id.includes('plc') || id.includes('rail')) return 'factory'
  if (id.includes('power') || id.includes('grid')) return 'powerplant'
  if (id.includes('scada') || id.includes('water')) return 'watertank'
  return 'default'
}

interface BuildingShapeProps {
  meshRef: React.RefObject<THREE.Mesh>
  height: number
  color: string
  emissiveColor: string
  accentColor: string
  isUnderAttack?: boolean
  hovered: boolean
  selected: boolean
  handlePointerOver: (e: ThreeEvent<PointerEvent>) => void
  handlePointerOut: () => void
  handleClick: (e: ThreeEvent<MouseEvent>) => void
}

function Factory({ meshRef, height, color, emissiveColor, accentColor, isUnderAttack, hovered, selected, handlePointerOver, handlePointerOut, handleClick }: BuildingShapeProps) {
  const emissiveIntensity = selected ? 0.6 : hovered ? 0.4 : isUnderAttack ? 0.5 : 0
  return (
    <group>
      {/* Main body */}
      <mesh
        ref={meshRef}
        castShadow receiveShadow
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        scale={hovered && !selected ? [1.05, 1.05, 1.05] : [1, 1, 1]}
      >
        <boxGeometry args={[0.9, height, 0.7]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.5} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {/* Smokestack */}
      <mesh position={[0.3, height / 2 + 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 0.8, 6]} />
        <meshStandardMaterial color="#4b5563" roughness={0.7} metalness={0.4} />
      </mesh>
      {/* Roof accent */}
      <mesh position={[0, height / 2 + 0.02, 0]} castShadow>
        <boxGeometry args={[0.94, 0.04, 0.74]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.3} roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  )
}

function PowerPlant({ meshRef, height, color, emissiveColor, accentColor, isUnderAttack, hovered, selected, handlePointerOver, handlePointerOut, handleClick }: BuildingShapeProps) {
  const emissiveIntensity = selected ? 0.6 : hovered ? 0.4 : isUnderAttack ? 0.5 : 0
  return (
    <group>
      {/* Cooling tower — truncated cone */}
      <mesh
        ref={meshRef}
        castShadow receiveShadow
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        scale={hovered && !selected ? [1.05, 1.05, 1.05] : [1, 1, 1]}
      >
        <cylinderGeometry args={[0.25, 0.45, height, 8]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.5} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {/* Top rim */}
      <mesh position={[0, height / 2, 0]}>
        <torusGeometry args={[0.25, 0.03, 8, 16]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.3} roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  )
}

function WaterTank({ meshRef, height, color, emissiveColor, accentColor, isUnderAttack, hovered, selected, handlePointerOver, handlePointerOut, handleClick }: BuildingShapeProps) {
  const emissiveIntensity = selected ? 0.6 : hovered ? 0.4 : isUnderAttack ? 0.5 : 0
  return (
    <group>
      {/* Cylindrical tank */}
      <mesh
        ref={meshRef}
        castShadow receiveShadow
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        scale={hovered && !selected ? [1.05, 1.05, 1.05] : [1, 1, 1]}
      >
        <cylinderGeometry args={[0.4, 0.4, height, 12]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.5} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {/* Flat top */}
      <mesh position={[0, height / 2 + 0.02, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.04, 12]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.3} roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  )
}

function DefaultIndustrial({ meshRef, height, color, emissiveColor, accentColor, isUnderAttack, hovered, selected, handlePointerOver, handlePointerOut, handleClick }: BuildingShapeProps) {
  const emissiveIntensity = selected ? 0.6 : hovered ? 0.4 : isUnderAttack ? 0.5 : 0
  return (
    <group>
      <mesh
        ref={meshRef}
        castShadow receiveShadow
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        scale={hovered && !selected ? [1.05, 1.05, 1.05] : [1, 1, 1]}
      >
        <boxGeometry args={[0.7, height, 0.7]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {/* Roof accent */}
      <mesh position={[0, height / 2 + 0.02, 0]} castShadow>
        <boxGeometry args={[0.74, 0.04, 0.74]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.3} roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  )
}
