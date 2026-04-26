interface DeviceStatusBadgeProps {
  status: 'active' | 'inactive' | 'maintenance' | 'decommissioned' | 'isolated' | 'crashed' | string
  size?: 'sm' | 'md' | 'lg'
}

export default function DeviceStatusBadge({ status, size = 'md' }: DeviceStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          label: 'Active',
          color: 'var(--accent-success)',
          bg: 'rgba(16,185,129,0.15)',
          badgeClass: 'badge-success'
        }
      case 'inactive':
        return {
          label: 'Inactive',
          color: 'var(--text-tertiary)',
          bg: 'rgba(100,116,139,0.15)',
          badgeClass: 'badge-secondary'
        }
      case 'maintenance':
        return {
          label: 'Maintenance',
          color: 'var(--accent-warning)',
          bg: 'rgba(245,158,11,0.15)',
          badgeClass: 'badge-warning'
        }
      case 'decommissioned':
        return {
          label: 'Decommissioned',
          color: 'var(--accent-danger)',
          bg: 'rgba(239,68,68,0.15)',
          badgeClass: 'badge-danger'
        }
      case 'isolated':
        return {
          label: 'Isolated',
          color: '#f97316',
          bg: 'rgba(249,115,22,0.15)',
          badgeClass: 'badge-warning'
        }
      case 'crashed':
        return {
          label: 'Crashed',
          color: '#dc2626',
          bg: 'rgba(220,38,38,0.2)',
          badgeClass: 'badge-danger'
        }
      default:
        return {
          label: 'Unknown',
          color: 'var(--text-secondary)',
          bg: 'rgba(100,116,139,0.1)',
          badgeClass: 'badge-info'
        }
    }
  }

  const config = getStatusConfig(status)
  const fontSize = size === 'sm' ? '0.65rem' : size === 'lg' ? '0.85rem' : '0.75rem'
  const padding = size === 'sm' ? '0.25rem 0.5rem' : size === 'lg' ? '0.4rem 0.8rem' : '0.3rem 0.6rem'

  return (
    <span
      className={`badge ${config.badgeClass}`}
      style={{
        fontSize,
        padding,
        fontWeight: 600
      }}
    >
      {config.label}
    </span>
  )
}
