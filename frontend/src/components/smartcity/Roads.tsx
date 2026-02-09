export default function Roads() {
  return (
    <group>
      {/* Main horizontal road (east-west) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <planeGeometry args={[28, 1.2]} />
        <meshStandardMaterial color="#161d2f" roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Main vertical road (north-south) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <planeGeometry args={[1.2, 28]} />
        <meshStandardMaterial color="#161d2f" roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Ring road segments — top (z=-12) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -12]} receiveShadow>
        <planeGeometry args={[24, 0.9]} />
        <meshStandardMaterial color="#141b2b" roughness={0.85} metalness={0.1} />
      </mesh>
      {/* Ring road — bottom (z=12) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 12]} receiveShadow>
        <planeGeometry args={[24, 0.9]} />
        <meshStandardMaterial color="#141b2b" roughness={0.85} metalness={0.1} />
      </mesh>
      {/* Ring road — left (x=-12) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-12, 0.005, 0]} receiveShadow>
        <planeGeometry args={[0.9, 24]} />
        <meshStandardMaterial color="#141b2b" roughness={0.85} metalness={0.1} />
      </mesh>
      {/* Ring road — right (x=12) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[12, 0.005, 0]} receiveShadow>
        <planeGeometry args={[0.9, 24]} />
        <meshStandardMaterial color="#141b2b" roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Diagonal connectors from corners to center */}
      <DiagonalRoad from={[-8, -8]} to={[-1.5, -1.5]} />
      <DiagonalRoad from={[8, -8]} to={[1.5, -1.5]} />
      <DiagonalRoad from={[-8, 8]} to={[-1.5, 1.5]} />
      <DiagonalRoad from={[8, 8]} to={[1.5, 1.5]} />

      {/* Center lines — main horizontal */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
        <planeGeometry args={[28, 0.04]} />
        <meshBasicMaterial color="#2d3e5f" transparent opacity={0.5} />
      </mesh>

      {/* Center lines — main vertical */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
        <planeGeometry args={[0.04, 28]} />
        <meshBasicMaterial color="#2d3e5f" transparent opacity={0.5} />
      </mesh>

      {/* Road dashes — horizontal */}
      {Array.from({ length: 21 }, (_, i) => (
        <mesh key={`hd-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-10 + i, 0.009, 0.3]}>
          <planeGeometry args={[0.4, 0.03]} />
          <meshBasicMaterial color="#3b4f70" transparent opacity={0.4} />
        </mesh>
      ))}

      {/* Road dashes — vertical */}
      {Array.from({ length: 21 }, (_, i) => (
        <mesh key={`vd-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0.3, 0.009, -10 + i]}>
          <planeGeometry args={[0.03, 0.4]} />
          <meshBasicMaterial color="#3b4f70" transparent opacity={0.4} />
        </mesh>
      ))}

      {/* Sidewalk curbs — main roads */}
      {[0.65, -0.65].map((offset, i) => (
        <mesh key={`hcurb-${i}`} position={[0, 0.03, offset]}>
          <boxGeometry args={[28, 0.06, 0.06]} />
          <meshStandardMaterial color="#1e2d4d" roughness={0.8} metalness={0.2} />
        </mesh>
      ))}
      {[0.65, -0.65].map((offset, i) => (
        <mesh key={`vcurb-${i}`} position={[offset, 0.03, 0]}>
          <boxGeometry args={[0.06, 0.06, 28]} />
          <meshStandardMaterial color="#1e2d4d" roughness={0.8} metalness={0.2} />
        </mesh>
      ))}
    </group>
  )
}

function DiagonalRoad({ from, to }: { from: [number, number]; to: [number, number] }) {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const length = Math.sqrt(dx * dx + dz * dz)
  const angle = Math.atan2(dx, dz)
  const cx = (from[0] + to[0]) / 2
  const cz = (from[1] + to[1]) / 2

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, angle]}
      position={[cx, 0.005, cz]}
      receiveShadow
    >
      <planeGeometry args={[0.7, length]} />
      <meshStandardMaterial color="#131a28" roughness={0.85} metalness={0.1} />
    </mesh>
  )
}
