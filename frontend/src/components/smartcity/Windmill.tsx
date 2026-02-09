import { useRef, useMemo } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

interface WindmillProps {
  position: [number, number, number]
  rpm?: number
  temperature?: number
  isHacked?: boolean
  onInteract?: () => void
}

export default function Windmill({ position, rpm = 12, temperature = 45, isHacked = false, onInteract }: WindmillProps) {
  const bladesRef = useRef<THREE.Group>(null!)

  const bladeColor = useMemo(() => {
    if (temperature > 80) return '#ef4444' // overheating
    if (isHacked) return '#ef4444'
    return '#e0e8f0'
  }, [temperature, isHacked])

  const bodyColor = isHacked ? '#7f1d1d' : '#d1d5db'

  useFrame((_, delta) => {
    if (!bladesRef.current) return
    const rotSpeed = (rpm / 60) * Math.PI * 2 * delta
    bladesRef.current.rotation.z += rotSpeed
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onInteract?.()
  }

  return (
    <group position={position} onClick={handleClick}>
      {/* Tower — tapered cylinder */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.3, 5, 8]} />
        <meshStandardMaterial color={bodyColor} roughness={0.6} metalness={0.4} />
      </mesh>

      {/* Nacelle — box at top */}
      <mesh position={[0, 5.1, 0]} castShadow>
        <boxGeometry args={[0.4, 0.3, 0.5]} />
        <meshStandardMaterial
          color={bodyColor}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>

      {/* Blades hub */}
      <group position={[0, 5.1, 0.3]} ref={bladesRef}>
        {/* Hub */}
        <mesh>
          <cylinderGeometry args={[0.08, 0.08, 0.15, 8]} />
          <meshStandardMaterial color="#6b7280" roughness={0.3} metalness={0.8} />
        </mesh>

        {/* 3 blades, 120° apart */}
        {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((angle, i) => (
          <mesh
            key={i}
            position={[Math.sin(angle) * 1.1, Math.cos(angle) * 1.1, 0.05]}
            rotation={[0, 0, angle]}
          >
            <boxGeometry args={[0.12, 2.2, 0.03]} />
            <meshStandardMaterial
              color={bladeColor}
              roughness={0.3}
              metalness={0.5}
              emissive={isHacked ? '#ef4444' : '#000000'}
              emissiveIntensity={isHacked ? 0.3 : 0}
            />
          </mesh>
        ))}
      </group>

      {/* Warning light when hacked or overheating */}
      {(isHacked || temperature > 80) && (
        <pointLight
          position={[0, 5.5, 0]}
          intensity={1.5}
          distance={6}
          color="#ef4444"
        />
      )}

      {/* Base */}
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.6, 0.1, 8]} />
        <meshStandardMaterial color="#374151" roughness={0.8} metalness={0.3} />
      </mesh>
    </group>
  )
}
