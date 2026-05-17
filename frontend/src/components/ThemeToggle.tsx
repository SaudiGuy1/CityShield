import { useLang } from '../hooks/useLang'
import { useTheme } from '../hooks/useTheme'

/**
 * Sun/moon button. The icon shown is the theme it will switch TO, which is
 * the standard mental model (click the moon to go dark).
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
        width: '2.1rem',
        height: '2.1rem',
        borderRadius: '0.5rem',
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
      }}
    >
      {isDark ? (
        // Click to switch to light → show sun
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        // Click to switch to dark → show moon
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )
}
