import React from 'react'

interface WindmillState {
  rpm: number
  temperature: number
  powerOutput: number
}

interface WindmillPanelProps {
  state: WindmillState
  onClose: () => void
}

export default function WindmillPanel({ state, onClose }: WindmillPanelProps) {
  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
          Wind Farm Monitor
        </h4>
        <button onClick={onClose} style={closeButtonStyle}>x</button>
      </div>

      {/* RPM Gauge */}
      <GaugeBar
        label="Blade RPM"
        value={state.rpm}
        max={40}
        unit="rpm"
        color={state.rpm > 25 ? '#ef4444' : state.rpm > 18 ? '#f59e0b' : '#10b981'}
      />

      {/* Temperature Gauge */}
      <GaugeBar
        label="Temperature"
        value={state.temperature}
        max={150}
        unit="°C"
        color={state.temperature > 80 ? '#ef4444' : state.temperature > 60 ? '#f59e0b' : '#10b981'}
      />

      {/* Power Output Gauge */}
      <GaugeBar
        label="Power Output"
        value={state.powerOutput}
        max={500}
        unit="kW"
        color="#3b82f6"
      />
    </div>
  )
}

function GaugeBar({ label, value, max, unit, color }: { label: string; value: number; max: number; unit: string; color: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div style={{ marginBottom: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{Math.round(value)} {unit}</span>
      </div>
      <div style={{
        height: '6px',
        borderRadius: '3px',
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: '3px',
          background: color,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: '0.75rem',
  right: '0.75rem',
  width: '260px',
  background: 'rgba(10, 14, 39, 0.92)',
  backdropFilter: 'blur(12px)',
  border: '1px solid var(--border-color)',
  borderRadius: '0.5rem',
  padding: '0.875rem',
  zIndex: 20,
}

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-tertiary)',
  cursor: 'pointer',
  fontSize: '1rem',
  padding: '0 0.25rem',
  lineHeight: 1,
}
