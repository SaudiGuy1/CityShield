import * as THREE from 'three'

interface DistrictProps {
  center: [number, number]
  size: [number, number] // [width, depth]
  accentColor: string
  children?: React.ReactNode
}

export default function District({ center, size, accentColor, children }: DistrictProps) {
  const [cx, cz] = center
  const [w, d] = size
  const hw = w / 2
  const hd = d / 2

  return (
    <group position={[cx, 0, cz]}>
      {/* Ground plate — very subtle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial
          color="#080c18"
          roughness={0.95}
          metalness={0.1}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Edge border lines (thin emissive strips) */}
      {[
        { pos: [0, 0.02, -hd] as const, size: [w, 0.003, 0.03] as const },
        { pos: [0, 0.02, hd] as const, size: [w, 0.003, 0.03] as const },
        { pos: [-hw, 0.02, 0] as const, size: [0.03, 0.003, d] as const },
        { pos: [hw, 0.02, 0] as const, size: [0.03, 0.003, d] as const },
      ].map(({ pos, size: s }, i) => (
        <mesh key={i} position={[pos[0], pos[1], pos[2]]}>
          <boxGeometry args={[s[0], s[1], s[2]]} />
          <meshStandardMaterial
            color={accentColor}
            emissive={accentColor}
            emissiveIntensity={1.5}
            roughness={0.1}
            metalness={0.9}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}

      {/* Corner accent markers — small glowing cubes */}
      {[
        [-hw, -hd],
        [hw, -hd],
        [-hw, hd],
        [hw, hd],
      ].map(([x, z], i) => (
        <mesh key={`corner-${i}`} position={[x, 0.06, z]}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshStandardMaterial
            color={accentColor}
            emissive={accentColor}
            emissiveIntensity={2.0}
            roughness={0.1}
            metalness={0.9}
          />
        </mesh>
      ))}

      {/* Corner glow — subtle ring on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[Math.min(hw, hd) * 0.85, Math.min(hw, hd) * 0.9, 4]} />
        <meshBasicMaterial
          color={accentColor}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* District children (buildings, etc.) — positioned relative to district center */}
      {children}
    </group>
  )
}
