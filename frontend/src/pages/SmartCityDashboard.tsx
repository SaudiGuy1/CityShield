import { useState, useCallback, useRef, useEffect, Suspense, Component, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

import CityLayout from '../components/smartcity/CityLayout'
import CyberpunkRoads from '../components/smartcity/CyberpunkRoads'
import CyberpunkGround from '../components/smartcity/CyberpunkGround'
import DataParticles from '../components/smartcity/DataParticles'
import TrainSystem from '../components/smartcity/TrainSystem'
import HolographicRing from '../components/smartcity/HolographicRing'
import FloatingMarkers from '../components/smartcity/FloatingMarkers'
import NeonPillars from '../components/smartcity/NeonPillars'

import { TrafficPanel, EnergyPanel, PopulationPanel, AirQualityPanel, NetworkPanel } from '../components/smartcity/panels'

import type { CityAsset } from '../types/assets'

/* ─── Error Boundary for 3D Canvas ─── */
class Canvas3DErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: string }
> {
  state = { hasError: false, error: '' }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: 'linear-gradient(180deg, #0a0e1a 0%, #050810 100%)',
          color: 'var(--text-secondary)', flexDirection: 'column', gap: '1rem',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ff4060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.1rem' }}>
            3D visualization could not load
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', maxWidth: '400px', textAlign: 'center' }}>
            {this.state.error || 'WebGL may not be supported or an error occurred.'}
          </div>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => this.setState({ hasError: false, error: '' })}
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

/* ─── Mock city assets for standalone mode ─── */
const MOCK_ASSETS: CityAsset[] = [
  { asset_id: 'traf-001', name: 'Traffic Controller A', asset_type: 'controller', asset_class: 'iot_device', zone: 'zone-a', category: 'traffic', criticality: 'high', status: 'ok', metrics: { events_1h: 42, alerts_open: 0, risk_score: 12, last_seen: new Date().toISOString() } },
  { asset_id: 'traf-002', name: 'Signal Hub B', asset_type: 'hub', asset_class: 'iot_device', zone: 'zone-a', category: 'traffic', criticality: 'medium', status: 'ok', metrics: { events_1h: 28, alerts_open: 1, risk_score: 35, last_seen: new Date().toISOString() } },
  { asset_id: 'traf-003', name: 'Camera Feed C', asset_type: 'camera', asset_class: 'iot_device', zone: 'zone-a', category: 'traffic', criticality: 'low', status: 'warning', metrics: { events_1h: 8, alerts_open: 2, risk_score: 58, last_seen: new Date().toISOString() } },
  { asset_id: 'iot-001', name: 'Sensor Array Alpha', asset_type: 'sensor', asset_class: 'iot_device', zone: 'zone-b', category: 'iot', criticality: 'high', status: 'ok', metrics: { events_1h: 120, alerts_open: 0, risk_score: 8, last_seen: new Date().toISOString() } },
  { asset_id: 'iot-002', name: 'Smart Meter Grid', asset_type: 'meter', asset_class: 'iot_device', zone: 'zone-b', category: 'iot', criticality: 'medium', status: 'ok', metrics: { events_1h: 84, alerts_open: 0, risk_score: 15, last_seen: new Date().toISOString() } },
  { asset_id: 'iot-003', name: 'Environmental Node', asset_type: 'sensor', asset_class: 'iot_device', zone: 'zone-b', category: 'iot', criticality: 'low', status: 'ok', metrics: { events_1h: 52, alerts_open: 0, risk_score: 5, last_seen: new Date().toISOString() } },
  { asset_id: 'net-001', name: 'Core Router', asset_type: 'router', asset_class: 'network_device', zone: 'zone-c', category: 'network', criticality: 'critical', status: 'ok', metrics: { events_1h: 210, alerts_open: 0, risk_score: 10, last_seen: new Date().toISOString() } },
  { asset_id: 'net-002', name: 'Edge Switch N1', asset_type: 'switch', asset_class: 'network_device', zone: 'zone-c', category: 'network', criticality: 'high', status: 'ok', metrics: { events_1h: 95, alerts_open: 1, risk_score: 22, last_seen: new Date().toISOString() } },
  { asset_id: 'sec-001', name: 'Firewall Main', asset_type: 'firewall', asset_class: 'security_device', zone: 'zone-d', category: 'security', criticality: 'critical', status: 'ok', metrics: { events_1h: 340, alerts_open: 0, risk_score: 5, last_seen: new Date().toISOString() } },
  { asset_id: 'sec-002', name: 'IDS Cluster', asset_type: 'ids', asset_class: 'security_device', zone: 'zone-d', category: 'security', criticality: 'high', status: 'ok', metrics: { events_1h: 187, alerts_open: 2, risk_score: 30, last_seen: new Date().toISOString() } },
  { asset_id: 'ind-001', name: 'Power Plant', asset_type: 'scada', asset_class: 'industrial_control', zone: 'zone-e', category: 'industrial', criticality: 'critical', status: 'ok', metrics: { events_1h: 67, alerts_open: 0, risk_score: 18, last_seen: new Date().toISOString() } },
  { asset_id: 'ind-002', name: 'Water Treatment', asset_type: 'plc', asset_class: 'industrial_control', zone: 'zone-e', category: 'industrial', criticality: 'high', status: 'warning', metrics: { events_1h: 34, alerts_open: 3, risk_score: 65, last_seen: new Date().toISOString() } },
  { asset_id: 'trn-001', name: 'Training Server', asset_type: 'server', asset_class: 'network_device', zone: 'cyber-range', category: 'training', criticality: 'low', status: 'ok', metrics: { events_1h: 15, alerts_open: 0, risk_score: 2, last_seen: new Date().toISOString() } },
  { asset_id: 'trn-002', name: 'Sandbox VM', asset_type: 'vm', asset_class: 'network_device', zone: 'cyber-range', category: 'training', criticality: 'low', status: 'ok', metrics: { events_1h: 8, alerts_open: 0, risk_score: 0, last_seen: new Date().toISOString() } },
]

/* ─── 3D Scene Content ─── */
function CitySceneContent({
  assets,
  onDeselect,
  autoRotate,
  controlsRef,
}: {
  assets: CityAsset[]
  onDeselect: () => void
  autoRotate: boolean
  controlsRef: React.RefObject<OrbitControlsImpl>
}) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[22, 16, 22]} fov={50} />
      <OrbitControls
        ref={controlsRef}
        enableZoom
        enablePan
        enableRotate
        maxPolarAngle={Math.PI / 2.2}
        minDistance={8}
        maxDistance={60}
        target={[2, 0, 2]}
        dampingFactor={0.06}
        enableDamping
        autoRotate={autoRotate}
        autoRotateSpeed={0.3}
      />

      {/* Lighting — brighter for visibility */}
      <ambientLight intensity={0.5} color="#2a2a5a" />
      <directionalLight position={[10, 20, 5]} intensity={0.6} color="#6688cc" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-far={80} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30} />
      <pointLight position={[0, 12, 4]} intensity={4.0} distance={40} decay={2} color="#7c4dff" />
      <pointLight position={[-12, 10, -10]} intensity={3.5} distance={35} decay={2} color="#ff4060" />
      <pointLight position={[12, 10, -10]} intensity={3.5} distance={35} decay={2} color="#00e5ff" />
      <pointLight position={[-4, 10, 14]} intensity={3.0} distance={30} decay={2} color="#ff6d00" />
      <pointLight position={[18, 10, 8]} intensity={3.0} distance={30} decay={2} color="#00e676" />
      <hemisphereLight color="#4466aa" groundColor="#1a0a2e" intensity={0.4} />

      <Stars radius={80} depth={50} count={2500} factor={3} saturation={0.1} fade speed={0.3} />

      {/* Scene elements */}
      <CyberpunkGround onClick={onDeselect} />
      <CyberpunkRoads />
      <CityLayout
        components={assets}
        selectedId={null}
        onSelect={() => {}}
        onHover={() => {}}
      />
      <TrainSystem speed={0.012} />
      <DataParticles />

      {/* NEW: Enhanced 3D elements */}
      <HolographicRing position={[2, 10, 2]} radius={20} color="#00f0ff" speed={0.12} opacity={0.18} />
      <HolographicRing position={[2, 12, 2]} radius={15} color="#bf00ff" speed={-0.08} opacity={0.1} />
      <FloatingMarkers />
      <NeonPillars />

      {/* Fog + post-processing */}
      <fog attach="fog" args={['#0a0e1a', 50, 90]} />
      <EffectComposer>
        <Bloom intensity={1.5} luminanceThreshold={0.12} luminanceSmoothing={0.6} mipmapBlur />
        <Vignette eskil={false} offset={0.3} darkness={0.6} />
      </EffectComposer>
    </>
  )
}

/* ─── Clock widget ─── */
function HUDClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.08em' }}>
        {time.toLocaleTimeString('en-US', { hour12: false })}
      </span>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
      </span>
    </div>
  )
}

/* ─── Main Dashboard ─── */
export default function SmartCityDashboard() {
  const [autoRotate, setAutoRotate] = useState(true)
  const [showPanels, setShowPanels] = useState(true)
  const controlsRef = useRef<OrbitControlsImpl>(null!)

  const handleDeselect = useCallback(() => {}, [])

  const handleResetCamera = useCallback(() => {
    if (controlsRef.current) {
      const controls = controlsRef.current
      const startPos = controls.object.position.clone()
      const endPos = new THREE.Vector3(22, 16, 22)
      const startTarget = controls.target.clone()
      const endTarget = new THREE.Vector3(2, 0, 2)
      const duration = 800
      const startTime = Date.now()

      const animate = () => {
        const t = Math.min((Date.now() - startTime) / duration, 1)
        const e = 1 - Math.pow(1 - t, 3)
        controls.object.position.lerpVectors(startPos, endPos, e)
        controls.target.lerpVectors(startTarget, endTarget, e)
        controls.update()
        if (t < 1) requestAnimationFrame(animate)
      }
      animate()
    }
  }, [])

  return (
    <div className="hud-viewport with-sidebar">
      {/* 3D Canvas */}
      <div className="hud-canvas">
        <Canvas3DErrorBoundary>
          <Canvas
            shadows
            dpr={[1, 1.5]}
            gl={{
              antialias: true,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.1,
              powerPreference: 'high-performance',
            }}
            style={{ width: '100%', height: '100%', background: 'linear-gradient(180deg, #0a0e1a 0%, #050810 100%)' }}
            onCreated={({ gl }) => {
              gl.setClearColor('#0a0e1a')
            }}
          >
            <Suspense fallback={null}>
              <CitySceneContent
                assets={MOCK_ASSETS}
                onDeselect={handleDeselect}
                autoRotate={autoRotate}
                controlsRef={controlsRef}
              />
            </Suspense>
          </Canvas>
        </Canvas3DErrorBoundary>
      </div>

      {/* HUD Overlay */}
      {showPanels && (
        <div className="hud-overlay">
          {/* ── Top Bar ── */}
          <motion.div
            className="hud-top"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <span className="hud-top-title">Smart City Command</span>
              <div className="hud-top-stat">
                <span className="stat-dot" style={{ background: 'var(--accent-success)' }} />
                14 Assets Online
              </div>
              <div className="hud-top-stat">
                <span className="stat-dot" style={{ background: 'var(--accent-warning)' }} />
                2 Warnings
              </div>
              <div className="hud-top-stat">
                <span className="stat-dot" style={{ background: 'var(--accent-danger)' }} />
                0 Critical
              </div>
            </div>
            <HUDClock />
          </motion.div>

          {/* ── Left Panels ── */}
          <div className="hud-left">
            <TrafficPanel delay={0.1} />
            <EnergyPanel delay={0.2} />
            <PopulationPanel delay={0.3} />
          </div>

          {/* ── Center is transparent (3D shows through) ── */}
          <div style={{ pointerEvents: 'none' }} />

          {/* ── Right Panels ── */}
          <div className="hud-right">
            <AirQualityPanel delay={0.15} />
            <NetworkPanel delay={0.25} />
          </div>

          {/* ── Bottom Controls ── */}
          <motion.div
            className="hud-bottom"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <button
              className={`hud-cam-btn ${autoRotate ? 'active' : ''}`}
              onClick={() => setAutoRotate(!autoRotate)}
              title="Toggle auto-rotate"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6" />
                <path d="M2.5 22v-6h6" />
                <path d="M2 11.5a10 10 0 0 1 18.8-4.3" />
                <path d="M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
            </button>

            <button
              className="hud-cam-btn"
              onClick={handleResetCamera}
              title="Reset camera"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4" />
                <path d="M12 18v4" />
                <path d="m4.93 4.93 2.83 2.83" />
                <path d="m16.24 16.24 2.83 2.83" />
                <path d="M2 12h4" />
                <path d="M18 12h4" />
                <path d="m4.93 19.07 2.83-2.83" />
                <path d="m16.24 7.76 2.83-2.83" />
              </svg>
            </button>

            <button
              className="hud-cam-btn"
              onClick={() => setShowPanels(!showPanels)}
              title="Toggle panels"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </button>

            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              CityShield HUD v2.0
            </div>
          </motion.div>
        </div>
      )}

      {/* Minimal toggle when panels hidden */}
      {!showPanels && (
        <motion.button
          className="hud-cam-btn"
          style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}
          onClick={() => setShowPanels(true)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          title="Show panels"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </motion.button>
      )}
    </div>
  )
}
