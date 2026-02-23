/**
 * CityScene: 3D Visualization Foundation
 *
 * This component provides the 3D visualization foundation for the Dashboard/Overview page.
 *
 * Features (HighTopo-grade quality):
 * - Professional 6-light setup (directional, ambient, hemisphere, rim, fill, accents)
 * - 4096 shadow map resolution
 * - Environment mapping for reflections
 * - Post-processing (Bloom for emissives, SSAO for depth)
 * - Ground plane with subtle reflections
 * - Camera controls and smooth animations
 *
 * Renders Zones component with status-encoded buildings representing asset groups.
 */

import { useRef, useCallback, useEffect } from 'react'
import { Canvas, ThreeEvent } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Stars, Environment } from '@react-three/drei'
import { EffectComposer, Bloom, SSAO } from '@react-three/postprocessing'
import * as THREE from 'three'
import Zones from './Zones'
import Roads from './Roads'
import AttackPathVisualizer from './AttackPathVisualizer'
import type { CityAsset, AttackPath } from '../../types/assets'

interface CitySceneProps {
  components?: CityAsset[]
  assets?: CityAsset[]  // Accept both for backward compatibility
  selectedId: string | null
  attackedBuildingId?: string | null
  attackPaths?: AttackPath[]
  onSelect: (id: string | null) => void
  onHover: (component: CityAsset | null, event?: ThreeEvent<PointerEvent>) => void
  focusPosition?: [number, number, number] | null
}

function SceneContent({
  components: componentsFromProps,
  assets: assetsFromProps,
  selectedId,
  attackedBuildingId,
  attackPaths = [],
  onSelect,
  onHover,
  focusPosition,
}: CitySceneProps) {
  const controlsRef = useRef<any>(null)

  // Support both 'components' and 'assets' props for backward compatibility
  const components = componentsFromProps || assetsFromProps || []

  // Smooth camera focus on selected building
  useEffect(() => {
    if (focusPosition && controlsRef.current) {
      const controls = controlsRef.current
      const target = new THREE.Vector3(focusPosition[0], focusPosition[1], focusPosition[2])
      const startTarget = controls.target.clone()
      const duration = 600
      const startTime = Date.now()

      const animate = () => {
        const elapsed = Date.now() - startTime
        const t = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - t, 3)
        controls.target.lerpVectors(startTarget, target, eased)
        controls.update()
        if (t < 1) requestAnimationFrame(animate)
      }
      animate()
    }
  }, [focusPosition])

  const handleMissedClick = useCallback(() => {
    onSelect(null)
  }, [onSelect])

  return (
    <>
      <PerspectiveCamera makeDefault position={[18, 14, 18]} fov={45} />
      <OrbitControls
        ref={controlsRef}
        enableZoom
        enablePan
        enableRotate
        maxPolarAngle={Math.PI / 2.2}
        minDistance={5}
        maxDistance={45}
        target={[0, 0, 0]}
        dampingFactor={0.08}
        enableDamping
      />

      {/* Professional HighTopo-grade lighting */}

      {/* Environment map for realistic reflections */}
      <Environment preset="city" background={false} />

      {/* Primary directional light (sunlight) - Enhanced quality */}
      <directionalLight
        position={[20, 30, 15]}
        intensity={2.0}
        color="#fff5e1"
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-far={100}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0001}
      />

      {/* Ambient light (softer) */}
      <ambientLight intensity={0.4} color="#e6f0ff" />

      {/* Hemisphere light (sky/ground bounce) - Enhanced */}
      <hemisphereLight
        color="#87ceeb"
        groundColor="#2d1810"
        intensity={0.6}
      />

      {/* Rim light (edge highlighting) */}
      <directionalLight
        position={[-15, 10, -10]}
        intensity={0.8}
        color="#4a90e2"
        castShadow={false}
      />

      {/* Fill light (shadow softening) */}
      <pointLight
        position={[0, 8, 0]}
        intensity={1.2}
        distance={40}
        decay={2}
        color="#fff8dc"
      />

      {/* Accent lights for atmosphere */}
      <pointLight position={[-12, 6, -12]} intensity={0.4} color="#3b82f6" distance={25} decay={2} />
      <pointLight position={[12, 5, 12]} intensity={0.3} color="#8b5cf6" distance={20} decay={2} />

      {/* Skybox stars */}
      <Stars radius={80} depth={40} count={1500} factor={3} saturation={0.2} fade speed={0.5} />

      {/* Main ground plane with subtle reflections */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onClick={handleMissedClick}
      >
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial
          color="#0d1117"
          roughness={0.8}
          metalness={0.2}
          envMapIntensity={0.5}
        />
      </mesh>

      {/* Subtle grid */}
      <gridHelper
        args={[60, 60, '#1a2642', '#0f1525']}
        position={[0, 0.003, 0]}
      />

      {/* Roads */}
      <Roads />

      {/* City zones and buildings */}
      <Zones
        components={components}
        selectedId={selectedId}
        attackedBuildingId={attackedBuildingId}
        onSelect={onSelect}
        onHover={onHover}
      />

      {/* Attack path visualization (HighTopo-equivalent) */}
      {attackPaths && attackPaths.length > 0 && (
        <AttackPathVisualizer
          paths={attackPaths}
          assets={components}
          zonePositions={{
            'zone-a': [-8, -8],
            'zone-b': [8, -8],
            'zone-c': [-8, 8],
            'zone-d': [8, 8],
            'zone-e': [0, 0],
            'cyber-range': [20, 0],
          }}
        />
      )}

      {/* Fog for depth (less aggressive) */}
      <fog attach="fog" args={['#0a0e1a', 40, 80]} />

      {/* Post-processing effects */}
      <EffectComposer>
        {/* Bloom for emissive materials (lights, screens) */}
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.9}
          luminanceSmoothing={0.9}
          mipmapBlur={true}
        />

        {/* Screen Space Ambient Occlusion (depth) */}
        <SSAO
          samples={16}
          radius={0.2}
          intensity={30}
          worldDistanceThreshold={0.1}
          worldDistanceFalloff={0.1}
          worldProximityThreshold={0.1}
          worldProximityFalloff={0.1}
        />
      </EffectComposer>
    </>
  )
}

export default function CityScene(props: CitySceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '0.75rem',
        background: 'linear-gradient(180deg, #0a0e27 0%, #080c1a 100%)',
      }}
    >
      <SceneContent {...props} />
    </Canvas>
  )
}
