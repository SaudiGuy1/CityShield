import { formatDateTimeWithSeconds } from '../utils/datetime'

interface ActionAuditEntry {
  audit_id: string
  action_name: string
  execution_type: string
  triggered_by: string
  status: string
  started_at: string
  completed_at?: string
  error?: string
}

interface ActionHistoryTableProps {
  entries: ActionAuditEntry[]
  onViewDetails?: (auditId: string) => void
  compact?: boolean
}

export default function ActionHistoryTable({
  entries,
  onViewDetails,
  compact = false
}: ActionHistoryTableProps) {
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'success': return 'badge-success'
      case 'failed': return 'badge-danger'
      case 'pending': return 'badge-warning'
      default: return 'badge-info'
    }
  }

  const getExecutionTypeBadgeClass = (type: string) => {
    return type === 'automated' ? 'badge-secondary' : 'badge-primary'
  }

  if (entries.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        color: 'var(--text-secondary)',
        fontSize: '0.85rem',
      }}>
        No action executions found
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{
        width: '100%',
        fontSize: compact ? '0.75rem' : '0.8rem',
        borderCollapse: 'collapse',
      }}>
        <thead>
          <tr style={{
            borderBottom: '1px solid var(--border-color)',
            color: 'var(--text-tertiary)',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>Action</th>
            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>Type</th>
            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>Status</th>
            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>Triggered By</th>
            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>Started</th>
            {!compact && <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>Completed</th>}
            {onViewDetails && <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.audit_id}
              style={{
                borderBottom: '1px solid var(--border-color)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <td style={{ padding: '0.75rem 0.5rem' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {entry.action_name.replace(/_/g, ' ')}
                </div>
                {entry.error && (
                  <div style={{
                    fontSize: '0.7rem',
                    color: 'var(--accent-danger)',
                    marginTop: '0.25rem',
                  }}>
                    {entry.error}
                  </div>
                )}
              </td>
              <td style={{ padding: '0.75rem 0.5rem' }}>
                <span className={`badge ${getExecutionTypeBadgeClass(entry.execution_type)}`}>
                  {entry.execution_type}
                </span>
              </td>
              <td style={{ padding: '0.75rem 0.5rem' }}>
                <span className={`badge ${getStatusBadgeClass(entry.status)}`}>
                  {entry.status}
                </span>
              </td>
              <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                {entry.triggered_by}
              </td>
              <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                {formatDateTimeWithSeconds(entry.started_at)}
              </td>
              {!compact && (
                <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                  {entry.completed_at ? formatDateTimeWithSeconds(entry.completed_at) : '-'}
                </td>
              )}
              {onViewDetails && (
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                  <button
                    className="btn btn-sm"
                    style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                    onClick={() => onViewDetails(entry.audit_id)}
                  >
                    Details
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
