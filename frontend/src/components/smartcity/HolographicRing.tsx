import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface HolographicRingProps {
  position?: [number, number, number]
  radius?: number
  color?: string
  speed?: number
  opacity?: number
}

export default function HolographicRing({
  position = [0, 8, 0],
  radius = 18,
  color = '#00f0ff',
  speed = 0.15,
  opacity = 0.25,
}: HolographicRingProps) {
  const ringRef = useRef<THREE.Group>(null!)
  const innerRef = useRef<THREE.Mesh>(null!)

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.y += delta * speed
    }
    if (innerRef.current) {
      innerRef.current.rotation.y -= delta * speed * 0.6
    }
  })

  return (
    <group position={position}>
      {/* Outer ring */}
      <group ref={ringRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius, 0.04, 16, 128]} />
          <meshBasicMaterial color={color} transparent opacity={opacity} />
        </mesh>

        {/* Tick marks on outer ring */}
        {Array.from({ length: 48 }).map((_, i) => {
          const angle = (i / 48) * Math.PI * 2
          const x = Math.cos(angle) * radius
          const z = Math.sin(angle) * radius
          const isMajor = i % 6 === 0
          return (
            <mesh key={i} position={[x, 0, z]} rotation={[0, -angle, 0]}>
              <boxGeometry args={[0.02, isMajor ? 0.15 : 0.06, isMajor ? 0.5 : 0.25]} />
              <meshBasicMaterial color={color} transparent opacity={isMajor ? opacity * 1.5 : opacity * 0.7} />
            </mesh>
          )
        })}
      </group>

      {/* Inner ring — counter-rotates */}
      <mesh ref={innerRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.82, 0.025, 16, 96]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.5} />
      </mesh>

      {/* Dashed mid ring (static) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.91, 0.015, 8, 64]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.3} />
      </mesh>

      {/* Faint glow disc */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.75, radius * 1.05, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.02}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
