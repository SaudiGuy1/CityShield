import { useLang } from '../../hooks/useLang'
import { AWARENESS_VIDEOS, type VideoRef } from '../../data/awarenessContent'

interface Props {
  videoKey?: string
  /** Allow direct passing instead of registry lookup. */
  video?: VideoRef
  /** "small" suits inline placement next to a heading; "default" stands alone. */
  size?: 'small' | 'default'
}

/**
 * "See in Video" / "شاهد بالفيديو" link. Renders nothing when no video is bound,
 * so callers can safely scatter it under every lesson/concept/topic/module.
 */
export default function VideoButton({ videoKey, video, size = 'default' }: Props) {
  const { t, lang, dir } = useLang()
  const ref = video ?? (videoKey ? AWARENESS_VIDEOS[videoKey] : undefined)
  if (!ref) return null

  const labelOnly = lang === 'ar' ? 'شاهد بالفيديو' : 'See in Video'
  const padding = size === 'small' ? '0.3rem 0.65rem' : '0.45rem 0.85rem'
  const fontSize = size === 'small' ? '0.75rem' : '0.85rem'

  return (
    <a
      href={ref.url}
      target="_blank"
      rel="noopener noreferrer"
      dir={dir}
      title={`${ref.channel} — ${t(ref.title)}${ref.duration ? ` (${ref.duration})` : ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding,
        borderRadius: '0.5rem',
        background: 'rgba(255, 0, 60, 0.12)',
        border: '1px solid rgba(255, 0, 60, 0.45)',
        color: '#ff5577',
        fontSize,
        fontWeight: 600,
        textDecoration: 'none',
        lineHeight: 1.2,
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 0, 60, 0.22)'
        e.currentTarget.style.boxShadow = '0 0 14px rgba(255, 0, 60, 0.35)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255, 0, 60, 0.12)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
        <path d="M23 7.2c-.3-1-1-1.8-2-2C19 5 12 5 12 5s-7 0-9 .2c-1 .2-1.8 1-2 2C.8 9.2.8 12 .8 12s0 2.8.2 4.8c.3 1 1 1.8 2 2 2 .2 9 .2 9 .2s7 0 9-.2c1-.2 1.8-1 2-2 .2-2 .2-4.8.2-4.8s0-2.8-.2-4.8zM9.7 15.5V8.5l6 3.5-6 3.5z" />
      </svg>
      <span>{labelOnly}</span>
    </a>
  )
}
