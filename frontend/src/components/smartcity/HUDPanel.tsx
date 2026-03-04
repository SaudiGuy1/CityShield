import { useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface HUDPanelProps {
  title: string
  icon: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  accentColor?: string
  delay?: number
}

export default function HUDPanel({
  title,
  icon,
  children,
  defaultOpen = true,
  accentColor = 'var(--accent-primary)',
  delay = 0,
}: HUDPanelProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <motion.div
      className={`hud-panel ${open ? 'expanded' : ''}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ '--panel-accent': accentColor } as React.CSSProperties}
    >
      <div className="hud-panel-header" onClick={() => setOpen(!open)}>
        <div className="hud-panel-title">
          <span className="hud-panel-icon" style={{ color: accentColor }}>
            {icon}
          </span>
          <span className="hud-panel-label">{title}</span>
        </div>
        <svg
          className={`hud-panel-toggle ${open ? 'open' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="hud-panel-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ overflow: 'hidden' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ─── Reusable sub-components ─── */

export function HUDMetric({
  label,
  value,
  color = 'cyan',
}: {
  label: string
  value: string | number
  color?: 'cyan' | 'magenta' | 'green' | 'amber' | 'red'
}) {
  return (
    <div className="hud-metric">
      <span className="hud-metric-label">{label}</span>
      <span className={`hud-metric-value ${color}`}>{value}</span>
    </div>
  )
}

export function HUDGauge({
  value,
  max = 100,
  label,
  color = 'var(--accent-primary)',
  size = 72,
}: {
  value: number
  max?: number
  label: string
  color?: string
  size?: number
}) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(value / max, 1)
  const offset = circumference * (1 - pct)

  return (
    <div className="hud-gauge">
      <div className="hud-gauge-ring" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`}>
          <circle
            className="gauge-bg"
            cx={size / 2}
            cy={size / 2}
            r={radius}
          />
          <circle
            className="gauge-fill"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="hud-gauge-center">{Math.round(value)}</div>
      </div>
      <div className="hud-gauge-label">{label}</div>
    </div>
  )
}

export function HUDBar({
  value,
  max = 100,
  color = 'cyan',
}: {
  value: number
  max?: number
  color?: 'cyan' | 'magenta' | 'green' | 'amber' | 'red'
}) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="hud-bar">
      <div
        className={`hud-bar-fill ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function HUDSparkline({
  data,
  color = 'var(--accent-primary)',
  height = 36,
}: {
  data: number[]
  color?: string
  height?: number
}) {
  if (data.length < 2) return null

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 100
  const h = height
  const pad = 2

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - pad - ((v - min) / range) * (h - pad * 2)
    return `${x},${y}`
  })

  const linePath = `M${points.join(' L')}`
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`

  return (
    <div className="hud-sparkline" style={{ height }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <path className="spark-area" d={areaPath} fill={color} />
        <path className="spark-line" d={linePath} stroke={color} />
      </svg>
    </div>
  )
}

export function HUDStatusRow({
  name,
  status,
  value,
}: {
  name: string
  status: 'online' | 'warning' | 'critical' | 'offline'
  value?: string
}) {
  return (
    <div className="hud-status-row">
      <span className={`hud-status-dot ${status}`} />
      <span className="hud-status-name">{name}</span>
      {value && <span className="hud-status-val">{value}</span>}
    </div>
  )
}
