import { useRef, useMemo } from 'react'
import * as THREE from 'three'

// Generate tree positions avoiding zones and roads
function generateTreePositions(): Array<{ pos: [number, number, number]; scale: number }> {
  const trees: Array<{ pos: [number, number, number]; scale: number }> = []
  const rng = (seed: number) => {
    let s = seed
    return () => {
      s = (s * 16807) % 2147483647
      return (s - 1) / 2147483646
    }
  }
  const rand = rng(42)

  // Zone centers to avoid (±8, ±8 and center 0,0)
  const zones = [
    [-8, -8], [8, -8], [-8, 8], [8, 8], [0, 0],
  ]

  const isNearZone = (x: number, z: number) =>
    zones.some(([zx, zz]) => Math.abs(x - zx) < 5 && Math.abs(z - zz) < 5)

  const isOnRoad = (x: number, z: number) =>
    (Math.abs(z) < 1 && Math.abs(x) < 14) || // horizontal main
    (Math.abs(x) < 1 && Math.abs(z) < 14) || // vertical main
    (Math.abs(z - 12) < 0.8 && Math.abs(x) < 12) || // ring top
    (Math.abs(z + 12) < 0.8 && Math.abs(x) < 12) || // ring bottom
    (Math.abs(x - 12) < 0.8 && Math.abs(z) < 12) || // ring right
    (Math.abs(x + 12) < 0.8 && Math.abs(z) < 12)    // ring left

  // Along road edges
  for (let x = -13; x <= 13; x += 2.5) {
    for (const zOff of [1.5, -1.5]) {
      if (!isNearZone(x, zOff) && !isOnRoad(x, zOff)) {
        trees.push({ pos: [x + (rand() - 0.5) * 0.5, 0, zOff + (rand() - 0.5) * 0.3], scale: 0.7 + rand() * 0.6 })
      }
    }
  }
  for (let z = -13; z <= 13; z += 2.5) {
    for (const xOff of [1.5, -1.5]) {
      if (!isNearZone(xOff, z) && !isOnRoad(xOff, z)) {
        trees.push({ pos: [xOff + (rand() - 0.5) * 0.3, 0, z + (rand() - 0.5) * 0.5], scale: 0.7 + rand() * 0.6 })
      }
    }
  }

  // City perimeter
  for (let i = -14; i <= 14; i += 2) {
    for (const edge of [-15, 15]) {
      trees.push({ pos: [i + (rand() - 0.5) * 0.8, 0, edge + (rand() - 0.5) * 0.5], scale: 0.8 + rand() * 0.5 })
      trees.push({ pos: [edge + (rand() - 0.5) * 0.5, 0, i + (rand() - 0.5) * 0.8], scale: 0.8 + rand() * 0.5 })
    }
  }

  // Zone corners - a few trees around each zone
  for (const [zx, zz] of zones) {
    for (const corner of [[4.5, 4.5], [-4.5, 4.5], [4.5, -4.5], [-4.5, -4.5]]) {
      const tx = zx + corner[0] + (rand() - 0.5) * 0.5
      const tz = zz + corner[1] + (rand() - 0.5) * 0.5
      if (!isOnRoad(tx, tz) && Math.abs(tx) < 16 && Math.abs(tz) < 16) {
        trees.push({ pos: [tx, 0, tz], scale: 0.7 + rand() * 0.5 })
      }
    }
  }

  return trees
}

const TREE_POSITIONS = generateTreePositions()

export default function Trees() {
  const trunkRef = useRef<THREE.InstancedMesh>(null!)
  const canopy1Ref = useRef<THREE.InstancedMesh>(null!)
  const canopy2Ref = useRef<THREE.InstancedMesh>(null!)

  const count = TREE_POSITIONS.length

  useMemo(() => {
    const dummy = new THREE.Object3D()

    // We need to wait for refs, so we schedule in a microtask-like pattern
    // But since useMemo runs synchronously before render, we'll set matrices after mount
    // Actually we can build the matrices and apply them after ref is available
    return { dummy }
  }, [])

  // Apply instance transforms
  useMemo(() => {
    if (!trunkRef.current || !canopy1Ref.current || !canopy2Ref.current) return
    const dummy = new THREE.Object3D()

    TREE_POSITIONS.forEach((tree, i) => {
      const s = tree.scale
      // Trunk
      dummy.position.set(tree.pos[0], s * 0.5, tree.pos[2])
      dummy.scale.set(s, s, s)
      dummy.updateMatrix()
      trunkRef.current.setMatrixAt(i, dummy.matrix)

      // Lower canopy cone
      dummy.position.set(tree.pos[0], s * 1.2, tree.pos[2])
      dummy.scale.set(s, s, s)
      dummy.updateMatrix()
      canopy1Ref.current.setMatrixAt(i, dummy.matrix)

      // Upper canopy cone
      dummy.position.set(tree.pos[0], s * 1.7, tree.pos[2])
      dummy.scale.set(s * 0.75, s * 0.75, s * 0.75)
      dummy.updateMatrix()
      canopy2Ref.current.setMatrixAt(i, dummy.matrix)
    })

    trunkRef.current.instanceMatrix.needsUpdate = true
    canopy1Ref.current.instanceMatrix.needsUpdate = true
    canopy2Ref.current.instanceMatrix.needsUpdate = true
  }, [trunkRef.current, canopy1Ref.current, canopy2Ref.current])

  return (
    <group>
      {/* Tree trunks */}
      <instancedMesh ref={trunkRef} args={[undefined, undefined, count]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 1, 5]} />
        <meshStandardMaterial color="#4a3728" roughness={0.9} metalness={0.1} />
      </instancedMesh>

      {/* Lower canopy */}
      <instancedMesh ref={canopy1Ref} args={[undefined, undefined, count]} castShadow>
        <coneGeometry args={[0.4, 0.8, 6]} />
        <meshStandardMaterial color="#1a5c2a" roughness={0.8} metalness={0.05} />
      </instancedMesh>

      {/* Upper canopy */}
      <instancedMesh ref={canopy2Ref} args={[undefined, undefined, count]} castShadow>
        <coneGeometry args={[0.3, 0.6, 6]} />
        <meshStandardMaterial color="#22733a" roughness={0.8} metalness={0.05} />
      </instancedMesh>
    </group>
  )
}
