import HUDPanel, { HUDMetric, HUDBar, HUDStatusRow } from '../HUDPanel'

interface RuleInfo {
  name: string
  severity: string
  enabled: boolean
}

export default function DetectionPanel({ delay = 0, rules }: { delay?: number; rules: RuleInfo[] }) {
  const enabled = rules.filter(r => r.enabled).length
  const disabled = rules.filter(r => !r.enabled).length

  // Group by severity
  const bySeverity: Record<string, number> = {}
  for (const r of rules) {
    if (!r.enabled) continue
    const sev = (r.severity || 'medium').toLowerCase()
    bySeverity[sev] = (bySeverity[sev] || 0) + 1
  }

  const coveragePct = rules.length > 0 ? Math.round((enabled / rules.length) * 100) : 0

  return (
    <HUDPanel
      title="Detection"
      delay={delay}
      accentColor="#00ff88"
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      }
    >
      <HUDMetric label="Active Rules" value={enabled} color="green" />
      <HUDMetric label="Disabled Rules" value={disabled} color="amber" />

      <div style={{ marginTop: '0.4rem', marginBottom: '0.4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
          <span className="hud-metric-label">Coverage</span>
          <span className="hud-metric-value green">{coveragePct}%</span>
        </div>
        <HUDBar value={coveragePct} color="green" />
      </div>

      <div className="hud-divider" />

      <div className="hud-metric-label" style={{ marginBottom: '0.35rem' }}>Rules by Severity</div>
      {(['critical', 'high', 'medium', 'low'] as const).map(sev => {
        const count = bySeverity[sev] || 0
        if (count === 0 && sev !== 'critical' && sev !== 'high') return null
        const sevColor: Record<string, 'critical' | 'warning' | 'online'> = {
          critical: 'critical', high: 'warning', medium: 'online', low: 'online',
        }
        return (
          <HUDStatusRow
            key={sev}
            name={sev.charAt(0).toUpperCase() + sev.slice(1)}
            status={sevColor[sev] || 'online'}
            value={`${count}`}
          />
        )
      })}

      {rules.length > 0 && (
        <>
          <div className="hud-divider" />
          <div className="hud-metric-label" style={{ marginBottom: '0.35rem' }}>Recent Rules</div>
          {rules.filter(r => r.enabled).slice(0, 5).map((r, i) => {
            const sevColor: Record<string, 'critical' | 'warning' | 'online'> = {
              critical: 'critical', high: 'warning', medium: 'online', low: 'online',
            }
            return (
              <HUDStatusRow
                key={i}
                name={r.name.length > 24 ? r.name.slice(0, 22) + '...' : r.name}
                status={sevColor[r.severity?.toLowerCase()] || 'online'}
              />
            )
          })}
        </>
      )}
    </HUDPanel>
  )
}
