import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'

interface MarkerData {
  position: [number, number, number]
  label: string
  value: string
  color: string
  pulseSpeed?: number
}

const DEFAULT_MARKERS: MarkerData[] = [
  { position: [-12, 6, -10], label: 'TRAFFIC', value: '342/min', color: '#ff003c' },
  { position: [12, 5.5, -10], label: 'IOT', value: '2.4K nodes', color: '#00f0ff' },
  { position: [-3, 7, 4], label: 'NETWORK', value: '8.4 Gbps', color: '#bf00ff' },
  { position: [3, 6.5, 4], label: 'SECURITY', value: '99.9%', color: '#00ff88' },
  { position: [-4, 5, 14], label: 'INDUSTRIAL', value: '1.2 GW', color: '#ffaa00' },
  { position: [18, 5, 8], label: 'CYBER RANGE', value: 'ACTIVE', color: '#00ff88' },
]

function Marker({ position, label, value, color, pulseSpeed = 1.5 }: MarkerData) {
  const groupRef = useRef<THREE.Group>(null!)
  const beamRef = useRef<THREE.Mesh>(null!)
  const dotRef = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(t * pulseSpeed) * 0.15
    }
    if (beamRef.current) {
      const mat = beamRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.08 + Math.sin(t * 2) * 0.04
    }
    if (dotRef.current) {
      const s = 1 + Math.sin(t * 3) * 0.15
      dotRef.current.scale.set(s, s, s)
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Vertical beam from ground */}
      <mesh ref={beamRef} position={[0, -position[1] / 2, 0]}>
        <cylinderGeometry args={[0.015, 0.015, position[1], 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} depthWrite={false} />
      </mesh>

      {/* Ground ring */}
      <mesh position={[0, -position[1] + 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.45, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Dot at top */}
      <mesh ref={dotRef}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Glow sphere around dot */}
      <mesh>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.06} depthWrite={false} />
      </mesh>

      {/* Billboard label */}
      <Billboard position={[0, 0.8, 0]}>
        <Text
          fontSize={0.3}
          color={color}
          anchorX="center"
          anchorY="bottom"
          font="https://fonts.gstatic.com/s/orbitron/v31/yMJMMIlzdpvBhQQL_SC3X9yhF25-T1nyGy6BoWgz.woff2"
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          {label}
        </Text>
      </Billboard>

      <Billboard position={[0, 0.45, 0]}>
        <Text
          fontSize={0.22}
          color="#e8f4f8"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.008}
          outlineColor="#000000"
        >
          {value}
        </Text>
      </Billboard>
    </group>
  )
}

export default function FloatingMarkers({ markers = DEFAULT_MARKERS }: { markers?: MarkerData[] }) {
  return (
    <group>
      {markers.map((m, i) => (
        <Marker key={i} {...m} pulseSpeed={1.2 + i * 0.15} />
      ))}
    </group>
  )
}
