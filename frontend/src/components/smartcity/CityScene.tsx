/**
 * CityScene: Cyberpunk 3D Visualization Foundation
 *
 * Dark futuristic scene with neon-edged buildings, pulsing grid floor,
 * colored district lighting, and bloom post-processing.
 */

import { useRef, useCallback, useEffect } from 'react'
import { Canvas, ThreeEvent } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import CityLayout from './CityLayout'
import CyberpunkRoads from './CyberpunkRoads'
import CyberpunkGround from './CyberpunkGround'
import DataParticles from './DataParticles'
import TrainSystem from './TrainSystem'
import AttackPathVisualizer from './AttackPathVisualizer'
import type { CityAsset, AttackPath } from '../../types/assets'

interface CitySceneProps {
  components?: CityAsset[]
  assets?: CityAsset[]
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
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const components = componentsFromProps || assetsFromProps || []

  // Smooth camera focus
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
      <PerspectiveCamera makeDefault position={[25, 18, 25]} fov={45} />
      <OrbitControls
        ref={controlsRef}
        enableZoom
        enablePan
        enableRotate
        maxPolarAngle={Math.PI / 2.2}
        minDistance={5}
        maxDistance={55}
        target={[2, 0, 2]}
        dampingFactor={0.08}
        enableDamping
      />

      {/* ── Cyberpunk Lighting ── */}

      {/* Ambient — slightly brighter so buildings are visible */}
      <ambientLight intensity={0.25} color="#1a1a3a" />

      {/* Low directional for minimal shadows */}
      <directionalLight
        position={[10, 20, 5]}
        intensity={0.4}
        color="#4466aa"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={80}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0002}
      />

      {/* District accent lights — colored point lights */}
      {/* Central HQ (Network+Security) — cool violet */}
      <pointLight position={[0, 10, 4]} intensity={3.0} distance={25} decay={2} color="#7c4dff" />
      {/* Traffic District — coral red */}
      <pointLight position={[-12, 8, -10]} intensity={2.5} distance={22} decay={2} color="#ff4060" />
      {/* IoT District — cyan */}
      <pointLight position={[12, 8, -10]} intensity={2.5} distance={22} decay={2} color="#00e5ff" />
      {/* Industrial District — orange */}
      <pointLight position={[-4, 8, 14]} intensity={2.0} distance={20} decay={2} color="#ff6d00" />
      {/* Cyber Range — green */}
      <pointLight position={[18, 8, 8]} intensity={2.0} distance={20} decay={2} color="#00e676" />

      {/* Skybox stars */}
      <Stars radius={80} depth={50} count={2000} factor={3} saturation={0.1} fade speed={0.3} />

      {/* ── Ground ── */}
      <CyberpunkGround onClick={handleMissedClick} />

      {/* ── Roads ── */}
      <CyberpunkRoads />

      {/* ── City buildings + districts ── */}
      <CityLayout
        components={components}
        selectedId={selectedId}
        attackedBuildingId={attackedBuildingId}
        onSelect={onSelect}
        onHover={onHover}
      />

      {/* ── Train (neon restyled) ── */}
      <TrainSystem speed={0.012} />

      {/* ── Data Particles ── */}
      <DataParticles />

      {/* ── Attack Paths ── */}
      {attackPaths && attackPaths.length > 0 && (
        <AttackPathVisualizer
          paths={attackPaths}
          assets={components}
          zonePositions={{
            'zone-a': [-12, -10],
            'zone-b': [12, -10],
            'zone-c': [-3, 4],
            'zone-d': [3, 4],
            'zone-e': [-4, 14],
            'cyber-range': [18, 8],
          }}
        />
      )}

      {/* ── Fog (tighter for cyberpunk depth) ── */}
      <fog attach="fog" args={['#0a0e1a', 30, 65]} />

      {/* ── Post-processing ── */}
      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.7}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.3} darkness={0.85} />
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
        toneMappingExposure: 0.9,
      }}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '0.75rem',
        background: 'linear-gradient(180deg, #0a0e1a 0%, #050810 100%)',
      }}
    >
      <SceneContent {...props} />
    </Canvas>
  )
}
