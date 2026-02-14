interface RiskScoreBarProps {
  score: number  // 0-100
  showLabel?: boolean
  height?: number
}

export default function RiskScoreBar({ score, showLabel = true, height = 8 }: RiskScoreBarProps) {
  // Clamp score between 0 and 100
  const clampedScore = Math.max(0, Math.min(100, score))

  // Determine color based on score
  const getColor = (score: number) => {
    if (score >= 75) return 'var(--accent-danger)'
    if (score >= 50) return '#f97316' // orange
    if (score >= 25) return 'var(--accent-warning)'
    return 'var(--accent-success)'
  }

  const color = getColor(clampedScore)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
      <div
        style={{
          flex: 1,
          height: `${height}px`,
          background: 'var(--bg-tertiary)',
          borderRadius: `${height / 2}px`,
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
        }}
      >
        <div
          style={{
            width: `${clampedScore}%`,
            height: '100%',
            background: `linear-gradient(to right, ${color}, ${color}dd)`,
            transition: 'width 0.3s ease',
            borderRadius: `${height / 2}px`,
          }}
        />
      </div>
      {showLabel && (
        <div style={{ minWidth: '60px', textAlign: 'right' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color
            }}
          >
            {clampedScore}
          </span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginLeft: '0.25rem' }}>
            / 100
          </span>
        </div>
      )}
    </div>
  )
}
