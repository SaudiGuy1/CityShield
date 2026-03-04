import { useRef, useMemo, useState, useEffect, useCallback, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import * as THREE from 'three'
import type { ActiveAttack } from '../App'

/* ═══════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════ */

type CityState = 'normal' | 'alert' | 'critical' | 'cyberattack'

interface DeviceInfo {
  id: string; name: string; district: string; type: string
  status: 'online' | 'warning' | 'critical'
  ip: string; uptime: string; cpu: number; memory: number
  temp: number; bandwidth: number; alerts: number
  firmware: string; lastScan: string; color: string
}

interface Bld {
  x: number; z: number; w: number; d: number; h: number
  color: string; glow: string; name?: string; dist?: string; deviceId?: string
}

interface WindmillData {
  id: string; x: number; z: number; name: string
  running: boolean; speed: number; stress: number
  status: 'normal' | 'warning' | 'critical' | 'hacked'
}

interface TrafficLightData {
  id: string; x: number; z: number; name: string
  active: 'red' | 'yellow' | 'green'
  mode: 'manual' | 'auto' | 'emergency' | 'hacked'
}

type SelectedObject =
  | { type: 'building'; building: Bld }
  | { type: 'windmill'; id: string }
  | { type: 'trafficlight'; id: string }

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */

const DEVICES: Record<string, DeviceInfo> = {
  hq: { id: 'hq', name: 'CityShield HQ', district: 'Command Center', type: 'Central Server', status: 'online', ip: '10.0.0.1', uptime: '99.97%', cpu: 34, memory: 62, temp: 42, bandwidth: 847, alerts: 0, firmware: 'v4.2.1', lastScan: '2 min ago', color: '#00f0ff' },
  traffic: { id: 'traffic', name: 'Traffic Control HQ', district: 'Traffic Mgmt', type: 'Traffic Controller', status: 'online', ip: '10.1.1.10', uptime: '99.85%', cpu: 58, memory: 71, temp: 48, bandwidth: 423, alerts: 2, firmware: 'v3.1.4', lastScan: '5 min ago', color: '#ff003c' },
  sensor: { id: 'sensor', name: 'Sensor Tower', district: 'IoT Sensors', type: 'IoT Gateway', status: 'online', ip: '10.2.0.1', uptime: '99.92%', cpu: 22, memory: 45, temp: 37, bandwidth: 156, alerts: 0, firmware: 'v2.8.0', lastScan: '1 min ago', color: '#00f0ff' },
  router: { id: 'router', name: 'Core Router', district: 'Network Infra', type: 'L3 Router', status: 'warning', ip: '10.0.0.254', uptime: '98.12%', cpu: 78, memory: 83, temp: 64, bandwidth: 1247, alerts: 3, firmware: 'v5.0.2', lastScan: '8 min ago', color: '#bf00ff' },
  firewall: { id: 'firewall', name: 'Firewall Tower', district: 'Security Ops', type: 'Next-Gen Firewall', status: 'online', ip: '10.0.0.2', uptime: '99.99%', cpu: 45, memory: 56, temp: 44, bandwidth: 2340, alerts: 1, firmware: 'v6.1.0', lastScan: '30 sec ago', color: '#00ff88' },
  power: { id: 'power', name: 'Power Plant', district: 'Industrial', type: 'SCADA Controller', status: 'critical', ip: '10.5.0.100', uptime: '97.45%', cpu: 89, memory: 91, temp: 72, bandwidth: 34, alerts: 5, firmware: 'v1.9.8', lastScan: '15 min ago', color: '#ffaa00' },
  range: { id: 'range', name: 'Range Server', district: 'Cyber Range', type: 'Sandbox Host', status: 'online', ip: '10.6.0.1', uptime: '99.50%', cpu: 67, memory: 78, temp: 55, bandwidth: 534, alerts: 0, firmware: 'v3.4.2', lastScan: '3 min ago', color: '#00ff88' },
  metasploitable: { id: 'metasploitable', name: 'Metasploitable', district: 'Cyber Range', type: 'Vulnerable Target VM', status: 'warning', ip: '172.20.0.2', uptime: '99.2%', cpu: 42, memory: 55, temp: 38, bandwidth: 89, alerts: 0, firmware: 'metasploitable2', lastScan: '10 min ago', color: '#ff6b35' },
}

const TARGET_TO_DEVICE: Record<string, string> = {
  traffic_management: 'traffic', traffic_sim: 'traffic',
  iot_sensors: 'sensor', iot_sim: 'sensor',
  network_infrastructure: 'router', network_emulator: 'router',
  security: 'firewall', security_operations: 'firewall',
  industrial_systems: 'power', industrial_controls: 'power',
  cyber_range: 'range',
}

const ATTACK_COLOR = new THREE.Color('#ff003c')
const STATE_AMBIENT: Record<CityState, THREE.Color> = {
  normal: new THREE.Color('#2a3a5a'),
  alert: new THREE.Color('#3a3520'),
  critical: new THREE.Color('#3a1520'),
  cyberattack: new THREE.Color('#2a1530'),
}

/* ═══════════════════════════════════════════════════
   PROCEDURAL WINDOW TEXTURE
   ═══════════════════════════════════════════════════ */

function makeWindowTex(cols: number, rows: number, litColor: string, litChance = 0.55) {
  const cvs = document.createElement('canvas')
  cvs.width = cols * 8; cvs.height = rows * 8
  const ctx = cvs.getContext('2d')!
  ctx.fillStyle = '#060a12'
  ctx.fillRect(0, 0, cvs.width, cvs.height)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.random() < litChance) {
        ctx.globalAlpha = 0.4 + Math.random() * 0.6
        ctx.fillStyle = litColor
        ctx.fillRect(c * 8 + 1, r * 8 + 1, 6, 5)
      }
    }
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(cvs)
  tex.magFilter = THREE.NearestFilter
  return tex
}

/* ═══════════════════════════════════════════════════
   BUILDING
   ═══════════════════════════════════════════════════ */

function Building({ b, isSelected, onSelect, cityState, attackedDeviceId }: {
  b: Bld; isSelected: boolean; onSelect: (b: Bld) => void; cityState: CityState; attackedDeviceId: string | null
}) {
  const ref = useRef<THREE.Mesh>(null!)
  const edgeRef = useRef<THREE.LineSegments>(null!)
  const ringRef = useRef<THREE.Mesh>(null!)
  const lightRef = useRef<THREE.PointLight>(null!)
  const [hov, setHov] = useState(false)
  const isClickable = !!b.deviceId
  const originalColor = useMemo(() => new THREE.Color(b.glow), [b.glow])

  // Determine once whether this building is in the attacked district
  const isAttackedBuilding = useMemo(() => {
    if (cityState !== 'cyberattack' || !attackedDeviceId) return false
    if (b.deviceId === attackedDeviceId) return true
    const mainBuilding = BUILDINGS.find(m => m.deviceId === attackedDeviceId)
    return !!(mainBuilding && !b.deviceId && b.glow === mainBuilding.glow &&
      Math.abs(b.x - mainBuilding.x) < 10 && Math.abs(b.z - mainBuilding.z) < 10)
  }, [cityState, attackedDeviceId, b])

  const tex = useMemo(() => makeWindowTex(
    Math.max(4, Math.floor(b.w * 3)),
    Math.max(6, Math.floor(b.h * 2)),
    b.glow
  ), [b.w, b.h, b.glow])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const mat = ref.current.material as THREE.MeshStandardMaterial
    const t = clock.getElapsedTime()

    if (cityState === 'cyberattack') {
      if (isAttackedBuilding) {
        // Dramatic red flash: fast pulsing emissive
        const pulse = Math.sin(t * 8) * 0.5 + 0.5
        mat.emissive.copy(ATTACK_COLOR)
        mat.emissiveIntensity = 1.5 + pulse * 3.5

        // Scale pulsing — throb effect
        const scalePulse = 1.0 + Math.sin(t * 6) * 0.04
        ref.current.scale.set(scalePulse, scalePulse, scalePulse)

        // Animate red point light above building
        if (lightRef.current) {
          lightRef.current.intensity = 8 + pulse * 12
        }

        // Animate ground ring
        if (ringRef.current) {
          const ringMat = ringRef.current.material as THREE.MeshBasicMaterial
          ringMat.opacity = 0.3 + pulse * 0.7
          ringRef.current.rotation.z = t * 1.5
          const ringScale = 1.0 + Math.sin(t * 3) * 0.15
          ringRef.current.scale.set(ringScale, ringScale, 1)
        }
      } else {
        mat.emissive.copy(originalColor)
        const targetI = isSelected ? 2.0 : hov ? 1.5 : 0.3
        mat.emissiveIntensity += (targetI - mat.emissiveIntensity) * 0.1
        ref.current.scale.setScalar(1)
      }
    } else if (cityState === 'critical') {
      const pulse = Math.sin(t * 2) * 0.2 + 0.8
      mat.emissive.copy(originalColor).lerp(ATTACK_COLOR, 0.3)
      mat.emissiveIntensity = 0.5 * pulse
      ref.current.scale.setScalar(1)
    } else if (cityState === 'alert') {
      mat.emissive.copy(originalColor)
      mat.emissiveIntensity = isSelected ? 2.0 : hov ? 1.5 : 0.5
      ref.current.scale.setScalar(1)
    } else {
      mat.emissive.copy(originalColor)
      const targetI = isSelected ? 2.0 : hov ? 1.5 : 0.4
      mat.emissiveIntensity += (targetI - mat.emissiveIntensity) * 0.1
      ref.current.scale.setScalar(1)
    }

    if (edgeRef.current) {
      const eMat = edgeRef.current.material as THREE.LineBasicMaterial
      eMat.opacity = isAttackedBuilding ? 1.0 : isSelected ? 1.0 : hov ? 0.8 : 0.15
      if (isAttackedBuilding) eMat.color.set('#ff0000')
      else eMat.color.set(b.glow)
    }
    if (isSelected && !isAttackedBuilding) {
      const pulse = Math.sin(t * 3) * 0.15 + 0.85
      ref.current.scale.setScalar(pulse * 0.02 + 0.99)
    }
  })

  return (
    <group position={[b.x, 0, b.z]}>
      <mesh ref={ref} position={[0, b.h / 2, 0]} castShadow receiveShadow
        onPointerOver={(e) => { if (!isClickable) return; e.stopPropagation(); setHov(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHov(false); document.body.style.cursor = 'default' }}
        onClick={(e) => { if (!isClickable) return; e.stopPropagation(); onSelect(b) }}>
        <boxGeometry args={[b.w, b.h, b.d]} />
        <meshStandardMaterial color={isSelected ? '#1a3560' : hov ? '#1e3050' : b.color}
          emissive={b.glow} emissiveIntensity={0.4} emissiveMap={tex} map={tex}
          metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, b.h + 0.04, 0]}>
        <boxGeometry args={[b.w + 0.08, isSelected ? 0.15 : 0.06, b.d + 0.08]} />
        <meshBasicMaterial color={isAttackedBuilding ? '#ff0000' : b.glow} toneMapped={false} />
      </mesh>
      <lineSegments ref={edgeRef} position={[0, b.h / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(b.w, b.h, b.d)]} />
        <lineBasicMaterial color={b.glow} transparent opacity={0.15} />
      </lineSegments>

      {/* Attack effects: red point light + pulsing ground ring */}
      {isAttackedBuilding && (
        <>
          <pointLight ref={lightRef} position={[0, b.h + 3, 0]} color="#ff0000" intensity={12} distance={20} decay={2} />
          <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
            <ringGeometry args={[Math.max(b.w, b.d) * 0.7, Math.max(b.w, b.d) * 1.2, 32]} />
            <meshBasicMaterial color="#ff0000" transparent opacity={0.7} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}

      {isSelected && !isAttackedBuilding && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[Math.max(b.w, b.d) * 0.8, Math.max(b.w, b.d) * 0.95, 32]} />
          <meshBasicMaterial color={b.glow} transparent opacity={0.6} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      {isClickable && !isSelected && !isAttackedBuilding && (
        <mesh position={[0, b.h + 1.2, 0]}>
          <octahedronGeometry args={[0.2, 0]} />
          <meshBasicMaterial color={b.glow} toneMapped={false} transparent opacity={hov ? 1 : 0.5} />
        </mesh>
      )}
    </group>
  )
}

/* ═══════════════════════════════════════════════════
   ALL BUILDINGS
   ═══════════════════════════════════════════════════ */

const BUILDINGS: Bld[] = [
  { x: 0, z: -2, w: 4, d: 4, h: 22, color: '#0a0c1e', glow: '#00f0ff', name: 'CityShield HQ', dist: 'Command', deviceId: 'hq' },
  { x: 4, z: -4, w: 2, d: 2, h: 10, color: '#080a1a', glow: '#bf00ff' },
  { x: -4, z: -4, w: 2, d: 2, h: 8, color: '#080a1a', glow: '#00f0ff' },
  { x: -14, z: -14, w: 3, d: 3, h: 9, color: '#0c0816', glow: '#ff003c', name: 'Traffic HQ', dist: 'Traffic Mgmt', deviceId: 'traffic' },
  { x: -10, z: -14, w: 2, d: 2, h: 5, color: '#0a0614', glow: '#ff003c' },
  { x: -14, z: -10, w: 2.5, d: 2, h: 7, color: '#0c0816', glow: '#ff003c' },
  { x: -11, z: -10, w: 1.5, d: 1.5, h: 3.5, color: '#0a0614', glow: '#ff003c' },
  { x: -17, z: -13, w: 2, d: 2.5, h: 5, color: '#0c0816', glow: '#ff003c' },
  { x: -17, z: -9, w: 1.5, d: 1.5, h: 2.5, color: '#0a0614', glow: '#ff003c' },
  { x: -8, z: -12, w: 1.8, d: 1.8, h: 4, color: '#0c0816', glow: '#ff003c' },
  { x: 14, z: -14, w: 2.5, d: 2.5, h: 12, color: '#061018', glow: '#00f0ff', name: 'Sensor Tower', dist: 'IoT Sensors', deviceId: 'sensor' },
  { x: 10, z: -13, w: 3, d: 3, h: 7, color: '#081218', glow: '#00f0ff' },
  { x: 17, z: -12, w: 2, d: 2, h: 5, color: '#061018', glow: '#00f0ff' },
  { x: 12, z: -17, w: 2, d: 2, h: 8, color: '#081218', glow: '#00f0ff' },
  { x: 16, z: -16, w: 1.5, d: 1.5, h: 3, color: '#061018', glow: '#00f0ff' },
  { x: 9, z: -10, w: 2, d: 1.8, h: 5, color: '#081218', glow: '#00f0ff' },
  { x: 17, z: -9, w: 1.8, d: 2, h: 3, color: '#061018', glow: '#00f0ff' },
  { x: -6, z: 3, w: 3.5, d: 3.5, h: 14, color: '#0a0618', glow: '#bf00ff', name: 'Core Router', dist: 'Network Infra', deviceId: 'router' },
  { x: -3, z: 6, w: 2.5, d: 2.5, h: 8, color: '#080616', glow: '#bf00ff' },
  { x: -9, z: 5, w: 1.8, d: 1.8, h: 6, color: '#0a0618', glow: '#bf00ff' },
  { x: -10, z: 3, w: 1.5, d: 1.5, h: 3, color: '#080616', glow: '#bf00ff' },
  { x: -4, z: -1, w: 2, d: 2, h: 4, color: '#0a0618', glow: '#bf00ff' },
  { x: 6, z: 4, w: 3, d: 3, h: 16, color: '#061208', glow: '#00ff88', name: 'Firewall Tower', dist: 'Security Ops', deviceId: 'firewall' },
  { x: 9, z: 6, w: 2.5, d: 2.5, h: 9, color: '#081408', glow: '#00ff88' },
  { x: 4, z: 7, w: 2, d: 2, h: 5, color: '#061208', glow: '#00ff88' },
  { x: 11, z: 3, w: 1.5, d: 1.5, h: 4, color: '#081408', glow: '#00ff88' },
  { x: 7, z: -1, w: 2, d: 2, h: 7, color: '#061208', glow: '#00ff88' },
  { x: 3, z: 2, w: 1.5, d: 1.5, h: 3, color: '#081408', glow: '#00ff88' },
  { x: -9, z: 14, w: 3.5, d: 3.5, h: 7, color: '#121006', glow: '#ffaa00', name: 'Power Plant', dist: 'Industrial', deviceId: 'power' },
  { x: -5, z: 16, w: 2.5, d: 2.5, h: 4.5, color: '#100e06', glow: '#ffaa00' },
  { x: -13, z: 16, w: 2, d: 2, h: 4, color: '#121006', glow: '#ffaa00' },
  { x: -12, z: 12, w: 2, d: 3, h: 2.5, color: '#100e06', glow: '#ffaa00' },
  { x: -6, z: 12, w: 1.5, d: 1.5, h: 3, color: '#121006', glow: '#ffaa00' },
  { x: -16, z: 14, w: 1.8, d: 1.8, h: 3.5, color: '#100e06', glow: '#ffaa00' },
  { x: 14, z: 14, w: 3, d: 3, h: 8, color: '#061410', glow: '#00ff88', name: 'Range Server', dist: 'Cyber Range', deviceId: 'range' },
  { x: 18, z: 16, w: 2, d: 2, h: 4.5, color: '#081610', glow: '#00ff88' },
  { x: 16, z: 11, w: 2.5, d: 2.5, h: 6, color: '#061410', glow: '#00ff88' },
  { x: 11, z: 16, w: 1.5, d: 1.5, h: 3.5, color: '#081610', glow: '#00ff88' },
  { x: 12, z: 11, w: 1.8, d: 1.8, h: 3, color: '#061410', glow: '#00ff88' },
  { x: 18, z: 12, w: 1.5, d: 1.5, h: 2.5, color: '#081610', glow: '#00ff88' },
  { x: 15, z: 17, w: 2.5, d: 2.5, h: 5, color: '#120a06', glow: '#ff6b35', name: 'Metasploitable', dist: 'Cyber Range', deviceId: 'metasploitable' },
]

/* ═══════════════════════════════════════════════════
   GROUND + ROADS
   ═══════════════════════════════════════════════════ */

function Ground() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512; c.height = 512
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#040810'
    ctx.fillRect(0, 0, 512, 512)
    ctx.strokeStyle = 'rgba(0,200,255,0.12)'
    ctx.lineWidth = 1.5
    for (let i = 0; i <= 16; i++) {
      const p = (i / 16) * 512
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 512); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(512, p); ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(0,200,255,0.04)'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 64; i++) {
      const p = (i / 64) * 512
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 512); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(512, p); ctx.stroke()
    }
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(4, 4)
    return t
  }, [])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[80, 80]} />
      <meshStandardMaterial map={tex} color="#0a1020" metalness={0.8} roughness={0.2} />
    </mesh>
  )
}

interface Road { sx: number; sz: number; ex: number; ez: number; color: string; w: number }

const ROADS: Road[] = [
  { sx: -30, sz: 0, ex: 30, ez: 0, color: '#00f0ff', w: 1.2 },
  { sx: 0, sz: -30, ex: 0, ez: 30, color: '#00f0ff', w: 1.2 },
  { sx: -30, sz: -8, ex: 30, ez: -8, color: '#bf00ff', w: 0.8 },
  { sx: -30, sz: 9, ex: 30, ez: 9, color: '#bf00ff', w: 0.8 },
  { sx: -12, sz: -30, ex: -12, ez: 30, color: '#00ff88', w: 0.8 },
  { sx: 13, sz: -30, ex: 13, ez: 30, color: '#00ff88', w: 0.8 },
]

function RoadMesh({ r }: { r: Road }) {
  const dx = r.ex - r.sx, dz = r.ez - r.sz
  const len = Math.sqrt(dx * dx + dz * dz)
  const cx = (r.sx + r.ex) / 2, cz = (r.sz + r.ez) / 2
  const angle = Math.atan2(dx, dz)
  return (
    <group>
      <mesh position={[cx, 0.01, cz]} rotation={[-Math.PI / 2, 0, angle]}>
        <planeGeometry args={[r.w, len]} />
        <meshStandardMaterial color="#060c18" emissive={r.color} emissiveIntensity={0.08} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[cx, 0.02, cz]} rotation={[-Math.PI / 2, 0, angle]}>
        <planeGeometry args={[0.06, len]} />
        <meshBasicMaterial color={r.color} transparent opacity={0.7} toneMapped={false} />
      </mesh>
      {[-1, 1].map(s => (
        <mesh key={s} position={[
          cx + Math.cos(angle + Math.PI / 2) * (r.w / 2) * s, 0.02,
          cz + Math.sin(angle + Math.PI / 2) * (r.w / 2) * s
        ]} rotation={[-Math.PI / 2, 0, angle]}>
          <planeGeometry args={[0.04, len]} />
          <meshBasicMaterial color={r.color} transparent opacity={0.4} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/* ═══════════════════════════════════════════════════
   TRAFFIC DOTS
   ═══════════════════════════════════════════════════ */

function TrafficDots({ cityState }: { cityState: CityState }) {
  const count = 60
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const dots = useMemo(() => Array.from({ length: count }, () => {
    const road = ROADS[Math.floor(Math.random() * ROADS.length)]
    return { road, speed: 0.02 + Math.random() * 0.05, offset: Math.random() }
  }), [])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    dots.forEach((d, i) => {
      const frac = ((t * d.speed + d.offset) % 1 + 1) % 1
      dummy.position.set(
        d.road.sx + (d.road.ex - d.road.sx) * frac, 0.15,
        d.road.sz + (d.road.ez - d.road.sz) * frac
      )
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    if (cityState === 'cyberattack') {
      mat.color.set(Math.sin(t * 8) > 0 ? '#ff003c' : '#bf00ff')
    } else if (cityState === 'critical') {
      mat.color.set('#ff003c')
    } else if (cityState === 'alert') {
      mat.color.set('#ffaa00')
    } else {
      mat.color.set('#00f0ff')
    }
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.12, 6, 6]} />
      <meshBasicMaterial color="#00f0ff" toneMapped={false} />
    </instancedMesh>
  )
}

/* ═══════════════════════════════════════════════════
   DATA ARCS
   ═══════════════════════════════════════════════════ */

function DataArc({ from, to, color }: { from: number[]; to: number[]; color: string }) {
  const particleRef = useRef<THREE.Mesh>(null!)
  const speed = useMemo(() => 0.12 + Math.random() * 0.15, [])
  const startOff = useMemo(() => Math.random(), [])
  const curve = useMemo(() => new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(from[0], from[1], from[2]),
    new THREE.Vector3((from[0] + to[0]) / 2, Math.max(from[1], to[1]) + 6, (from[2] + to[2]) / 2),
    new THREE.Vector3(to[0], to[1], to[2])
  ), [from, to])
  const tubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 32, 0.03, 4, false), [curve])

  useFrame(({ clock }) => {
    if (!particleRef.current) return
    const t = ((clock.getElapsedTime() * speed + startOff) % 1)
    particleRef.current.position.copy(curve.getPoint(t))
  })

  return (
    <group>
      <mesh geometry={tubeGeo}>
        <meshBasicMaterial color={color} transparent opacity={0.2} toneMapped={false} />
      </mesh>
      <mesh ref={particleRef}>
        <sphereGeometry args={[0.18, 6, 6]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  )
}

function DataFlows() {
  const hq: number[] = [0, 22, -2]
  const targets = [
    { to: [-14, 9, -14], color: '#ff003c' },
    { to: [14, 12, -14], color: '#00f0ff' },
    { to: [-6, 14, 3], color: '#bf00ff' },
    { to: [6, 16, 4], color: '#00ff88' },
    { to: [-9, 7, 14], color: '#ffaa00' },
    { to: [14, 8, 14], color: '#00ff88' },
    { to: [15, 5, 17], color: '#ff6b35' },
  ]
  return (
    <group>
      {targets.map((t, i) => (
        <group key={i}>
          <DataArc from={hq} to={t.to} color={t.color} />
          <DataArc from={t.to} to={hq} color={t.color} />
        </group>
      ))}
    </group>
  )
}

/* ═══════════════════════════════════════════════════
   WINDMILL 3D
   ═══════════════════════════════════════════════════ */

function Windmill3D({ data, isSelected, onSelect }: {
  data: WindmillData; isSelected: boolean; onSelect: () => void
}) {
  const bladeRef = useRef<THREE.Group>(null!)
  const nacelleMatRef = useRef<THREE.MeshStandardMaterial>(null!)
  const statusColor = data.status === 'hacked' ? '#ff003c' : data.status === 'critical' ? '#ff003c'
    : data.status === 'warning' ? '#ffaa00' : '#00f0ff'

  useFrame(({ clock }, dt) => {
    if (!bladeRef.current) return
    if (data.running) {
      bladeRef.current.rotation.z -= dt * (data.speed / 15)
    }
    if (data.status === 'hacked') {
      bladeRef.current.rotation.z += (Math.random() - 0.5) * 0.15
    }
    if (nacelleMatRef.current) {
      const t = clock.getElapsedTime()
      if (data.status === 'hacked') {
        nacelleMatRef.current.emissiveIntensity = Math.sin(t * 12) > 0 ? 2 : 0.2
      } else if (data.status === 'critical') {
        nacelleMatRef.current.emissiveIntensity = Math.sin(t * 3) * 0.5 + 1.0
      } else {
        nacelleMatRef.current.emissiveIntensity = 0.3
      }
    }
  })

  return (
    <group position={[data.x, 0, data.z]}
      onClick={e => { e.stopPropagation(); onSelect() }}
      onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = 'default' }}>
      {/* Tower */}
      <mesh position={[0, 4, 0]}>
        <cylinderGeometry args={[0.25, 0.45, 8, 8]} />
        <meshStandardMaterial color="#b0b8c0" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Nacelle */}
      <mesh position={[0, 8.2, 0.3]}>
        <boxGeometry args={[0.6, 0.5, 1.2]} />
        <meshStandardMaterial ref={nacelleMatRef} color="#808890" emissive={statusColor}
          emissiveIntensity={0.3} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Hub */}
      <mesh position={[0, 8.2, 0.95]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.2, 8]} />
        <meshStandardMaterial color="#606060" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Blades */}
      <group ref={bladeRef} position={[0, 8.2, 1.05]}>
        {[0, 120, 240].map(deg => (
          <group key={deg} rotation={[0, 0, (deg * Math.PI) / 180]}>
            <mesh position={[0, 2, 0]}>
              <boxGeometry args={[0.22, 3.5, 0.05]} />
              <meshStandardMaterial color="#e0e4e8" emissive={statusColor}
                emissiveIntensity={data.status !== 'normal' ? 0.4 : 0.08} metalness={0.4} roughness={0.5} />
            </mesh>
          </group>
        ))}
      </group>
      {/* Glow light */}
      <pointLight position={[0, 8.5, 1]} color={statusColor} intensity={data.status !== 'normal' ? 3 : 1} distance={8} decay={2} />
      {/* Base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[1.2, 16]} />
        <meshStandardMaterial color="#0a0c14" emissive={statusColor} emissiveIntensity={0.05} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[1.5, 2, 32]} />
          <meshBasicMaterial color={statusColor} transparent opacity={0.5} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* Clickable indicator */}
      {!isSelected && (
        <mesh position={[0, 10.5, 0]}>
          <octahedronGeometry args={[0.2, 0]} />
          <meshBasicMaterial color={statusColor} toneMapped={false} transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  )
}

/* ═══════════════════════════════════════════════════
   TRAFFIC LIGHT 3D
   ═══════════════════════════════════════════════════ */

function TrafficLight3D({ data, isSelected, onSelect }: {
  data: TrafficLightData; isSelected: boolean; onSelect: () => void
}) {
  const redMatRef = useRef<THREE.MeshStandardMaterial>(null!)
  const yellowMatRef = useRef<THREE.MeshStandardMaterial>(null!)
  const greenMatRef = useRef<THREE.MeshStandardMaterial>(null!)
  const glowRef = useRef<THREE.PointLight>(null!)

  useFrame(({ clock }) => {
    if (!redMatRef.current) return
    const t = clock.getElapsedTime()
    if (data.mode === 'hacked') {
      redMatRef.current.emissiveIntensity = Math.sin(t * 12) > 0 ? 3 : 0.1
      yellowMatRef.current.emissiveIntensity = Math.sin(t * 15 + 1) > 0 ? 3 : 0.1
      greenMatRef.current.emissiveIntensity = Math.sin(t * 18 + 2) > 0 ? 3 : 0.1
      if (glowRef.current) { glowRef.current.color.set('#ff0000'); glowRef.current.intensity = 4 }
    } else if (data.mode === 'emergency') {
      const f = Math.sin(t * 6) > 0
      redMatRef.current.emissiveIntensity = f ? 4 : 0.5
      yellowMatRef.current.emissiveIntensity = 0.1
      greenMatRef.current.emissiveIntensity = 0.1
      if (glowRef.current) { glowRef.current.color.set('#ff0000'); glowRef.current.intensity = f ? 4 : 1 }
    } else {
      redMatRef.current.emissiveIntensity = data.active === 'red' ? 2.5 : 0.1
      yellowMatRef.current.emissiveIntensity = data.active === 'yellow' ? 2.5 : 0.1
      greenMatRef.current.emissiveIntensity = data.active === 'green' ? 2.5 : 0.1
      if (glowRef.current) {
        glowRef.current.color.set(data.active === 'red' ? '#ff0000' : data.active === 'yellow' ? '#ffaa00' : '#00ff00')
        glowRef.current.intensity = 2
      }
    }
  })

  return (
    <group position={[data.x, 0, data.z]}
      onClick={e => { e.stopPropagation(); onSelect() }}
      onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = 'default' }}>
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 5, 8]} />
        <meshStandardMaterial color="#404850" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 5.5, 0]}>
        <boxGeometry args={[0.5, 1.6, 0.35]} />
        <meshStandardMaterial color="#1a1e22" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 6.1, 0.2]}>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshStandardMaterial ref={redMatRef} color="#220000" emissive="#ff0000" emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[0, 5.5, 0.2]}>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshStandardMaterial ref={yellowMatRef} color="#221800" emissive="#ffaa00" emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[0, 4.9, 0.2]}>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshStandardMaterial ref={greenMatRef} color="#002200" emissive="#00ff00" emissiveIntensity={0.1} />
      </mesh>
      <pointLight ref={glowRef} position={[0, 5.5, 0.5]} color="#00ff00" intensity={2} distance={6} decay={2} />
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[1, 1.3, 32]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.5} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      {!isSelected && (
        <mesh position={[0, 7, 0]}>
          <octahedronGeometry args={[0.15, 0]} />
          <meshBasicMaterial color="#00f0ff" toneMapped={false} transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  )
}

/* ═══════════════════════════════════════════════════
   HOLO RING + PARTICLES
   ═══════════════════════════════════════════════════ */

function HoloRing({ cityState }: { cityState: CityState }) {
  const g1 = useRef<THREE.Group>(null!)
  const g2 = useRef<THREE.Mesh>(null!)
  const mat1Ref = useRef<THREE.MeshBasicMaterial>(null!)
  const mat2Ref = useRef<THREE.MeshBasicMaterial>(null!)
  const lightRef = useRef<THREE.PointLight>(null!)

  useFrame((_, dt) => {
    if (g1.current) g1.current.rotation.y += dt * 0.15
    if (g2.current) g2.current.rotation.y -= dt * 0.1
    const c1 = cityState === 'cyberattack' ? '#ff003c' : cityState === 'critical' ? '#ff3300' : cityState === 'alert' ? '#ffaa00' : '#00f0ff'
    const c2 = cityState === 'cyberattack' ? '#ff003c' : '#bf00ff'
    if (mat1Ref.current) mat1Ref.current.color.set(c1)
    if (mat2Ref.current) mat2Ref.current.color.set(c2)
    if (lightRef.current) lightRef.current.color.set(c1)
  })

  return (
    <group position={[0, 24, -2]}>
      <group ref={g1}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[5.5, 0.04, 16, 64]} />
          <meshBasicMaterial ref={mat1Ref} color="#00f0ff" transparent opacity={0.5} toneMapped={false} />
        </mesh>
      </group>
      <mesh ref={g2} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4.2, 0.025, 16, 48]} />
        <meshBasicMaterial ref={mat2Ref} color="#bf00ff" transparent opacity={0.3} toneMapped={false} />
      </mesh>
      <pointLight ref={lightRef} color="#00f0ff" intensity={5} distance={15} decay={2} />
    </group>
  )
}

function Particles({ cityState }: { cityState: CityState }) {
  const count = 150
  const ref = useRef<THREE.Points>(null!)
  const vels = useRef<Float32Array>(null!)
  const pos = useMemo(() => {
    const a = new Float32Array(count * 3)
    const v = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      a[i * 3] = (Math.random() - 0.5) * 50
      a[i * 3 + 1] = Math.random() * 20 + 1
      a[i * 3 + 2] = (Math.random() - 0.5) * 50
      v[i * 3] = (Math.random() - 0.5) * 0.008
      v[i * 3 + 1] = 0.005 + Math.random() * 0.015
      v[i * 3 + 2] = (Math.random() - 0.5) * 0.008
    }
    vels.current = v
    return a
  }, [])

  useFrame(() => {
    if (!ref.current || !vels.current) return
    const p = ref.current.geometry.attributes.position.array as Float32Array
    const v = vels.current
    for (let i = 0; i < count; i++) {
      p[i * 3] += v[i * 3]; p[i * 3 + 1] += v[i * 3 + 1]; p[i * 3 + 2] += v[i * 3 + 2]
      if (p[i * 3 + 1] > 25) {
        p[i * 3] = (Math.random() - 0.5) * 50; p[i * 3 + 1] = 1; p[i * 3 + 2] = (Math.random() - 0.5) * 50
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true
    const mat = ref.current.material as THREE.PointsMaterial
    const c = cityState === 'cyberattack' ? '#ff003c' : cityState === 'critical' ? '#ff3300' : cityState === 'alert' ? '#ffaa00' : '#00f0ff'
    mat.color.set(c)
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={pos} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.1} color="#00f0ff" transparent opacity={0.5} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

/* ═══════════════════════════════════════════════════
   CITY STATE LIGHTING
   ═══════════════════════════════════════════════════ */

function CityStateEffects({ cityState }: { cityState: CityState }) {
  const ambientRef = useRef<THREE.AmbientLight>(null!)
  const pulseRef = useRef<THREE.PointLight>(null!)

  useFrame(({ clock }) => {
    if (!ambientRef.current) return
    ambientRef.current.color.lerp(STATE_AMBIENT[cityState], 0.03)
    const t = clock.getElapsedTime()
    if (cityState === 'critical') {
      ambientRef.current.intensity = THREE.MathUtils.lerp(ambientRef.current.intensity, Math.sin(t * 3) * 0.1 + 0.35, 0.05)
    } else if (cityState === 'cyberattack') {
      ambientRef.current.intensity = THREE.MathUtils.lerp(ambientRef.current.intensity, Math.sin(t * 5) * 0.15 + 0.3, 0.05)
    } else {
      ambientRef.current.intensity = THREE.MathUtils.lerp(ambientRef.current.intensity, 0.25, 0.05)
    }
    if (pulseRef.current) {
      if (cityState === 'critical' || cityState === 'cyberattack') {
        pulseRef.current.intensity = Math.sin(t * 4) * 3 + 5
        pulseRef.current.color.set(cityState === 'cyberattack' ? '#ff003c' : '#ff3300')
      } else {
        pulseRef.current.intensity = THREE.MathUtils.lerp(pulseRef.current.intensity, 0, 0.05)
      }
    }
  })

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.25} color="#2a3a5a" />
      <pointLight ref={pulseRef} position={[0, 30, 0]} intensity={0} distance={60} decay={2} color="#ff003c" />
    </>
  )
}

/* ═══════════════════════════════════════════════════
   CAMERA CONTROLLER
   ═══════════════════════════════════════════════════ */

const DEFAULT_CAM_POS = new THREE.Vector3(35, 28, 35)
const DEFAULT_TARGET = new THREE.Vector3(0, 4, 0)

function CameraController({ cameraTarget, controlsRef }: {
  cameraTarget: { pos: THREE.Vector3; look: THREE.Vector3 } | null
  controlsRef: React.MutableRefObject<React.ElementRef<typeof OrbitControls>>
}) {
  const { camera } = useThree()
  const targetPos = useRef(DEFAULT_CAM_POS.clone())
  const targetLook = useRef(DEFAULT_TARGET.clone())

  useEffect(() => {
    if (cameraTarget) {
      targetPos.current.copy(cameraTarget.pos)
      targetLook.current.copy(cameraTarget.look)
      if (controlsRef.current) controlsRef.current.autoRotate = false
    } else {
      targetPos.current.copy(DEFAULT_CAM_POS)
      targetLook.current.copy(DEFAULT_TARGET)
      if (controlsRef.current) controlsRef.current.autoRotate = true
    }
  }, [cameraTarget, controlsRef])

  useFrame(() => {
    camera.position.lerp(targetPos.current, 0.04)
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLook.current, 0.04)
      controlsRef.current.update()
    }
  })
  return null
}

/* ═══════════════════════════════════════════════════
   SCENE
   ═══════════════════════════════════════════════════ */

function Scene({ cityState, selectedObj, cameraTarget, onSelectBuilding, onSelectWindmill, onSelectTrafficLight, windmills, trafficLights, attackedDeviceId }: {
  cityState: CityState
  selectedObj: SelectedObject | null
  cameraTarget: { pos: THREE.Vector3; look: THREE.Vector3 } | null
  onSelectBuilding: (b: Bld) => void
  onSelectWindmill: (id: string) => void
  onSelectTrafficLight: (id: string) => void
  windmills: WindmillData[]
  trafficLights: TrafficLightData[]
  attackedDeviceId: string | null
}) {
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null!)

  return (
    <>
      <PerspectiveCamera makeDefault position={[35, 28, 35]} fov={45} />
      <OrbitControls ref={controlsRef} maxPolarAngle={Math.PI / 2.2} minDistance={8} maxDistance={60}
        target={[0, 4, 0]} enableDamping dampingFactor={0.05} autoRotate autoRotateSpeed={0.3} />
      <CameraController cameraTarget={cameraTarget} controlsRef={controlsRef} />

      <CityStateEffects cityState={cityState} />
      <directionalLight position={[15, 35, 10]} intensity={0.6} color="#4488cc" castShadow />
      <hemisphereLight args={['#1a2a4a', '#040810', 0.3]} />

      <pointLight position={[0, 26, -2]} intensity={8} distance={40} decay={2} color="#00f0ff" />
      <pointLight position={[-14, 12, -14]} intensity={5} distance={25} decay={2} color="#ff003c" />
      <pointLight position={[14, 14, -14]} intensity={5} distance={25} decay={2} color="#00f0ff" />
      <pointLight position={[-6, 16, 3]} intensity={5} distance={25} decay={2} color="#bf00ff" />
      <pointLight position={[7, 18, 4]} intensity={6} distance={25} decay={2} color="#00ff88" />
      <pointLight position={[-9, 10, 14]} intensity={4} distance={22} decay={2} color="#ffaa00" />
      <pointLight position={[15, 10, 14]} intensity={4} distance={22} decay={2} color="#00ff88" />

      <Stars radius={100} depth={60} count={2500} factor={3} saturation={0.2} fade speed={0.4} />

      <Ground />
      {ROADS.map((r, i) => <RoadMesh key={i} r={r} />)}
      <TrafficDots cityState={cityState} />

      {BUILDINGS.map((b, i) => (
        <Building key={i} b={b} cityState={cityState} attackedDeviceId={attackedDeviceId}
          isSelected={selectedObj?.type === 'building' && selectedObj.building.deviceId === b.deviceId && !!b.deviceId}
          onSelect={onSelectBuilding} />
      ))}

      {windmills.map(wm => (
        <Windmill3D key={wm.id} data={wm}
          isSelected={selectedObj?.type === 'windmill' && selectedObj.id === wm.id}
          onSelect={() => onSelectWindmill(wm.id)} />
      ))}

      {trafficLights.map(tl => (
        <TrafficLight3D key={tl.id} data={tl}
          isSelected={selectedObj?.type === 'trafficlight' && selectedObj.id === tl.id}
          onSelect={() => onSelectTrafficLight(tl.id)} />
      ))}

      <DataFlows />
      <HoloRing cityState={cityState} />
      <Particles cityState={cityState} />
      <fog attach="fog" args={['#030812', 40, 75]} />
    </>
  )
}

/* ═══════════════════════════════════════════════════
   SVG GAUGE COMPONENTS
   ═══════════════════════════════════════════════════ */

function CircularGauge({ value, max, label, color, size = 80 }: {
  value: number; max: number; label: string; color: string; size?: number
}) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(value / max, 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,240,255,0.08)" strokeWidth={4} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 4px ${color})` }} />
        <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
          fill="#e8f4f8" fontSize={size * 0.2} fontFamily="Orbitron" fontWeight="700"
          style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}>
          {Math.round(value)}
        </text>
      </svg>
      <span style={{ fontSize: 10, color: '#4a7a8a', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</span>
    </div>
  )
}

function BarGauge({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = Math.min(value / max * 100, 100)
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: '#7eb8c9', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 11, color, fontFamily: 'Orbitron', fontWeight: 600 }}>{Math.round(value)}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(0,240,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ height: '100%', background: color, borderRadius: 2, boxShadow: `0 0 8px ${color}` }} />
      </div>
    </div>
  )
}

function Sparkline({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  const max = Math.max(...data, 1)
  const w = 200
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - (v / max) * (height - 4)}`).join(' ')
  const areaPts = pts + ` ${w},${height} 0,${height}`
  return (
    <svg viewBox={`0 0 ${w} ${height}`} style={{ width: '100%', height }}>
      <polygon points={areaPts} fill={color} opacity={0.1} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
    </svg>
  )
}

/* ═══════════════════════════════════════════════════
   DEVICE DETAIL PANEL
   ═══════════════════════════════════════════════════ */

function DeviceDetailPanel({ device, onClose }: { device: DeviceInfo; onClose: () => void }) {
  const [metrics, setMetrics] = useState({ cpu: device.cpu, memory: device.memory, temp: device.temp, bandwidth: device.bandwidth })
  const [sparkData, setSparkData] = useState<number[]>(() => Array.from({ length: 20 }, () => Math.random() * 60 + 20))
  const [logs, setLogs] = useState<{ time: string; msg: string; level: string }[]>([
    { time: '14:32:01', msg: `Connection established from ${device.ip}`, level: 'info' },
    { time: '14:31:45', msg: 'TLS handshake completed successfully', level: 'info' },
    { time: '14:31:12', msg: 'Rule #47 matched: port scan detected', level: 'warning' },
    { time: '14:30:58', msg: `Firmware ${device.firmware} health check passed`, level: 'info' },
    { time: '14:30:22', msg: 'Anomalous traffic pattern detected on eth0', level: 'warning' },
  ])

  useEffect(() => {
    const id = setInterval(() => {
      setMetrics(prev => ({
        cpu: Math.max(5, Math.min(99, prev.cpu + (Math.random() - 0.5) * 8)),
        memory: Math.max(10, Math.min(99, prev.memory + (Math.random() - 0.5) * 4)),
        temp: Math.max(25, Math.min(85, prev.temp + (Math.random() - 0.5) * 3)),
        bandwidth: Math.max(10, Math.min(3000, prev.bandwidth + (Math.random() - 0.5) * 100)),
      }))
      setSparkData(prev => [...prev.slice(1), Math.random() * 60 + 20])
    }, 2000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const msgs = ['Heartbeat OK', 'Packet inspection: clean', 'Rule evaluation cycle complete',
      'Certificate rotation scheduled', 'Interface stats updated', 'DNS cache refreshed']
    const id = setInterval(() => {
      const now = new Date()
      const time = now.toLocaleTimeString('en-US', { hour12: false })
      setLogs(prev => [{ time, msg: msgs[Math.floor(Math.random() * msgs.length)], level: Math.random() > 0.8 ? 'warning' : 'info' }, ...prev.slice(0, 7)])
    }, 5000)
    return () => clearInterval(id)
  }, [])

  const statusColor = device.status === 'online' ? '#00ff88' : device.status === 'warning' ? '#ffaa00' : '#ff003c'

  return (
    <motion.div initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 380, maxWidth: '90%',
        background: 'rgba(5,10,24,0.92)', backdropFilter: 'blur(24px)',
        borderLeft: `1px solid ${device.color}30`, overflowY: 'auto', overflowX: 'hidden', zIndex: 20,
        boxShadow: `-8px 0 40px rgba(0,0,0,0.6), 0 0 30px ${device.color}10`,
      }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${device.color}, transparent)`, boxShadow: `0 0 12px ${device.color}` }} />
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700, color: device.color, letterSpacing: '0.08em', marginBottom: 4 }}>{device.name}</div>
            <div style={{ fontSize: 12, color: '#7eb8c9' }}>{device.district} &middot; {device.type}</div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(0,240,255,0.2)',
            background: 'rgba(0,240,255,0.05)', color: '#7eb8c9', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: 16,
          }}>✕</button>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 16,
          background: `${statusColor}10`, border: `1px solid ${statusColor}30`, borderRadius: 8,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, boxShadow: `0 0 8px ${statusColor}`, animation: 'neon-pulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize: 11, fontFamily: 'Orbitron', fontWeight: 600, color: statusColor, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{device.status}</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#4a7a8a', fontFamily: 'JetBrains Mono, monospace' }}>{device.ip}</span>
        </div>

        <div style={{ height: 140, borderRadius: 8, overflow: 'hidden', marginBottom: 16, border: `1px solid ${device.color}20`, background: '#030812' }}>
          <Canvas dpr={[1, 1.5]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.5, alpha: false }}
            camera={{ position: [3, 2.5, 3], fov: 40 }} onCreated={({ gl }) => gl.setClearColor('#030812')}>
            <ambientLight intensity={0.3} color="#2a3a5a" />
            <pointLight position={[3, 4, 2]} intensity={4} distance={12} decay={2} color={device.color} />
            <pointLight position={[-2, 2, -1]} intensity={2} distance={10} decay={2} color="#bf00ff" />
            <DeviceModel color={device.color} />
          </Canvas>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 16, padding: '8px 0' }}>
          <CircularGauge value={metrics.cpu} max={100} label="CPU" color={metrics.cpu > 80 ? '#ff003c' : device.color} />
          <CircularGauge value={metrics.memory} max={100} label="Memory" color={metrics.memory > 85 ? '#ffaa00' : device.color} />
          <CircularGauge value={metrics.temp} max={100} label="Temp" color={metrics.temp > 65 ? '#ff003c' : device.color} />
        </div>
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${device.color}25, transparent)`, margin: '4px 0 12px' }} />

        <BarGauge value={metrics.bandwidth} max={3000} label="Bandwidth (Mbps)" color={device.color} />
        <BarGauge value={device.alerts} max={10} label="Active Alerts" color={device.alerts > 3 ? '#ff003c' : '#ffaa00'} />
        <div style={{ marginTop: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: '#7eb8c9', fontWeight: 600 }}>Traffic (24h)</span>
        </div>
        <Sparkline data={sparkData} color={device.color} />

        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${device.color}25, transparent)`, margin: '12px 0' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: 16 }}>
          {[{ l: 'Uptime', v: device.uptime }, { l: 'Firmware', v: device.firmware }, { l: 'Last Scan', v: device.lastScan }, { l: 'Alerts', v: String(device.alerts) }].map(m => (
            <div key={m.l}>
              <div style={{ fontSize: 10, color: '#4a7a8a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{m.l}</div>
              <div style={{ fontSize: 13, color: '#e8f4f8', fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 }}>{m.v}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Restart', bg: `${device.color}15`, border: `${device.color}40`, tc: device.color },
            { label: 'Scan Now', bg: '#00ff8815', border: '#00ff8840', tc: '#00ff88' },
            { label: 'Isolate', bg: '#ff003c15', border: '#ff003c40', tc: '#ff003c' },
          ].map(btn => (
            <button key={btn.label} style={{
              flex: 1, padding: '7px 0', fontSize: 11, fontFamily: 'Orbitron', fontWeight: 600,
              background: btn.bg, border: `1px solid ${btn.border}`, borderRadius: 6,
              color: btn.tc, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 12px ${btn.tc}30` }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none' }}>
              {btn.label}
            </button>
          ))}
        </div>

        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${device.color}25, transparent)`, margin: '4px 0 12px' }} />

        <div style={{ fontSize: 11, fontFamily: 'Orbitron', fontWeight: 600, color: '#7eb8c9', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Live Logs</div>
        <div style={{ maxHeight: 180, overflowY: 'auto', borderRadius: 6, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,240,255,0.06)' }}>
          {logs.map((log, i) => (
            <div key={`${log.time}-${i}`} style={{
              padding: '6px 10px', fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
              borderBottom: '1px solid rgba(0,240,255,0.04)', display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <span style={{ color: '#4a7a8a', flexShrink: 0 }}>{log.time}</span>
              <span style={{ width: 4, height: 4, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                background: log.level === 'warning' ? '#ffaa00' : '#00ff88',
                boxShadow: `0 0 4px ${log.level === 'warning' ? '#ffaa00' : '#00ff88'}` }} />
              <span style={{ color: '#7eb8c9', wordBreak: 'break-word' }}>{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════
   WINDMILL CONTROL PANEL
   ═══════════════════════════════════════════════════ */

function WindmillPanel({ windmill, onUpdate, onClose }: {
  windmill: WindmillData; onUpdate: (id: string, u: Partial<WindmillData>) => void; onClose: () => void
}) {
  const sc = windmill.status === 'hacked' ? '#ff003c' : windmill.status === 'critical' ? '#ff003c'
    : windmill.status === 'warning' ? '#ffaa00' : '#00f0ff'
  const rpm = Math.round(windmill.speed * 1.2)
  const power = (windmill.speed * 0.85).toFixed(1)

  return (
    <motion.div initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 360, maxWidth: '90%',
        background: 'rgba(5,10,24,0.92)', backdropFilter: 'blur(24px)',
        borderLeft: `1px solid ${sc}30`, overflowY: 'auto', overflowX: 'hidden', zIndex: 20,
        boxShadow: `-8px 0 40px rgba(0,0,0,0.6)`,
      }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${sc}, transparent)`, boxShadow: `0 0 12px ${sc}` }} />
      <div style={{ padding: '16px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700, color: sc, letterSpacing: '0.08em', marginBottom: 4 }}>{windmill.name}</div>
            <div style={{ fontSize: 12, color: '#7eb8c9' }}>Wind Turbine &middot; Industrial</div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(0,240,255,0.2)',
            background: 'rgba(0,240,255,0.05)', color: '#7eb8c9', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: 16,
          }}>✕</button>
        </div>

        {/* Status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 16,
          background: `${sc}10`, border: `1px solid ${sc}30`, borderRadius: 8,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc, boxShadow: `0 0 8px ${sc}`,
            animation: windmill.status === 'hacked' ? 'neon-pulse 0.5s ease-in-out infinite' : 'neon-pulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize: 11, fontFamily: 'Orbitron', fontWeight: 600, color: sc, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {windmill.status}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#4a7a8a' }}>{windmill.running ? 'RUNNING' : 'STOPPED'}</span>
        </div>

        {/* 3D Preview */}
        <div style={{ height: 130, borderRadius: 8, overflow: 'hidden', marginBottom: 16, border: `1px solid ${sc}20`, background: '#030812' }}>
          <Canvas dpr={[1, 1.5]} camera={{ position: [3, 3, 3], fov: 35 }} onCreated={({ gl }) => gl.setClearColor('#030812')}>
            <ambientLight intensity={0.4} color="#2a3a5a" />
            <pointLight position={[3, 4, 2]} intensity={4} distance={12} decay={2} color={sc} />
            <WindmillPreview color={sc} running={windmill.running} speed={windmill.speed} />
          </Canvas>
        </div>

        {/* Start/Stop */}
        <button onClick={() => onUpdate(windmill.id, { running: !windmill.running })} style={{
          width: '100%', padding: '10px 0', fontSize: 12, fontFamily: 'Orbitron', fontWeight: 700,
          background: windmill.running ? '#ff003c15' : '#00ff8815',
          border: `1px solid ${windmill.running ? '#ff003c40' : '#00ff8840'}`, borderRadius: 8,
          color: windmill.running ? '#ff003c' : '#00ff88', cursor: 'pointer', letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: 16, transition: 'all 0.2s',
        }}>
          {windmill.running ? 'STOP TURBINE' : 'START TURBINE'}
        </button>

        {/* Speed slider */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: '#7eb8c9', fontWeight: 600 }}>Speed</span>
            <span style={{ fontSize: 11, color: sc, fontFamily: 'Orbitron', fontWeight: 600 }}>{windmill.speed}%</span>
          </div>
          <input type="range" min={0} max={100} value={windmill.speed}
            onChange={e => onUpdate(windmill.id, { speed: Number(e.target.value) })}
            style={{ width: '100%', accentColor: sc, cursor: 'pointer' }} />
        </div>

        {/* Stress Gauge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <CircularGauge value={windmill.stress} max={100} label="Stress" size={100}
            color={windmill.stress > 85 ? '#ff003c' : windmill.stress > 60 ? '#ffaa00' : '#00f0ff'} />
        </div>

        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${sc}25, transparent)`, margin: '4px 0 12px' }} />

        {/* Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: 16 }}>
          {[{ l: 'RPM', v: String(rpm) }, { l: 'Power', v: `${power} kW` }, { l: 'Wind', v: '12.4 m/s' }, { l: 'Temp', v: '38°C' }].map(m => (
            <div key={m.l}>
              <div style={{ fontSize: 10, color: '#4a7a8a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{m.l}</div>
              <div style={{ fontSize: 13, color: '#e8f4f8', fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 }}>{m.v}</div>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${sc}25, transparent)`, margin: '4px 0 12px' }} />

        {/* State Controls */}
        <div style={{ fontSize: 11, fontFamily: 'Orbitron', fontWeight: 600, color: '#7eb8c9', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          Simulation Controls
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {([
            { label: 'Normal', status: 'normal' as const, c: '#00f0ff' },
            { label: 'Warning', status: 'warning' as const, c: '#ffaa00' },
            { label: 'Critical', status: 'critical' as const, c: '#ff003c' },
            { label: 'Hacked', status: 'hacked' as const, c: '#ff003c' },
          ]).map(s => (
            <button key={s.label} onClick={() => onUpdate(windmill.id, {
              status: s.status,
              stress: s.status === 'critical' ? 90 : s.status === 'warning' ? 65 : s.status === 'hacked' ? 95 : 20,
            })} style={{
              padding: '7px 0', fontSize: 10, fontFamily: 'Orbitron', fontWeight: 600,
              background: windmill.status === s.status ? `${s.c}20` : 'transparent',
              border: `1px solid ${windmill.status === s.status ? s.c : 'rgba(0,240,255,0.15)'}`,
              borderRadius: 6, color: windmill.status === s.status ? s.c : '#4a7a8a',
              cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'all 0.2s',
            }}>{s.label}</button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════
   TRAFFIC LIGHT CONTROL PANEL
   ═══════════════════════════════════════════════════ */

function TrafficLightPanel({ light, onUpdate, onClose }: {
  light: TrafficLightData; onUpdate: (id: string, u: Partial<TrafficLightData>) => void; onClose: () => void
}) {
  const modeColor = light.mode === 'hacked' ? '#ff003c' : light.mode === 'emergency' ? '#ff3300' : '#00f0ff'

  return (
    <motion.div initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 360, maxWidth: '90%',
        background: 'rgba(5,10,24,0.92)', backdropFilter: 'blur(24px)',
        borderLeft: `1px solid ${modeColor}30`, overflowY: 'auto', overflowX: 'hidden', zIndex: 20,
        boxShadow: `-8px 0 40px rgba(0,0,0,0.6)`,
      }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${modeColor}, transparent)`, boxShadow: `0 0 12px ${modeColor}` }} />
      <div style={{ padding: '16px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700, color: modeColor, letterSpacing: '0.08em', marginBottom: 4 }}>{light.name}</div>
            <div style={{ fontSize: 12, color: '#7eb8c9' }}>Traffic Signal &middot; Intersection</div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(0,240,255,0.2)',
            background: 'rgba(0,240,255,0.05)', color: '#7eb8c9', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: 16,
          }}>✕</button>
        </div>

        {/* Mode badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 16,
          background: `${modeColor}10`, border: `1px solid ${modeColor}30`, borderRadius: 8,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: modeColor, boxShadow: `0 0 8px ${modeColor}`,
            animation: light.mode === 'hacked' ? 'neon-pulse 0.3s ease-in-out infinite' : 'neon-pulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize: 11, fontFamily: 'Orbitron', fontWeight: 600, color: modeColor, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {light.mode} MODE
          </span>
        </div>

        {/* Current light indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            background: 'rgba(0,0,0,0.4)', padding: '16px 24px', borderRadius: 12, border: '1px solid rgba(0,240,255,0.08)' }}>
            {(['red', 'yellow', 'green'] as const).map(c => {
              const on = light.active === c
              const col = c === 'red' ? '#ff0000' : c === 'yellow' ? '#ffaa00' : '#00ff00'
              return (
                <div key={c} style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: on ? col : `${col}15`,
                  boxShadow: on ? `0 0 16px ${col}, 0 0 32px ${col}40` : 'none',
                  border: `2px solid ${on ? col : `${col}30`}`,
                  transition: 'all 0.3s',
                }} />
              )
            })}
          </div>
        </div>

        {/* Mode selector */}
        <div style={{ fontSize: 11, fontFamily: 'Orbitron', fontWeight: 600, color: '#7eb8c9', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          Mode
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
          {([
            { label: 'Manual', mode: 'manual' as const, c: '#00f0ff' },
            { label: 'Auto', mode: 'auto' as const, c: '#00ff88' },
            { label: 'Emergency', mode: 'emergency' as const, c: '#ff3300' },
            { label: 'Hacked', mode: 'hacked' as const, c: '#ff003c' },
          ]).map(m => (
            <button key={m.label} onClick={() => onUpdate(light.id, { mode: m.mode })} style={{
              padding: '8px 0', fontSize: 10, fontFamily: 'Orbitron', fontWeight: 600,
              background: light.mode === m.mode ? `${m.c}20` : 'transparent',
              border: `1px solid ${light.mode === m.mode ? m.c : 'rgba(0,240,255,0.15)'}`,
              borderRadius: 6, color: light.mode === m.mode ? m.c : '#4a7a8a',
              cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'all 0.2s',
            }}>{m.label}</button>
          ))}
        </div>

        {/* Manual light control */}
        {light.mode === 'manual' && (
          <>
            <div style={{ fontSize: 11, fontFamily: 'Orbitron', fontWeight: 600, color: '#7eb8c9', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              Light Control
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['red', 'yellow', 'green'] as const).map(c => {
                const col = c === 'red' ? '#ff0000' : c === 'yellow' ? '#ffaa00' : '#00ff00'
                return (
                  <button key={c} onClick={() => onUpdate(light.id, { active: c })} style={{
                    flex: 1, padding: '10px 0', fontSize: 11, fontFamily: 'Orbitron', fontWeight: 600,
                    background: light.active === c ? `${col}25` : 'transparent',
                    border: `1px solid ${light.active === c ? col : `${col}30`}`, borderRadius: 8,
                    color: col, cursor: 'pointer', textTransform: 'uppercase',
                    boxShadow: light.active === c ? `0 0 12px ${col}30` : 'none', transition: 'all 0.2s',
                  }}>{c}</button>
                )
              })}
            </div>
          </>
        )}

        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${modeColor}25, transparent)`, margin: '4px 0 12px' }} />

        {/* Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
          {[{ l: 'Active', v: light.active.toUpperCase() }, { l: 'Mode', v: light.mode.toUpperCase() },
            { l: 'Cycle', v: '3.0s' }, { l: 'Uptime', v: '99.8%' }].map(m => (
            <div key={m.l}>
              <div style={{ fontSize: 10, color: '#4a7a8a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{m.l}</div>
              <div style={{ fontSize: 13, color: '#e8f4f8', fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 }}>{m.v}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════
   3D PREVIEW MODELS
   ═══════════════════════════════════════════════════ */

function DeviceModel({ color }: { color: string }) {
  const groupRef = useRef<THREE.Group>(null!)
  const ringRef = useRef<THREE.Mesh>(null!)
  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.y = clock.getElapsedTime() * 0.5
    if (ringRef.current) ringRef.current.rotation.z = clock.getElapsedTime() * 0.8
  })
  const tex = useMemo(() => makeWindowTex(6, 10, color, 0.7), [color])
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[1, 1.6, 1]} />
        <meshStandardMaterial color="#0a0c1e" emissive={color} emissiveIntensity={0.6} emissiveMap={tex} map={tex} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.65, 0]}>
        <boxGeometry args={[1.1, 0.06, 1.1]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <lineSegments position={[0, 0.8, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(1, 1.6, 1)]} />
        <lineBasicMaterial color={color} transparent opacity={0.4} />
      </lineSegments>
      <mesh ref={ringRef} position={[0, 1, 0]} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[1.2, 0.015, 16, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.6, 1.0, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function WindmillPreview({ color, running, speed }: { color: string; running: boolean; speed: number }) {
  const groupRef = useRef<THREE.Group>(null!)
  const bladeRef = useRef<THREE.Group>(null!)
  useFrame(({ clock }, dt) => {
    if (groupRef.current) groupRef.current.rotation.y = clock.getElapsedTime() * 0.3
    if (bladeRef.current && running) bladeRef.current.rotation.z -= dt * (speed / 20)
  })
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.06, 0.1, 1.2, 6]} />
        <meshStandardMaterial color="#b0b8c0" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.25, 0.08]}>
        <boxGeometry args={[0.12, 0.1, 0.25]} />
        <meshStandardMaterial color="#808890" emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <group ref={bladeRef} position={[0, 1.25, 0.22]}>
        {[0, 120, 240].map(deg => (
          <group key={deg} rotation={[0, 0, (deg * Math.PI) / 180]}>
            <mesh position={[0, 0.45, 0]}>
              <boxGeometry args={[0.05, 0.8, 0.015]} />
              <meshStandardMaterial color="#e0e4e8" emissive={color} emissiveIntensity={0.3} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

/* ═══════════════════════════════════════════════════
   HUD OVERLAY
   ═══════════════════════════════════════════════════ */

function HUD({ cityState }: { cityState: CityState }) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const stateLabel = cityState === 'cyberattack' ? 'CYBER ATTACK' : cityState.toUpperCase()
  const stateColor = cityState === 'cyberattack' ? '#ff003c' : cityState === 'critical' ? '#ff003c'
    : cityState === 'alert' ? '#ffaa00' : '#00f0ff'

  const districts = [
    { n: 'Traffic Mgmt', c: '#ff003c' }, { n: 'IoT Sensors', c: '#00f0ff' },
    { n: 'Network Infra', c: '#bf00ff' }, { n: 'Security Ops', c: '#00ff88' },
    { n: 'Industrial', c: '#ffaa00' }, { n: 'Cyber Range', c: '#00ff88' },
  ]

  return (
    <>
      <div style={{
        position: 'absolute', top: 12, left: 12, pointerEvents: 'none', userSelect: 'none',
        fontFamily: 'Orbitron, monospace', color: stateColor,
        textShadow: `0 0 8px ${stateColor}80`,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700 }}>CITYSHIELD MONITOR</div>
        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{time.toLocaleTimeString()}</div>
        <div style={{ fontSize: 10, opacity: 0.9, marginTop: 1 }}>STATUS: {stateLabel}</div>
      </div>

      <div style={{
        position: 'absolute', top: 12, right: 12, pointerEvents: 'none', userSelect: 'none',
        fontFamily: 'Rajdhani, sans-serif', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 3,
      }}>
        {districts.map(d => (
          <div key={d.n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: d.c, boxShadow: `0 0 6px ${d.c}` }} />
            <span style={{ color: d.c, textShadow: `0 0 4px ${d.c}40` }}>{d.n}</span>
          </div>
        ))}
      </div>

      <div style={{ position: 'absolute', top: 4, left: 4, width: 16, height: 16, pointerEvents: 'none', borderTop: `1px solid ${stateColor}50`, borderLeft: `1px solid ${stateColor}50` }} />
      <div style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, pointerEvents: 'none', borderTop: `1px solid ${stateColor}50`, borderRight: `1px solid ${stateColor}50` }} />
      <div style={{ position: 'absolute', bottom: 4, left: 4, width: 16, height: 16, pointerEvents: 'none', borderBottom: `1px solid ${stateColor}50`, borderLeft: `1px solid ${stateColor}50` }} />
      <div style={{ position: 'absolute', bottom: 4, right: 4, width: 16, height: 16, pointerEvents: 'none', borderBottom: `1px solid ${stateColor}50`, borderRight: `1px solid ${stateColor}50` }} />
    </>
  )
}

/* ═══════════════════════════════════════════════════
   CITY STATE BAR
   ═══════════════════════════════════════════════════ */

function CityStateBar({ cityState, onChange }: { cityState: CityState; onChange: (s: CityState) => void }) {
  const states: { label: string; value: CityState; color: string }[] = [
    { label: 'Normal', value: 'normal', color: '#00f0ff' },
    { label: 'Alert', value: 'alert', color: '#ffaa00' },
    { label: 'Critical', value: 'critical', color: '#ff3300' },
    { label: 'Cyber Attack', value: 'cyberattack', color: '#ff003c' },
  ]

  return (
    <div style={{
      position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 4, padding: '4px 6px', borderRadius: 10,
      background: 'rgba(5,10,24,0.85)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(0,240,255,0.12)', zIndex: 10,
    }}>
      {states.map(s => (
        <button key={s.value} onClick={() => onChange(s.value)} style={{
          padding: '5px 12px', fontSize: 10, fontFamily: 'Orbitron', fontWeight: 600,
          background: cityState === s.value ? `${s.color}20` : 'transparent',
          border: `1px solid ${cityState === s.value ? s.color : 'transparent'}`,
          borderRadius: 6, color: cityState === s.value ? s.color : '#4a7a8a',
          cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'all 0.2s',
          textShadow: cityState === s.value ? `0 0 6px ${s.color}60` : 'none',
        }}>{s.label}</button>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   ATTACK STAGE TYPES & PHASE DATA
   ═══════════════════════════════════════════════════ */

interface StageData {
  name: string; description: string; status: string
  started_at: string | null; completed_at: string | null; error: string | null
}

interface StageResponse {
  run_id: string; status: string
  target_device_id: string | null; target_component_id: string | null
  stages: StageData[]
}

interface AttackPhase { name: string; description: string }

const ATTACK_PHASES: Record<string, AttackPhase[]> = {
  DDoS: [
    { name: 'Botnet Activation', description: 'Coordinating distributed attack nodes across multiple regions' },
    { name: 'Traffic Flood', description: 'Overwhelming target with SYN/UDP flood packets at high volume' },
    { name: 'Service Degradation', description: 'Target services becoming unresponsive to legitimate requests' },
    { name: 'Full Denial', description: 'Complete service disruption achieved - all endpoints unreachable' },
  ],
  'Brute Force': [
    { name: 'Target Enumeration', description: 'Identifying active login endpoints and valid usernames' },
    { name: 'Credential Spray', description: 'Testing common password combinations across discovered accounts' },
    { name: 'Intensive Attack', description: 'Focused high-rate attempts on viable accounts detected' },
    { name: 'Access Breach', description: 'Valid credentials discovered - unauthorized access gained' },
  ],
  'Port Scan': [
    { name: 'Host Discovery', description: 'Sending ICMP and ARP probes to identify live hosts on the network' },
    { name: 'Port Enumeration', description: 'Scanning TCP/UDP ports 1-65535 on discovered hosts' },
    { name: 'Service Detection', description: 'Fingerprinting detected services and their versions' },
    { name: 'Vulnerability Mapping', description: 'Mapping discovered services against known vulnerability databases' },
  ],
  Malware: [
    { name: 'Initial Delivery', description: 'Malicious payload delivered via compromised firmware update channel' },
    { name: 'Execution', description: 'Payload executing on target device, establishing persistence' },
    { name: 'Lateral Movement', description: 'Spreading to adjacent IoT devices through network protocols' },
    { name: 'Data Exfiltration', description: 'Collecting and transmitting sensitive data to external C2 server' },
  ],
  'Data Exfiltration': [
    { name: 'Access Established', description: 'Attacker gains access to data stores through compromised credentials' },
    { name: 'Data Collection', description: 'Aggregating sensitive data from multiple database tables' },
    { name: 'Staging', description: 'Compressing and encrypting data for covert transmission' },
    { name: 'Exfiltration', description: 'Transmitting data to external server via encrypted DNS tunneling' },
  ],
  'SQL Injection': [
    { name: 'Reconnaissance', description: 'Probing input fields for injection vulnerabilities' },
    { name: 'Exploitation', description: 'Crafting and injecting malicious SQL payloads' },
    { name: 'Data Access', description: 'Extracting database schema and sensitive records' },
    { name: 'Privilege Escalation', description: 'Leveraging DB access to escalate system privileges' },
  ],
}

const DEFAULT_PHASES: AttackPhase[] = [
  { name: 'Reconnaissance', description: 'Scanning target systems for vulnerabilities' },
  { name: 'Initial Access', description: 'Attempting to gain entry into target systems' },
  { name: 'Execution', description: 'Running attack payload on compromised systems' },
  { name: 'Impact', description: 'Affecting target systems and data integrity' },
]

const ATTACK_ICONS: Record<string, string> = {
  DDoS: '\u{1F30A}', 'Brute Force': '\u{1F528}', 'Port Scan': '\u{1F50D}',
  Malware: '\u{1F9A0}', 'Data Exfiltration': '\u{1F4E4}', 'SQL Injection': '\u{1F489}',
}

const ATTACK_EXPLANATIONS: Record<string, { why: string; how: string }> = {
  DDoS: {
    why: 'Overwhelm network infrastructure to cause service disruption for city operations.',
    how: 'A distributed botnet sends massive volumes of SYN/UDP packets to flood target servers.',
  },
  'Brute Force': {
    why: 'Gain unauthorized access to traffic management control systems.',
    how: 'Automated tools rapidly test thousands of username/password combinations.',
  },
  'Port Scan': {
    why: 'Map the attack surface of network infrastructure to identify vulnerable services.',
    how: 'Network scanning tools send TCP SYN packets to every port on target hosts.',
  },
  Malware: {
    why: 'Compromise IoT sensor devices to manipulate city environmental data.',
    how: 'Malicious firmware is deployed via a compromised update server.',
  },
  'Data Exfiltration': {
    why: 'Steal sensitive city infrastructure data including security configurations.',
    how: 'Data is collected, compressed, and secretly transmitted via DNS tunneling.',
  },
  'SQL Injection': {
    why: 'Access and manipulate databases storing critical infrastructure configurations.',
    how: 'Specially crafted SQL commands are injected through unvalidated input fields.',
  },
}

/* ═══════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════ */

interface SmartCityMap3DProps {
  activeAttack?: ActiveAttack | null
  onAttackEnd?: () => void
}

export default function SmartCityMap3D({ activeAttack, onAttackEnd }: SmartCityMap3DProps) {
  const navigate = useNavigate()
  const [cityState, setCityState] = useState<CityState>('normal')
  const [selected, setSelected] = useState<SelectedObject | null>(null)

  // Attack state
  const [attackProgress, setAttackProgress] = useState(0)
  const [attackComplete, setAttackComplete] = useState(false)
  const [stageData, setStageData] = useState<StageResponse | null>(null)

  // Derive which building is under attack
  const attackedDeviceId = useMemo(() => {
    if (!activeAttack || attackComplete) return null
    return TARGET_TO_DEVICE[activeAttack.targetComponent] || null
  }, [activeAttack, attackComplete])

  const [windmills, setWindmills] = useState<WindmillData[]>([
    { id: 'wm1', x: -16, z: 18, name: 'Wind Turbine Alpha', running: true, speed: 60, stress: 25, status: 'normal' },
    { id: 'wm2', x: 20, z: -18, name: 'Wind Turbine Beta', running: true, speed: 45, stress: 15, status: 'normal' },
    { id: 'wm3', x: -20, z: 2, name: 'Wind Turbine Gamma', running: true, speed: 75, stress: 40, status: 'normal' },
  ])

  const [trafficLights, setTrafficLights] = useState<TrafficLightData[]>([
    { id: 'tl1', x: 0.8, z: 0.8, name: 'Central Intersection', active: 'green', mode: 'auto' },
    { id: 'tl2', x: -12.8, z: -8.8, name: 'NW Junction', active: 'red', mode: 'auto' },
    { id: 'tl3', x: 13.8, z: -8.8, name: 'NE Junction', active: 'yellow', mode: 'auto' },
    { id: 'tl4', x: 13.8, z: 9.8, name: 'SE Junction', active: 'green', mode: 'auto' },
  ])

  // Auto-cycle traffic lights
  useEffect(() => {
    const id = setInterval(() => {
      setTrafficLights(prev => prev.map((tl, i) => {
        if (tl.mode !== 'auto') return tl
        const t = Date.now() / 1000
        const offset = i * 2.1
        const phase = Math.floor((t + offset) / 3) % 3
        const cycle: TrafficLightData['active'][] = ['green', 'yellow', 'red']
        return { ...tl, active: cycle[phase] }
      }))
    }, 500)
    return () => clearInterval(id)
  }, [])

  // Simulate windmill stress
  useEffect(() => {
    const id = setInterval(() => {
      setWindmills(prev => prev.map(wm => {
        if (wm.status === 'hacked') return wm
        if (!wm.running) return { ...wm, stress: Math.max(0, wm.stress - 2) }
        const delta = (wm.speed / 100) * (Math.random() - 0.4) * 6
        const newStress = Math.max(0, Math.min(100, wm.stress + delta))
        const newStatus: WindmillData['status'] = newStress > 85 ? 'critical' : newStress > 60 ? 'warning' : 'normal'
        return { ...wm, stress: newStress, status: newStatus }
      }))
    }, 2000)
    return () => clearInterval(id)
  }, [])

  // City state effects
  useEffect(() => {
    if (cityState === 'cyberattack') {
      setTrafficLights(prev => prev.map(tl => ({ ...tl, mode: 'hacked' as const })))
      setWindmills(prev => prev.map(wm => ({ ...wm, status: 'hacked' as const, stress: 95 })))
    } else if (cityState === 'critical') {
      setTrafficLights(prev => prev.map(tl => ({ ...tl, mode: 'emergency' as const })))
      setWindmills(prev => prev.map(wm => wm.status === 'hacked' ? { ...wm, status: 'critical' as const, stress: 85 } : wm))
    } else if (cityState === 'alert') {
      setTrafficLights(prev => prev.map(tl => tl.mode === 'hacked' ? { ...tl, mode: 'auto' as const } : tl))
      setWindmills(prev => prev.map(wm => wm.status === 'hacked' ? { ...wm, status: 'warning' as const, stress: 55 } : wm))
    } else {
      setTrafficLights(prev => prev.map(tl => ({ ...tl, mode: 'auto' as const })))
      setWindmills(prev => prev.map(wm => ({ ...wm, status: 'normal' as const, stress: Math.max(0, wm.stress - 30) })))
    }
  }, [cityState])

  // Auto-set city state when attack is active
  useEffect(() => {
    if (activeAttack && !attackComplete) {
      setCityState('cyberattack')
    }
    if (!activeAttack) {
      setAttackProgress(0)
      setAttackComplete(false)
      setStageData(null)
      setCityState('normal')
    }
  }, [activeAttack, attackComplete])

  // Poll stages endpoint during active attack
  useEffect(() => {
    if (!activeAttack) return
    const fetchStages = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`/api/scenarios/runs/${activeAttack.runId}/stages`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data: StageResponse = await res.json()
          setStageData(data)
          const stages = data.stages || []
          const total = stages.length || 1
          const done = stages.filter(s => s.status === 'success' || s.status === 'failed').length
          const runningBonus = stages.some(s => s.status === 'running') ? 0.5 / total : 0
          setAttackProgress(Math.min((done / total) + runningBonus, 0.99))
          if (data.status === 'completed' || data.status === 'failed') {
            setAttackProgress(1)
            setAttackComplete(true)
          }
        }
      } catch { /* silently fail */ }
    }
    fetchStages()
    const interval = setInterval(fetchStages, 2000)
    return () => clearInterval(interval)
  }, [activeAttack])

  // Derive attack phases from real stage data or fallback
  const hasRealStages = stageData && stageData.stages && stageData.stages.length > 0
  const phases = activeAttack
    ? (hasRealStages
        ? stageData!.stages.map(s => ({ name: s.name, description: s.description }))
        : ATTACK_PHASES[activeAttack.attackPattern] || DEFAULT_PHASES)
    : []
  const currentPhaseIndex = activeAttack
    ? (hasRealStages
        ? stageData!.stages.findIndex(s => s.status === 'running')
        : Math.min(Math.floor(attackProgress * 4), 3))
    : -1
  const explanation = activeAttack
    ? ATTACK_EXPLANATIONS[activeAttack.attackPattern] || { why: 'Attempting to compromise city infrastructure systems.', how: 'Using known attack techniques against target systems.' }
    : null
  const attackIcon = activeAttack ? ATTACK_ICONS[activeAttack.attackPattern] || '\u{26A0}\u{FE0F}' : ''

  // Camera target
  const cameraTarget = useMemo(() => {
    if (!selected) return null
    if (selected.type === 'building') {
      const b = selected.building
      return { pos: new THREE.Vector3(b.x + 12, b.h + 6, b.z + 12), look: new THREE.Vector3(b.x, b.h * 0.5, b.z) }
    }
    if (selected.type === 'windmill') {
      const wm = windmills.find(w => w.id === selected.id)
      if (wm) return { pos: new THREE.Vector3(wm.x + 10, 14, wm.z + 10), look: new THREE.Vector3(wm.x, 5, wm.z) }
    }
    if (selected.type === 'trafficlight') {
      const tl = trafficLights.find(t => t.id === selected.id)
      if (tl) return { pos: new THREE.Vector3(tl.x + 8, 10, tl.z + 8), look: new THREE.Vector3(tl.x, 3, tl.z) }
    }
    return null
  }, [selected, windmills, trafficLights])

  const handleSelectBuilding = useCallback((b: Bld) => {
    setSelected(prev => prev?.type === 'building' && prev.building.deviceId === b.deviceId ? null : { type: 'building', building: b })
  }, [])

  const handleSelectWindmill = useCallback((id: string) => {
    setSelected(prev => prev?.type === 'windmill' && prev.id === id ? null : { type: 'windmill', id })
  }, [])

  const handleSelectTrafficLight = useCallback((id: string) => {
    setSelected(prev => prev?.type === 'trafficlight' && prev.id === id ? null : { type: 'trafficlight', id })
  }, [])

  const handleClose = useCallback(() => setSelected(null), [])

  const selectedDevice = selected?.type === 'building' && selected.building.deviceId ? DEVICES[selected.building.deviceId] : null
  const selectedWindmill = selected?.type === 'windmill' ? windmills.find(w => w.id === selected.id) || null : null
  const selectedTL = selected?.type === 'trafficlight' ? trafficLights.find(t => t.id === selected.id) || null : null

  const updateWindmill = useCallback((id: string, u: Partial<WindmillData>) => {
    setWindmills(prev => prev.map(wm => wm.id === id ? { ...wm, ...u } : wm))
  }, [])

  const updateTrafficLight = useCallback((id: string, u: Partial<TrafficLightData>) => {
    setTrafficLights(prev => prev.map(tl => tl.id === id ? { ...tl, ...u } : tl))
  }, [])

  return (
    <div style={{
      width: '100%', height: 650, borderRadius: '0.75rem', overflow: 'hidden',
      position: 'relative', border: '1px solid rgba(0,240,255,0.1)', background: '#040810',
    }}>
      <Canvas shadows dpr={[1, 1.5]}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.3, alpha: false, powerPreference: 'high-performance' }}
        style={{ width: '100%', height: '100%' }}
        onCreated={({ gl }) => { gl.setClearColor('#040810') }}
        fallback={<div style={{ color: '#ff003c', padding: 20, fontFamily: 'monospace' }}>WebGL not supported</div>}>
        <Suspense fallback={null}>
          <Scene cityState={cityState} selectedObj={selected} cameraTarget={cameraTarget}
            onSelectBuilding={handleSelectBuilding} onSelectWindmill={handleSelectWindmill}
            onSelectTrafficLight={handleSelectTrafficLight}
            windmills={windmills} trafficLights={trafficLights}
            attackedDeviceId={attackedDeviceId} />
        </Suspense>
      </Canvas>

      <HUD cityState={cityState} />

      <CityStateBar cityState={cityState} onChange={setCityState} />

      {/* Warning overlay */}
      <AnimatePresence>
        {(cityState === 'critical' || cityState === 'cyberattack') && (
          <motion.div key="warning" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 8,
              background: cityState === 'cyberattack' ? 'rgba(255,0,60,0.15)' : 'rgba(255,60,0,0.12)',
              border: `1px solid ${cityState === 'cyberattack' ? '#ff003c' : '#ff3300'}40`,
              borderRadius: 8, padding: '6px 20px', pointerEvents: 'none',
              fontFamily: 'Orbitron, monospace', fontSize: 11, letterSpacing: '0.1em',
              color: cityState === 'cyberattack' ? '#ff003c' : '#ff3300',
              textShadow: `0 0 10px ${cityState === 'cyberattack' ? '#ff003c' : '#ff3300'}`,
              animation: 'neon-pulse 1.5s ease-in-out infinite',
            }}>
            {cityState === 'cyberattack' ? 'CYBER ATTACK IN PROGRESS' : 'CRITICAL STATUS'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint */}
      <AnimatePresence>
        {!selected && (
          <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'absolute', bottom: 46, left: '50%', transform: 'translateX(-50%)',
              pointerEvents: 'none', fontSize: 11, color: '#4a7a8a',
              fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.05em',
              background: 'rgba(5,10,24,0.7)', padding: '4px 14px', borderRadius: 20,
              border: '1px solid rgba(0,240,255,0.1)',
            }}>
            Click buildings, windmills, or traffic lights to inspect
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panels */}
      <AnimatePresence>
        {selectedDevice && <DeviceDetailPanel key="dp" device={selectedDevice} onClose={handleClose} />}
        {selectedWindmill && <WindmillPanel key="wp" windmill={selectedWindmill} onUpdate={updateWindmill} onClose={handleClose} />}
        {selectedTL && <TrafficLightPanel key="tp" light={selectedTL} onUpdate={updateTrafficLight} onClose={handleClose} />}
      </AnimatePresence>

      {/* Attack Visualization Overlay */}
      <AnimatePresence>
        {activeAttack && (
          <motion.div
            key="attack-panel"
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              position: 'absolute', top: 50, left: 12, width: 280, maxHeight: 'calc(100% - 62px)',
              overflowY: 'auto', background: 'rgba(5,10,24,0.92)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,0,60,0.3)', borderRadius: 10, padding: 14, zIndex: 20,
              fontFamily: 'Rajdhani, sans-serif',
            }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>{attackIcon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Orbitron', fontWeight: 700, fontSize: 11, color: attackComplete ? '#00ff88' : '#ff003c', letterSpacing: '0.08em' }}>
                  {attackComplete ? 'ATTACK COMPLETE' : 'ATTACK IN PROGRESS'}
                </div>
                <div style={{ fontSize: 13, color: '#7eb8c9' }}>{activeAttack.scenarioName}</div>
              </div>
              {attackComplete && (
                <button onClick={onAttackEnd} style={{
                  width: 24, height: 24, borderRadius: '50%', border: '1px solid rgba(0,240,255,0.2)',
                  background: 'rgba(0,240,255,0.05)', color: '#7eb8c9', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: 14,
                }}>x</button>
              )}
            </div>

            {/* Progress Bar */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: '#4a7a8a', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Orbitron' }}>Progress</span>
                <span style={{ fontSize: 11, color: '#e8f4f8', fontFamily: 'Orbitron', fontWeight: 600 }}>{Math.round(attackProgress * 100)}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,0,60,0.15)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${attackProgress * 100}%`, borderRadius: 2,
                  background: attackComplete ? '#00ff88' : 'linear-gradient(90deg, #ff003c, #ff6b6b)',
                  transition: 'width 0.3s ease', boxShadow: attackComplete ? '0 0 8px #00ff88' : '0 0 8px #ff003c',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                <span style={{ fontSize: 10, color: '#4a7a8a' }}>{activeAttack.attackPattern}</span>
                <span style={{ fontSize: 10, color: '#4a7a8a' }}>
                  {attackComplete ? 'Done' : `Stage ${Math.min(Math.floor(attackProgress * (stageData?.stages?.length || 4)) + 1, stageData?.stages?.length || 4)} / ${stageData?.stages?.length || 4}`}
                </span>
              </div>
            </div>

            {/* Target */}
            <div style={{
              background: 'rgba(255,0,60,0.08)', border: '1px solid rgba(255,0,60,0.2)',
              borderRadius: 8, padding: '8px 10px', marginBottom: 12,
            }}>
              <div style={{ fontSize: 10, color: '#4a7a8a', marginBottom: 2 }}>Target</div>
              <div style={{ fontSize: 13, color: '#ff003c', fontWeight: 600 }}>
                {activeAttack.targetComponent.replace(/_/g, ' ')}
              </div>
            </div>

            {/* Attack Phases Timeline */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: '#4a7a8a', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Orbitron', marginBottom: 8 }}>
                Attack Phases
              </div>
              {phases.map((phase, i) => {
                const realStage = hasRealStages ? stageData!.stages[i] : null
                const stageStatus = realStage?.status
                const isActive = hasRealStages ? stageStatus === 'running' : i === currentPhaseIndex
                const isDone = hasRealStages ? stageStatus === 'success' : (i < currentPhaseIndex || attackComplete)
                const isFailed = hasRealStages ? stageStatus === 'failed' : false

                let indicatorContent = ''
                let borderColor = 'rgba(0,240,255,0.2)'
                let bgColor = 'transparent'
                if (isDone) { indicatorContent = '\u2713'; borderColor = '#00ff88'; bgColor = '#00ff88' }
                else if (isFailed) { indicatorContent = '\u2717'; borderColor = '#ff003c'; bgColor = '#ff003c' }
                else if (isActive) { borderColor = '#ff003c'; bgColor = 'rgba(255,0,60,0.3)' }

                return (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%', border: `2px solid ${borderColor}`,
                      background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 8, color: 'white', flexShrink: 0, marginTop: 1,
                      animation: isActive ? 'neon-pulse 1s ease-in-out infinite' : 'none',
                      boxShadow: isActive ? '0 0 8px #ff003c' : isDone ? '0 0 6px #00ff88' : 'none',
                    }}>
                      {indicatorContent}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 12, fontWeight: isActive ? 700 : 500,
                        color: isDone ? '#00ff88' : isFailed ? '#ff003c' : isActive ? '#ff003c' : '#4a7a8a',
                      }}>
                        {phase.name}
                      </div>
                      {(isActive || isDone || isFailed) && (
                        <div style={{ fontSize: 10, color: '#5a8a9a', marginTop: 1 }}>
                          {isFailed && realStage?.error ? realStage.error : phase.description}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Why & How */}
            {explanation && (
              <div style={{ marginBottom: 12 }}>
                <div style={{
                  background: 'rgba(0,100,255,0.08)', border: '1px solid rgba(0,100,255,0.15)',
                  borderRadius: 8, padding: '8px 10px', marginBottom: 6,
                }}>
                  <div style={{ fontSize: 10, color: '#00f0ff', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'Orbitron', marginBottom: 3 }}>Why this attack</div>
                  <div style={{ fontSize: 11, color: '#7eb8c9', lineHeight: 1.4 }}>{explanation.why}</div>
                </div>
                <div style={{
                  background: 'rgba(180,0,255,0.08)', border: '1px solid rgba(180,0,255,0.15)',
                  borderRadius: 8, padding: '8px 10px',
                }}>
                  <div style={{ fontSize: 10, color: '#bf00ff', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'Orbitron', marginBottom: 3 }}>How it works</div>
                  <div style={{ fontSize: 11, color: '#7eb8c9', lineHeight: 1.4 }}>{explanation.how}</div>
                </div>
              </div>
            )}

            {/* Completion Actions */}
            {attackComplete && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => navigate('/alerts')} style={{
                  flex: 1, padding: '8px 0', fontSize: 10, fontFamily: 'Orbitron', fontWeight: 600,
                  background: '#ff003c15', border: '1px solid #ff003c40', borderRadius: 6,
                  color: '#ff003c', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>View Alerts</button>
                <button onClick={onAttackEnd} style={{
                  flex: 1, padding: '8px 0', fontSize: 10, fontFamily: 'Orbitron', fontWeight: 600,
                  background: 'rgba(0,240,255,0.05)', border: '1px solid rgba(0,240,255,0.2)', borderRadius: 6,
                  color: '#7eb8c9', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>Dismiss</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
