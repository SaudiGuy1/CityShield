import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface PillarConfig {
  position: [number, number, number]
  height: number
  color: string
}

const DEFAULT_PILLARS: PillarConfig[] = [
  // Perimeter corners
  { position: [-22, 0, -22], height: 12, color: '#00f0ff' },
  { position: [22, 0, -22], height: 10, color: '#bf00ff' },
  { position: [-22, 0, 22], height: 11, color: '#00ff88' },
  { position: [22, 0, 22], height: 9, color: '#ffaa00' },
  // Mid-edge accents
  { position: [0, 0, -22], height: 8, color: '#00f0ff' },
  { position: [0, 0, 22], height: 7, color: '#bf00ff' },
  { position: [-22, 0, 0], height: 9, color: '#00ff88' },
  { position: [22, 0, 0], height: 8, color: '#ffaa00' },
]

function Pillar({ position, height, color }: PillarConfig) {
  const beamRef = useRef<THREE.Mesh>(null!)
  const capRef = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (beamRef.current) {
      const mat = beamRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.06 + Math.sin(t * 1.5 + position[0]) * 0.02
    }
    if (capRef.current) {
      const s = 1 + Math.sin(t * 2 + position[2]) * 0.1
      capRef.current.scale.set(s, 1, s)
    }
  })

  return (
    <group position={position}>
      {/* Main beam */}
      <mesh ref={beamRef} position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.03, 0.08, height, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} depthWrite={false} />
      </mesh>

      {/* Inner bright core */}
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.01, 0.01, height, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} />
      </mesh>

      {/* Base ring */}
      <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.15, 0.35, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Cap glow */}
      <mesh ref={capRef} position={[0, height, 0]}>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>

      {/* Point light at top */}
      <pointLight position={[0, height, 0]} color={color} intensity={0.3} distance={6} />
    </group>
  )
}

export default function NeonPillars({ pillars = DEFAULT_PILLARS }: { pillars?: PillarConfig[] }) {
  return (
    <group>
      {pillars.map((p, i) => (
        <Pillar key={i} {...p} />
      ))}
    </group>
  )
}
