import { useRef, useCallback, useEffect } from 'react'
import { Canvas, ThreeEvent } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei'
import * as THREE from 'three'
import Zones from './Zones'
import Roads from './Roads'
import Trees from './Trees'
import TrainSystem from './TrainSystem'
import Windmill from './Windmill'
import type { CityComponent } from './useCityData'

interface CitySceneProps {
  components: CityComponent[]
  selectedId: string | null
  attackedBuildingId?: string | null
  onSelect: (id: string | null) => void
  onHover: (component: CityComponent | null, event?: ThreeEvent<PointerEvent>) => void
  focusPosition?: [number, number, number] | null
  windmillRpm?: number
  windmillTemperature?: number
  windmillHacked?: boolean
  onWindmillInteract?: () => void
  trainHacked?: boolean
}

function SceneContent({
  components,
  selectedId,
  attackedBuildingId,
  onSelect,
  onHover,
  focusPosition,
  windmillRpm = 12,
  windmillTemperature = 45,
  windmillHacked = false,
  onWindmillInteract,
  trainHacked = false,
}: CitySceneProps) {
  const controlsRef = useRef<any>(null)

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

      {/* Lighting */}
      <ambientLight intensity={0.25} color="#b0c4de" />
      <directionalLight
        position={[15, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={70}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.0005}
        color="#e8f0ff"
      />
      <pointLight position={[-10, 8, -10]} intensity={0.3} color="#3b82f6" />
      <pointLight position={[10, 6, 10]} intensity={0.2} color="#8b5cf6" />

      {/* Hemisphere light for realistic ambient */}
      <hemisphereLight
        color="#1a2642"
        groundColor="#0a0e27"
        intensity={0.4}
      />

      {/* Skybox stars */}
      <Stars radius={80} depth={40} count={1500} factor={3} saturation={0.2} fade speed={0.5} />

      {/* Main ground plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onClick={handleMissedClick}
      >
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#080c1a" roughness={0.95} metalness={0.05} />
      </mesh>

      {/* Subtle grid */}
      <gridHelper
        args={[60, 60, '#1a2642', '#0f1525']}
        position={[0, 0.003, 0]}
      />

      {/* Roads */}
      <Roads />

      {/* Trees */}
      <Trees />

      {/* Train system */}
      <TrainSystem speed={trainHacked ? 0.035 : 0.015} isHacked={trainHacked} />

      {/* Windmill in zone-e area */}
      <Windmill
        position={[3.5, 0, 3]}
        rpm={windmillRpm}
        temperature={windmillTemperature}
        isHacked={windmillHacked}
        onInteract={onWindmillInteract}
      />

      {/* City zones and buildings */}
      <Zones
        components={components}
        selectedId={selectedId}
        attackedBuildingId={attackedBuildingId}
        onSelect={onSelect}
        onHover={onHover}
      />

      {/* Fog for depth */}
      <fog attach="fog" args={['#080c1a', 30, 65]} />
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
