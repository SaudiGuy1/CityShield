import { useState } from 'react'

interface ActionConfirmDialogProps {
  actionName: string
  actionDescription: string
  alertId: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ActionConfirmDialog({
  actionName,
  actionDescription,
  alertId,
  onConfirm,
  onCancel
}: ActionConfirmDialogProps) {
  const [confirmed, setConfirmed] = useState(false)

  const handleConfirm = () => {
    if (confirmed) {
      onConfirm()
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
      }}
      onClick={onCancel}
    >
      <div
        className="card"
        style={{
          maxWidth: '500px',
          width: '90%',
          padding: '2rem',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
            }}>
              ⚠️
            </div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Confirm Action Execution</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            You are about to execute a response action. This cannot be undone.
          </p>
        </div>

        {/* Action Details */}
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Action
            </div>
            <div style={{ fontWeight: 600, color: 'var(--accent-danger)' }}>
              {actionName.replace(/_/g, ' ').toUpperCase()}
            </div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Description
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              {actionDescription}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Alert ID
            </div>
            <code style={{ fontSize: '0.8rem', color: 'var(--accent-primary)' }}>
              {alertId}
            </code>
          </div>
        </div>

        {/* Warning */}
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '0.5rem',
          padding: '0.75rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            <strong>⚠️ Warning:</strong> This action will be executed immediately and may:
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <li>Block IP addresses or isolate services</li>
            <li>Affect production systems and user access</li>
            <li>Require manual intervention to reverse</li>
          </ul>
        </div>

        {/* Confirmation Checkbox */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          marginBottom: '1.5rem',
          fontSize: '0.85rem',
        }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span>I understand the risks and want to proceed</span>
        </label>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={handleConfirm}
            disabled={!confirmed}
            style={{
              opacity: confirmed ? 1 : 0.5,
              cursor: confirmed ? 'pointer' : 'not-allowed',
            }}
          >
            Execute Action
          </button>
        </div>
      </div>
    </div>
  )
}
