import { formatDateTimeWithSeconds } from '../utils/datetime'

interface ActionAuditEntry {
  audit_id: string
  alert_id: string
  rule_id: string
  action_name: string
  execution_type: string
  triggered_by: string
  status: string
  parameters?: Record<string, unknown>
  playbook_path?: string
  stdout?: string
  stderr?: string
  started_at: string
  completed_at?: string
  error?: string
}

interface ExecutionDetailsModalProps {
  entry: ActionAuditEntry
  onClose: () => void
}

export default function ExecutionDetailsModal({ entry, onClose }: ExecutionDetailsModalProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'var(--accent-success)'
      case 'failed': return 'var(--accent-danger)'
      case 'pending': return 'var(--accent-warning)'
      default: return 'var(--text-secondary)'
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '2rem',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Action Execution Details</h2>
            <button
              className="btn btn-sm"
              onClick={onClose}
              style={{ minWidth: 'auto', padding: '0.25rem 0.5rem' }}
            >
              ✕
            </button>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Audit ID: <code style={{ fontSize: '0.75rem' }}>{entry.audit_id}</code>
          </p>
        </div>

        {/* Status Banner */}
        <div style={{
          background: `${getStatusColor(entry.status)}15`,
          border: `1px solid ${getStatusColor(entry.status)}40`,
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>
              {entry.status === 'success' ? '✓' : entry.status === 'failed' ? '✕' : '⏳'}
            </span>
            <span style={{ fontWeight: 600, color: getStatusColor(entry.status) }}>
              {entry.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Metadata */}
        <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
          <DetailRow label="Action" value={entry.action_name.replace(/_/g, ' ')} />
          <DetailRow label="Execution Type" value={entry.execution_type} badge />
          <DetailRow label="Triggered By" value={entry.triggered_by} />
          <DetailRow label="Alert ID" value={entry.alert_id} code />
          <DetailRow label="Rule ID" value={entry.rule_id} code />
          <DetailRow label="Started At" value={formatDateTimeWithSeconds(entry.started_at)} />
          {entry.completed_at && (
            <DetailRow label="Completed At" value={formatDateTimeWithSeconds(entry.completed_at)} />
          )}
          {entry.playbook_path && (
            <DetailRow label="Playbook" value={entry.playbook_path} code />
          )}
        </div>

        {/* Parameters */}
        {entry.parameters && Object.keys(entry.parameters).length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Parameters</h3>
            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              border: '1px solid var(--border-color)',
            }}>
              {Object.entries(entry.parameters).map(([key, value]) => (
                <div key={key} style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>{key}: </span>
                  <code style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>
                    {JSON.stringify(value)}
                  </code>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {entry.error && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--accent-danger)' }}>
              Error
            </h3>
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '0.5rem',
              padding: '0.75rem',
            }}>
              <code style={{ fontSize: '0.75rem', color: 'var(--accent-danger)', wordBreak: 'break-word' }}>
                {entry.error}
              </code>
            </div>
          </div>
        )}

        {/* Stdout */}
        {entry.stdout && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Standard Output</h3>
            <pre style={{
              background: 'var(--bg-secondary)',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              border: '1px solid var(--border-color)',
              fontSize: '0.7rem',
              overflow: 'auto',
              maxHeight: '200px',
              margin: 0,
              color: 'var(--text-primary)',
            }}>
              {entry.stdout}
            </pre>
          </div>
        )}

        {/* Stderr */}
        {entry.stderr && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--accent-danger)' }}>
              Standard Error
            </h3>
            <pre style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              fontSize: '0.7rem',
              overflow: 'auto',
              maxHeight: '200px',
              margin: 0,
              color: 'var(--accent-danger)',
            }}>
              {entry.stderr}
            </pre>
          </div>
        )}

        {/* Close Button */}
        <div style={{ textAlign: 'right' }}>
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value, code = false, badge = false }: {
  label: string
  value: string
  code?: boolean
  badge?: boolean
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
      <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>{label}</span>
      {code ? (
        <code style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>{value}</code>
      ) : badge ? (
        <span className="badge badge-secondary">{value}</span>
      ) : (
        <span style={{ color: 'var(--text-primary)' }}>{value}</span>
      )}
    </div>
  )
}
