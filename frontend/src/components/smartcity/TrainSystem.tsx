import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface TrainSystemProps {
  speed?: number
  isHacked?: boolean
}

// Build a rounded rectangular track path
function buildTrackCurve(): THREE.CatmullRomCurve3 {
  const corners = 8
  const points: THREE.Vector3[] = []

  // Rounded rectangle: 4 straight segments + 4 rounded corners
  const hw = 14 // half-width
  const hh = 14 // half-height
  const cr = 4  // corner radius

  // Top edge (z = -hh)
  for (let i = 0; i <= 8; i++) {
    points.push(new THREE.Vector3(-hw + cr + (2 * hw - 2 * cr) * (i / 8), 0.15, -hh))
  }
  // Top-right corner
  for (let i = 0; i <= corners; i++) {
    const angle = -Math.PI / 2 + (Math.PI / 2) * (i / corners)
    points.push(new THREE.Vector3(hw - cr + cr * Math.cos(angle), 0.15, -hh + cr + cr * Math.sin(angle)))
  }
  // Right edge
  for (let i = 0; i <= 8; i++) {
    points.push(new THREE.Vector3(hw, 0.15, -hh + cr + (2 * hh - 2 * cr) * (i / 8)))
  }
  // Bottom-right corner
  for (let i = 0; i <= corners; i++) {
    const angle = 0 + (Math.PI / 2) * (i / corners)
    points.push(new THREE.Vector3(hw - cr + cr * Math.cos(angle), 0.15, hh - cr + cr * Math.sin(angle)))
  }
  // Bottom edge
  for (let i = 0; i <= 8; i++) {
    points.push(new THREE.Vector3(hw - cr - (2 * hw - 2 * cr) * (i / 8), 0.15, hh))
  }
  // Bottom-left corner
  for (let i = 0; i <= corners; i++) {
    const angle = Math.PI / 2 + (Math.PI / 2) * (i / corners)
    points.push(new THREE.Vector3(-hw + cr + cr * Math.cos(angle), 0.15, hh - cr + cr * Math.sin(angle)))
  }
  // Left edge
  for (let i = 0; i <= 8; i++) {
    points.push(new THREE.Vector3(-hw, 0.15, hh - cr - (2 * hh - 2 * cr) * (i / 8)))
  }
  // Top-left corner
  for (let i = 0; i <= corners; i++) {
    const angle = Math.PI + (Math.PI / 2) * (i / corners)
    points.push(new THREE.Vector3(-hw + cr + cr * Math.cos(angle), 0.15, -hh + cr + cr * Math.sin(angle)))
  }

  return new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5)
}

export default function TrainSystem({ speed = 0.015, isHacked = false }: TrainSystemProps) {
  const trainRef = useRef<THREE.Group>(null!)
  const tRef = useRef(0)

  const curve = useMemo(() => buildTrackCurve(), [])

  // Railroad ties positions along the curve
  const tiePositions = useMemo(() => {
    const positions: Array<{ pos: THREE.Vector3; tangent: THREE.Vector3 }> = []
    const totalLength = curve.getLength()
    const spacing = 0.5
    const count = Math.floor(totalLength / spacing)
    for (let i = 0; i < count; i++) {
      const t = i / count
      positions.push({
        pos: curve.getPointAt(t),
        tangent: curve.getTangentAt(t),
      })
    }
    return positions
  }, [curve])

  // Animate train along curve
  useFrame((_, delta) => {
    if (!trainRef.current) return
    const actualSpeed = speed * delta * 60
    tRef.current = (tRef.current + actualSpeed) % 1

    const point = curve.getPointAt(tRef.current)
    const tangent = curve.getTangentAt(tRef.current)
    const lookTarget = point.clone().add(tangent)

    trainRef.current.position.copy(point)
    trainRef.current.lookAt(lookTarget)
  })

  const trainColor = isHacked ? '#ef4444' : '#60a5fa'
  const trainEmissive = isHacked ? '#ef4444' : '#3b82f6'

  return (
    <group>
      {/* Track rail - left */}
      <TrackRail curve={curve} offset={-0.15} />
      {/* Track rail - right */}
      <TrackRail curve={curve} offset={0.15} />

      {/* Railroad ties */}
      {tiePositions.map((tie, i) => {
        const angle = Math.atan2(tie.tangent.x, tie.tangent.z)
        return (
          <mesh key={i} position={[tie.pos.x, 0.08, tie.pos.z]} rotation={[0, angle, 0]}>
            <boxGeometry args={[0.5, 0.04, 0.08]} />
            <meshStandardMaterial color="#3a2a1a" roughness={0.9} metalness={0.1} />
          </mesh>
        )
      })}

      {/* Train */}
      <group ref={trainRef}>
        {/* Locomotive */}
        <mesh position={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[0.4, 0.4, 0.9]} />
          <meshStandardMaterial
            color={trainColor}
            roughness={0.3}
            metalness={0.7}
            emissive={trainEmissive}
            emissiveIntensity={isHacked ? 0.5 : 0.2}
          />
        </mesh>
        {/* Locomotive roof */}
        <mesh position={[0, 0.52, 0]} castShadow>
          <boxGeometry args={[0.35, 0.05, 0.85]} />
          <meshStandardMaterial color="#1e3a5f" roughness={0.5} metalness={0.6} />
        </mesh>
        {/* Headlight */}
        <mesh position={[0, 0.35, 0.46]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color="#ffffaa" />
        </mesh>
        <pointLight position={[0, 0.35, 0.6]} intensity={0.5} distance={3} color="#ffffaa" />

        {/* Carriage 1 */}
        <mesh position={[0, 0.28, -1.2]} castShadow>
          <boxGeometry args={[0.38, 0.35, 0.8]} />
          <meshStandardMaterial color="#4a6fa5" roughness={0.4} metalness={0.5} />
        </mesh>

        {/* Carriage 2 */}
        <mesh position={[0, 0.28, -2.2]} castShadow>
          <boxGeometry args={[0.38, 0.35, 0.8]} />
          <meshStandardMaterial color="#4a6fa5" roughness={0.4} metalness={0.5} />
        </mesh>

        {isHacked && (
          <pointLight position={[0, 0.5, 0]} intensity={1} distance={4} color="#ef4444" />
        )}
      </group>
    </group>
  )
}

function TrackRail({ curve, offset }: { curve: THREE.CatmullRomCurve3; offset: number }) {
  const geometry = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const segments = 200
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const point = curve.getPointAt(t)
      const tangent = curve.getTangentAt(t)
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize()
      pts.push(point.clone().add(normal.multiplyScalar(offset)))
    }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [curve, offset])

  const material = useMemo(() => new THREE.LineBasicMaterial({ color: '#5a6a7a' }), [])

  const line = useMemo(() => {
    const l = new THREE.Line(geometry, material)
    return l
  }, [geometry, material])

  return <primitive object={line} />
}
