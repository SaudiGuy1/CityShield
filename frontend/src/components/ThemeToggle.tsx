import { useLang } from '../hooks/useLang'
import { useTheme } from '../hooks/useTheme'

/**
 * Pill-shaped theme toggle showing current state icon + label.
 * Fixed width prevents layout shift on toggle.
 */
export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const { tk } = useLang()
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={tk('theme.toggle')}
      title={tk('theme.toggle')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem',
        width: '5.5rem',
        height: '2.25rem',
        borderRadius: '9999px',
        background: isDark ? 'var(--bg-tertiary)' : 'var(--bg-tertiary)',
        border: `1px solid ${isDark ? 'rgba(0,240,255,0.25)' : 'rgba(0,131,143,0.3)'}`,
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: '0.75rem',
        fontWeight: 600,
        fontFamily: "'Rajdhani', sans-serif",
        letterSpacing: '0.03em',
        transition: 'all 0.25s ease',
        padding: '0 0.6rem',
      }}
    >
      {isDark ? (
        <>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <span>{tk('theme.dark')}</span>
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
          <span>{tk('theme.light')}</span>
        </>
      )}
    </button>
  )
}
