import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

interface CityData {
  traffic: number
  iot: number
  network: number
}

interface BuildingProps {
  position: [number, number, number]
  height: number
  color: string
  active: boolean
}

function Building({ position, height, color, active }: BuildingProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)

  useFrame(() => {
    if (meshRef.current && active) {
      meshRef.current.rotation.y += 0.01
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      scale={hovered ? 1.1 : 1}
    >
      <boxGeometry args={[1, height, 1]} />
      <meshStandardMaterial
        color={hovered ? '#3b82f6' : color}
        emissive={active ? color : '#000000'}
        emissiveIntensity={active ? 0.3 : 0}
      />
    </mesh>
  )
}

function City({ data }: { data: CityData }) {
  return (
    <group>
      {/* Traffic Zone */}
      <Building position={[-3, 1.5, 0]} height={3} color="#ef4444" active={data.traffic > 0} />
      <Building position={[-3, 1, 2]} height={2} color="#f59e0b" active={data.traffic > 0} />
      <Building position={[-3, 2, -2]} height={4} color="#ef4444" active={data.traffic > 0} />

      {/* IoT Zone */}
      <Building position={[0, 2.5, 0]} height={5} color="#10b981" active={data.iot > 0} />
      <Building position={[0, 1.5, -2]} height={3} color="#34d399" active={data.iot > 0} />
      <Building position={[0, 1, 2]} height={2} color="#10b981" active={data.iot > 0} />

      {/* Network Zone */}
      <Building position={[3, 2, 0]} height={4} color="#3b82f6" active={data.network > 0} />
      <Building position={[3, 1.5, 2]} height={3} color="#60a5fa" active={data.network > 0} />
      <Building position={[3, 1.75, -2]} height={3.5} color="#3b82f6" active={data.network > 0} />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a2642" />
      </mesh>

      {/* Grid */}
      <gridHelper args={[20, 20, '#2d3e5f', '#1e2d4d']} />
    </group>
  )
}

export default function CityVisualization({ data }: { data: CityData }) {
  return (
    <div style={{ width: '100%', height: '400px', borderRadius: '1rem', overflow: 'hidden' }}>
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[8, 6, 8]} />
        <OrbitControls enableZoom={true} enablePan={false} maxPolarAngle={Math.PI / 2} />

        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <pointLight position={[-10, 10, -5]} intensity={0.5} color="#3b82f6" />
        <pointLight position={[10, 5, 10]} intensity={0.5} color="#8b5cf6" />

        <City data={data} />
      </Canvas>
    </div>
  )
}
