import { useLang } from '../../hooks/useLang'
import type { ContentBlock } from '../../data/awarenessContent'

interface Props {
  blocks: ContentBlock[]
}

/**
 * Renders a sequence of typed content blocks defined in awarenessContent.ts.
 * Bilingual: pulls EN/AR strings via useLang().t. Pure presentation; no state.
 */
export default function ContentRenderer({ blocks }: Props) {
  const { t } = useLang()

  return (
    <div>
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'paragraph':
            return (
              <p key={i} style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '0.75rem' }}>
                {t(block.text)}
              </p>
            )

          case 'list': {
            const Tag = block.ordered ? 'ol' : 'ul'
            return (
              <div key={i} style={{ marginBottom: '1rem' }}>
                {block.heading && (
                  <h3 style={{ color: block.headingColor ?? 'var(--text-primary)', marginTop: '0.5rem' }}>
                    {t(block.heading)}
                  </h3>
                )}
                <Tag style={{ color: 'var(--text-secondary)', lineHeight: 2, paddingInlineStart: '1.25rem', marginTop: '0.4rem' }}>
                  {block.items.map((item, j) => <li key={j}>{t(item)}</li>)}
                </Tag>
              </div>
            )
          }

          case 'twocol':
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                {([block.left, block.right] as const).map((col, k) => {
                  const tone = col.tone
                  const bg = tone === 'positive' ? 'rgba(0, 255, 136, 0.08)'
                    : tone === 'negative' ? 'rgba(255, 0, 60, 0.08)'
                    : 'var(--bg-tertiary)'
                  const border = tone === 'positive' ? 'rgba(0, 255, 136, 0.3)'
                    : tone === 'negative' ? 'rgba(255, 0, 60, 0.3)'
                    : 'var(--border-color)'
                  return (
                    <div key={k} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '0.75rem', padding: '1rem' }}>
                      <h3 style={{ color: col.headingColor, marginBottom: '0.5rem' }}>{t(col.heading)}</h3>
                      <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8, paddingInlineStart: '1.25rem' }}>
                        {col.items.map((item, j) => <li key={j}>{t(item)}</li>)}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )

          case 'callout': {
            const tone = block.tone
            const accent = tone === 'danger' ? 'var(--accent-danger)'
              : tone === 'warning' ? 'var(--accent-warning)'
              : tone === 'success' ? 'var(--accent-success)'
              : 'var(--accent-primary)'
            return (
              <div key={i} style={{
                background: 'var(--bg-tertiary)',
                borderRadius: '0.75rem',
                padding: '1rem 1.25rem',
                marginBottom: '0.75rem',
                borderInlineStart: `3px solid ${accent}`,
              }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, lineHeight: 1.7 }}>
                  {block.title && (
                    <strong style={{ color: 'var(--text-primary)', marginInlineEnd: '0.4rem' }}>
                      {t(block.title)}:
                    </strong>
                  )}
                  {t(block.text)}
                </p>
              </div>
            )
          }

          case 'steps':
            return (
              <div key={i} style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                {block.steps.map((s, j) => (
                  <div key={j} style={{ flex: '1 1 220px', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid var(--border-color)', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '-0.75rem', insetInlineStart: '1rem', background: s.color, color: '#fff', width: '1.75rem', height: '1.75rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>{s.number}</div>
                    <h3 style={{ color: s.color, marginTop: '0.5rem' }}>{t(s.title)}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>{t(s.description)}</p>
                  </div>
                ))}
              </div>
            )

          case 'phases':
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                {block.phases.map((p, j) => (
                  <div key={j} style={{ background: 'var(--bg-tertiary)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--border-color)', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '-0.6rem', insetInlineStart: '0.75rem', background: p.color, color: '#fff', width: '1.5rem', height: '1.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>{p.number}</div>
                    <h3 style={{ color: p.color, marginTop: '0.5rem', fontSize: '1rem' }}>{t(p.title)}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>{t(p.description)}</p>
                  </div>
                ))}
              </div>
            )

          case 'columns3':
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {block.columns.map((c, j) => (
                  <div key={j} style={{ background: 'var(--bg-tertiary)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ color: c.titleColor }}>{t(c.title)}</h3>
                    <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8, paddingInlineStart: '1.25rem' }}>
                      {c.points.map((p, k) => <li key={k}>{t(p)}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )

          default:
            return null
        }
      })}
    </div>
  )
}
