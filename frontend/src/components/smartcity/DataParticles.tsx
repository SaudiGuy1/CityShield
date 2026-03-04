import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * DataParticles: Ambient floating data particles using THREE.Points.
 * Single draw call for 200 particles — minimal performance cost.
 * Particles drift upward and respawn, giving a "data stream" feel.
 */

const PARTICLE_COUNT = 200
const SPREAD = 35
const HEIGHT_RANGE = 12

export default function DataParticles() {
  const pointsRef = useRef<THREE.Points>(null!)

  // Initialize particle positions and velocities
  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3)
    const vel = new Float32Array(PARTICLE_COUNT * 3)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      pos[i3] = (Math.random() - 0.5) * SPREAD      // x
      pos[i3 + 1] = Math.random() * HEIGHT_RANGE      // y
      pos[i3 + 2] = (Math.random() - 0.5) * SPREAD    // z

      vel[i3] = (Math.random() - 0.5) * 0.02          // x drift
      vel[i3 + 1] = 0.01 + Math.random() * 0.03       // y rise
      vel[i3 + 2] = (Math.random() - 0.5) * 0.02      // z drift
    }

    return { positions: pos, velocities: vel }
  }, [])

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geom
  }, [positions])

  useFrame(() => {
    if (!pointsRef.current) return
    const posAttr = pointsRef.current.geometry.attributes.position.array as Float32Array

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3

      posAttr[i3] += velocities[i3]
      posAttr[i3 + 1] += velocities[i3 + 1]
      posAttr[i3 + 2] += velocities[i3 + 2]

      // Respawn if too high or too far
      if (
        posAttr[i3 + 1] > HEIGHT_RANGE ||
        Math.abs(posAttr[i3]) > SPREAD / 2 ||
        Math.abs(posAttr[i3 + 2]) > SPREAD / 2
      ) {
        posAttr[i3] = (Math.random() - 0.5) * SPREAD
        posAttr[i3 + 1] = 0
        posAttr[i3 + 2] = (Math.random() - 0.5) * SPREAD
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color="#00e5ff"
        size={0.15}
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
