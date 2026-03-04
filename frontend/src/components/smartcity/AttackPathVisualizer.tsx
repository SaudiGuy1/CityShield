import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { CityAsset, AttackPath } from '../../types/assets'

interface AttackPathVisualizerProps {
  paths: AttackPath[]
  assets: CityAsset[]
  zonePositions: Record<string, [number, number]>
}

export default function AttackPathVisualizer({ paths, assets, zonePositions }: AttackPathVisualizerProps) {
  if (!paths || paths.length === 0) return null

  return (
    <group>
      {paths.map((path) => (
        <AttackPathLine
          key={path.path_id}
          path={path}
          assets={assets}
          zonePositions={zonePositions}
        />
      ))}
    </group>
  )
}

interface AttackPathLineProps {
  path: AttackPath
  assets: CityAsset[]
  zonePositions: Record<string, [number, number]>
}

function AttackPathLine({ path, assets, zonePositions }: AttackPathLineProps) {
  const lineRef = useRef<THREE.Line>(null!)
  const particlesRef = useRef<THREE.Points>(null!)
  const tubeRef = useRef<THREE.Mesh>(null!)

  // Get 3D positions for each hop
  const points = useMemo(() => {
    return path.hops.map(hop => {
      const asset = assets.find(a => a.asset_id === hop.asset_id || a.id === hop.asset_id)
      if (!asset) {
        const zoneCenter = zonePositions['zone-a'] || [0, 0]
        return new THREE.Vector3(zoneCenter[0], 2, zoneCenter[1])
      }
      const zoneCenter = zonePositions[asset.zone] || [0, 0]
      return new THREE.Vector3(zoneCenter[0], 2, zoneCenter[1])
    })
  }, [path.hops, assets, zonePositions])

  // Smooth curve through points
  const curve = useMemo(() => {
    if (points.length < 2) return null
    return new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.3)
  }, [points])

  // Line object
  const lineObject = useMemo(() => {
    if (!curve) return null
    const curvePoints = curve.getPoints(50)
    const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints)
    const material = new THREE.LineBasicMaterial({
      color: path.visual.color,
      transparent: true,
      opacity: 0.7,
      linewidth: path.visual.thickness,
    })
    return new THREE.Line(geometry, material)
  }, [curve, path.visual.color, path.visual.thickness])

  // Energy beam tube (cyberpunk enhancement)
  const tubeGeometry = useMemo(() => {
    if (!curve) return null
    return new THREE.TubeGeometry(curve, 40, 0.06, 8, false)
  }, [curve])

  // Particles
  const particleCount = path.visual.particle_count || 25
  const particleGeometry = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geometry
  }, [particleCount])

  // Animate particles + tube pulse
  useFrame(({ clock }) => {
    if (!curve || !particlesRef.current) return

    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < particleCount; i++) {
      const t = ((clock.elapsedTime * path.visual.speed + i / particleCount) % 1)
      const point = curve.getPoint(t)
      positions[i * 3] = point.x
      positions[i * 3 + 1] = point.y
      positions[i * 3 + 2] = point.z
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true

    // Pulse tube emissive
    if (tubeRef.current) {
      const mat = tubeRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.3 + Math.sin(clock.elapsedTime * 4) * 0.2
    }
  })

  if (!curve || !lineObject) return null

  return (
    <group>
      {/* Energy beam tube */}
      {tubeGeometry && (
        <mesh ref={tubeRef} geometry={tubeGeometry}>
          <meshStandardMaterial
            color={path.visual.color}
            emissive={path.visual.color}
            emissiveIntensity={0.4}
            transparent
            opacity={0.25}
            roughness={0.1}
            metalness={0.9}
          />
        </mesh>
      )}

      {/* Core line */}
      <primitive ref={lineRef} object={lineObject} />

      {/* Animated particles — brighter */}
      <points ref={particlesRef} geometry={particleGeometry}>
        <pointsMaterial
          color={path.visual.color}
          size={0.2}
          transparent
          opacity={0.9}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Hop markers — neon spheres */}
      {points.map((point, i) => (
        <mesh key={i} position={[point.x, point.y, point.z]}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshStandardMaterial
            color={path.visual.color}
            emissive={path.visual.color}
            emissiveIntensity={0.8}
            transparent
            opacity={0.8}
            roughness={0.1}
            metalness={0.8}
          />
        </mesh>
      ))}
    </group>
  )
}
