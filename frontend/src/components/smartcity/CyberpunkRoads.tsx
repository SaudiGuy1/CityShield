import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * CyberpunkRoads: Tron-style animated roads connecting districts.
 *
 * Layout matches CityLayout:
 *  - Main E-W highway at z = -3 (connecting Traffic & IoT)
 *  - N-S highway at x = 0 (connecting HQ to north highway)
 *  - South E-W highway at z = 9 (connecting HQ to Industrial & Cyber Range)
 *  - Diagonal connectors to Industrial and Cyber Range
 */

// Road segment definition
interface RoadSegment {
  from: [number, number]
  to: [number, number]
  width: number
}

const ROAD_SEGMENTS: RoadSegment[] = [
  // Main E-W highway (north)
  { from: [-20, -3], to: [20, -3], width: 1.2 },
  // N-S connector (HQ spine)
  { from: [0, -3], to: [0, 9], width: 1.0 },
  // South E-W highway
  { from: [-12, 9], to: [22, 9], width: 1.0 },
  // Traffic district connector
  { from: [-12, -3], to: [-12, -6], width: 0.7 },
  // IoT district connector
  { from: [12, -3], to: [12, -6], width: 0.7 },
  // Industrial connector (diagonal)
  { from: [-2, 9], to: [-4, 12], width: 0.6 },
  // Cyber Range connector (diagonal)
  { from: [14, 9], to: [18, 8], width: 0.6 },
  // HQ left/right connectors
  { from: [-3, 4], to: [-6, 4], width: 0.5 },
  { from: [3, 4], to: [6, 4], width: 0.5 },
]

export default function CyberpunkRoads() {
  return (
    <group>
      {/* Road surfaces */}
      {ROAD_SEGMENTS.map((seg, i) => (
        <RoadSurface key={`road-${i}`} segment={seg} />
      ))}

      {/* Animated center strips */}
      {ROAD_SEGMENTS.map((seg, i) => (
        <AnimatedCenterStrip key={`strip-${i}`} segment={seg} index={i} />
      ))}

      {/* Road edge glow lines */}
      {ROAD_SEGMENTS.map((seg, i) => (
        <RoadEdges key={`edge-${i}`} segment={seg} />
      ))}
    </group>
  )
}

// ── Road Surface ─────────────────────────────────────────────────────────────
function RoadSurface({ segment }: { segment: RoadSegment }) {
  const { from, to, width } = segment
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const length = Math.sqrt(dx * dx + dz * dz)
  const angle = Math.atan2(dx, dz)
  const cx = (from[0] + to[0]) / 2
  const cz = (from[1] + to[1]) / 2

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, angle]}
      position={[cx, 0.006, cz]}
      receiveShadow
    >
      <planeGeometry args={[width, length]} />
      <meshStandardMaterial
        color="#0c1018"
        roughness={0.7}
        metalness={0.3}
      />
    </mesh>
  )
}

// ── Road Edge Glow Lines ─────────────────────────────────────────────────────
function RoadEdges({ segment }: { segment: RoadSegment }) {
  const { from, to, width } = segment
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const length = Math.sqrt(dx * dx + dz * dz)
  const angle = Math.atan2(dx, dz)
  const cx = (from[0] + to[0]) / 2
  const cz = (from[1] + to[1]) / 2

  const hw = width / 2

  return (
    <group>
      {[-hw, hw].map((offset, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, angle]}
          position={[
            cx + Math.cos(angle) * offset,
            0.01,
            cz - Math.sin(angle) * offset,
          ]}
        >
          <planeGeometry args={[0.03, length]} />
          <meshStandardMaterial
            color="#00e5ff"
            emissive="#00e5ff"
            emissiveIntensity={1.2}
            roughness={0.1}
            metalness={0.9}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
    </group>
  )
}

// ── Animated Center Strip (Tron-style flowing dashes) ────────────────────────
function AnimatedCenterStrip({ segment, index }: { segment: RoadSegment; index: number }) {
  const instanceRef = useRef<THREE.InstancedMesh>(null!)

  const { from, to } = segment
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const length = Math.sqrt(dx * dx + dz * dz)
  const dashCount = Math.max(Math.floor(length / 0.6), 3)

  const dirX = dx / length
  const dirZ = dz / length

  // Precompute dash transforms
  const dummyMatrix = useMemo(() => new THREE.Matrix4(), [])

  useFrame(({ clock }) => {
    if (!instanceRef.current) return
    const t = clock.elapsedTime
    const mat = instanceRef.current.material as THREE.MeshStandardMaterial

    for (let i = 0; i < dashCount; i++) {
      const baseT = i / dashCount
      // Animate offset — dashes flow along the road
      const offset = ((baseT + t * 0.15 + index * 0.3) % 1) * length

      const x = from[0] + dirX * offset
      const z = from[1] + dirZ * offset
      const angle = Math.atan2(dx, dz)

      dummyMatrix.makeRotationY(angle)
      dummyMatrix.setPosition(x, 0.012, z)
      instanceRef.current.setMatrixAt(i, dummyMatrix)
    }
    instanceRef.current.instanceMatrix.needsUpdate = true

    // Pulse emissive intensity
    mat.emissiveIntensity = 0.5 + Math.sin(t * 2 + index) * 0.3
  })

  return (
    <instancedMesh ref={instanceRef} args={[undefined, undefined, dashCount]}>
      <boxGeometry args={[0.06, 0.008, 0.25]} />
      <meshStandardMaterial
        color="#00e5ff"
        emissive="#00e5ff"
        emissiveIntensity={1.5}
        roughness={0.1}
        metalness={0.9}
        transparent
        opacity={0.9}
      />
    </instancedMesh>
  )
}
