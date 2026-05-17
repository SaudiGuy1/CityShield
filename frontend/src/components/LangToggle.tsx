import { useLang } from '../hooks/useLang'

/**
 * Minimal two-state toggle (EN / ع). Used in the sidebar so the user can
 * switch language globally. Listens to other instances via the shared
 * `cityshield-lang` event so all toggles stay in sync.
 */
export default function LangToggle() {
  const { lang, setLang, tk } = useLang()
  return (
    <div
      role="group"
      aria-label={tk('lang.toggle')}
      style={{
        display: 'inline-flex',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
      }}
    >
      {(['en', 'ar'] as const).map(code => {
        const active = lang === code
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={active}
            style={{
              padding: '0.35rem 0.7rem',
              background: active ? 'var(--accent-primary)' : 'transparent',
              color: active ? 'var(--bg-primary)' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.05em',
            }}
          >
            {code === 'en' ? 'EN' : 'ع'}
          </button>
        )
      })}
    </div>
  )
}
