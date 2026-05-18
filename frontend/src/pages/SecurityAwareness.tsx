import { useMemo, useState } from 'react'
import { useLang } from '../hooks/useLang'
import { useAwarenessProgress } from '../hooks/useAwarenessProgress'
import ContentRenderer from '../components/awareness/ContentRenderer'
import VideoButton from '../components/awareness/VideoButton'
import {
  AWARENESS_CATEGORIES,
  PRE_ASSESSMENT_QUESTIONS,
  type AwarenessCategory,
  type AwarenessQuizQuestion,
} from '../data/awarenessContent'

/* ─── Helpers ─── */

function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function categoryIcon(id: AwarenessCategory['id']) {
  switch (id) {
    case 'employees':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'executives':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 7h-9" />
          <path d="M14 17H5" />
          <circle cx="17" cy="17" r="3" />
          <circle cx="7" cy="7" r="3" />
        </svg>
      )
    case 'it-staff':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      )
  }
}

/* ─── Language toggle ─── */

function LangToggle() {
  const { lang, setLang } = useLang()
  return (
    <div style={{ display: 'inline-flex', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
      {(['en', 'ar'] as const).map(code => {
        const active = lang === code
        return (
          <button
            key={code}
            onClick={() => setLang(code)}
            style={{
              padding: '0.4rem 0.85rem',
              background: active ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              color: active ? '#001018' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.8rem',
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

/* ─── Section Nav ─── */

function SectionNav({ activeSection, onSelect, sections }: {
  activeSection: string
  onSelect: (id: string) => void
  sections: { id: string; label: string }[]
}) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {sections.map(s => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: activeSection === s.id ? 'var(--accent-primary)' : 'var(--border-color)',
            background: activeSection === s.id ? 'rgba(0, 240, 255, 0.12)' : 'var(--bg-tertiary)',
            color: activeSection === s.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            transition: 'all 0.2s',
            boxShadow: activeSection === s.id ? '0 0 12px rgba(0, 240, 255, 0.15)' : 'none',
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}

/* ─── Quiz Section ─── */

function QuizSection({ questions, passThreshold, accentColor, onSubmit }: {
  questions: AwarenessQuizQuestion[]
  passThreshold: number
  accentColor: string
  onSubmit?: (score: number, total: number, passed: boolean) => void
}) {
  const { t, lang } = useLang()
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)

  const score = Object.entries(answers).reduce((acc, [qIdx, aIdx]) => {
    return acc + (questions[Number(qIdx)].correctIndex === aIdx ? 1 : 0)
  }, 0)
  const passed = score >= passThreshold

  const handleSelect = (qi: number, oi: number) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [qi]: oi }))
  }
  const handleSubmit = () => {
    if (Object.keys(answers).length < questions.length) return
    setSubmitted(true)
    onSubmit?.(score, questions.length, passed)
  }
  const handleReset = () => {
    setAnswers({})
    setSubmitted(false)
  }

  const labels = {
    badge: lang === 'ar' ? 'تقييم' : 'ASSESSMENT',
    heading: lang === 'ar' ? 'اختبار المعرفة' : 'Knowledge Check',
    intro: lang === 'ar'
      ? `أجب على جميع الأسئلة (${questions.length}). تحتاج إلى ${Math.round((passThreshold / questions.length) * 100)}% أو أكثر للنجاح.`
      : `Answer all ${questions.length} questions. A score of ${Math.round((passThreshold / questions.length) * 100)}% or higher is required to pass.`,
    submit: lang === 'ar' ? 'تقديم الإجابات' : 'Submit Answers',
    correct: lang === 'ar' ? 'إجابة صحيحة.' : 'Correct.',
    incorrect: lang === 'ar' ? 'إجابة خاطئة.' : 'Incorrect.',
    passed: lang === 'ar' ? 'لقد اجتزت التقييم.' : 'You have passed the assessment.',
    failed: lang === 'ar'
      ? `لم تصل إلى نسبة النجاح ${Math.round((passThreshold / questions.length) * 100)}%. راجع المادة وحاول مرة أخرى.`
      : `You did not reach the ${Math.round((passThreshold / questions.length) * 100)}% threshold. Review the material and try again.`,
    score: lang === 'ar' ? 'النتيجة' : 'Score',
    retake: lang === 'ar' ? 'إعادة' : 'Retake',
    tryAgain: lang === 'ar' ? 'حاول مرة أخرى' : 'Try Again',
    passedBadge: lang === 'ar' ? 'ناجح' : 'PASSED',
  }

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <span style={{
          background: 'rgba(191, 0, 255, 0.15)',
          border: '1px solid var(--accent-secondary)',
          borderRadius: '0.5rem',
          padding: '0.35rem 0.75rem',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'var(--accent-secondary)',
        }}>{labels.badge}</span>
        <h2 style={{ margin: 0 }}>{labels.heading}</h2>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{labels.intro}</p>

      {questions.map((q, qIdx) => {
        const userAnswer = answers[qIdx]
        const isCorrect = userAnswer === q.correctIndex
        return (
          <div key={q.id} style={{
            background: 'var(--bg-tertiary)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            marginBottom: '1rem',
            border: submitted
              ? `1px solid ${isCorrect ? 'var(--accent-success)' : 'var(--accent-danger)'}`
              : '1px solid var(--border-color)',
          }}>
            <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.75rem', lineHeight: 1.6 }}>
              <span style={{ color: accentColor, marginInlineEnd: '0.5rem' }}>Q{qIdx + 1}.</span>
              {t(q.question)}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {q.options.map((opt, oIdx) => {
                const isSelected = userAnswer === oIdx
                const isThisCorrect = oIdx === q.correctIndex
                let borderColor = 'var(--border-color)'
                let bgColor = 'var(--bg-card)'
                if (submitted) {
                  if (isThisCorrect) { borderColor = 'var(--accent-success)'; bgColor = 'rgba(0, 255, 136, 0.1)' }
                  else if (isSelected) { borderColor = 'var(--accent-danger)'; bgColor = 'rgba(255, 0, 60, 0.1)' }
                } else if (isSelected) { borderColor = accentColor; bgColor = 'rgba(0, 240, 255, 0.08)' }

                return (
                  <button key={oIdx} onClick={() => handleSelect(qIdx, oIdx)} style={{
                    background: bgColor, border: `1px solid ${borderColor}`, borderRadius: '0.5rem',
                    padding: '0.75rem 1rem', color: 'var(--text-secondary)', cursor: submitted ? 'default' : 'pointer',
                    textAlign: 'start', fontSize: '0.9rem', lineHeight: 1.5, transition: 'all 0.2s',
                    display: 'flex', alignItems: 'flex-start', gap: '0.5rem', width: '100%',
                  }}>
                    <span style={{
                      fontWeight: 600, flexShrink: 0,
                      color: isSelected && !submitted ? accentColor
                        : submitted && isThisCorrect ? 'var(--accent-success)'
                        : submitted && isSelected ? 'var(--accent-danger)'
                        : 'var(--text-tertiary)',
                    }}>
                      {String.fromCharCode(65 + oIdx)}.
                    </span>
                    {t(opt)}
                  </button>
                )
              })}
            </div>
            {submitted && (
              <div style={{
                marginTop: '0.75rem', padding: '0.75rem 1rem', borderRadius: '0.5rem',
                background: isCorrect ? 'rgba(0, 255, 136, 0.08)' : 'rgba(255, 0, 60, 0.08)',
                borderInlineStart: `3px solid ${isCorrect ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
              }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                  <strong style={{ color: isCorrect ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                    {isCorrect ? labels.correct : labels.incorrect}
                  </strong>{' '}{t(q.explanation)}
                </p>
              </div>
            )}
          </div>
        )
      })}

      {!submitted ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="btn btn-primary" onClick={handleSubmit}
            disabled={Object.keys(answers).length < questions.length}
            style={{
              opacity: Object.keys(answers).length < questions.length ? 0.5 : 1,
              cursor: Object.keys(answers).length < questions.length ? 'not-allowed' : 'pointer',
            }}>
            {labels.submit}
          </button>
        </div>
      ) : (
        <div style={{
          marginTop: '1rem', padding: '1.25rem', borderRadius: '0.75rem',
          background: passed ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 0, 60, 0.1)',
          border: `1px solid ${passed ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem',
        }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '1.1rem', color: passed ? 'var(--accent-success)' : 'var(--accent-danger)', marginBottom: '0.25rem' }}>
              {labels.score}: {score}/{questions.length} ({Math.round((score / questions.length) * 100)}%)
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {passed ? labels.passed : labels.failed}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {passed && <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>{labels.passedBadge}</span>}
            <button className="btn btn-secondary" onClick={handleReset}>{passed ? labels.retake : labels.tryAgain}</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Pre-Assessment ─── */

function PreAssessment({ onRecommend }: { onRecommend: (weakCategories: string[]) => void }) {
  const { t, lang } = useLang()
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)

  const submit = () => {
    const weak = Array.from(new Set(
      PRE_ASSESSMENT_QUESTIONS
        .filter(q => answers[q.id] !== q.correctIndex)
        .map(q => q.category)
    ))
    setSubmitted(true)
    onRecommend(weak)
  }

  const labels = {
    badge: lang === 'ar' ? 'تقييم أولي' : 'PRE-ASSESSMENT',
    heading: lang === 'ar' ? 'حدد نقاط ضعفك' : 'Identify Your Weak Areas',
    intro: lang === 'ar'
      ? 'أجب على هذه الأسئلة السريعة لاكتشاف الموضوعات التي ينبغي عليك التركيز عليها أولاً.'
      : 'Answer these quick questions to see which topics you should focus on first.',
    submit: lang === 'ar' ? 'احسب التوصيات' : 'Compute Recommendations',
    resultGood: lang === 'ar' ? 'أداء رائع — لا توجد نقاط ضعف واضحة.' : 'Strong baseline — no obvious weak areas detected.',
    resultWeak: lang === 'ar' ? 'الموضوعات الموصى بمراجعتها:' : 'Topics recommended for review:',
  }

  const weakNow = submitted
    ? PRE_ASSESSMENT_QUESTIONS
        .filter(q => answers[q.id] !== q.correctIndex)
    : []

  const uniqueWeakLabels = Array.from(
    new Map(weakNow.map(q => [q.category, q.categoryLabel])).values()
  )

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <span style={{
          background: 'rgba(0, 240, 255, 0.15)',
          border: '1px solid var(--accent-primary)',
          borderRadius: '0.5rem',
          padding: '0.35rem 0.75rem',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'var(--accent-primary)',
        }}>{labels.badge}</span>
        <h2 style={{ margin: 0 }}>{labels.heading}</h2>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>{labels.intro}</p>

      {PRE_ASSESSMENT_QUESTIONS.map((q, qIdx) => {
        const ua = answers[q.id]
        return (
          <div key={q.id} style={{
            background: 'var(--bg-tertiary)',
            borderRadius: '0.75rem',
            padding: '1rem 1.25rem',
            marginBottom: '0.75rem',
            border: '1px solid var(--border-color)',
          }}>
            <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.5rem', lineHeight: 1.6 }}>
              <span style={{ color: 'var(--accent-primary)', marginInlineEnd: '0.5rem' }}>Q{qIdx + 1}.</span>
              {t(q.question)}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {q.options.map((opt, oIdx) => {
                const sel = ua === oIdx
                return (
                  <button
                    key={oIdx}
                    onClick={() => !submitted && setAnswers(p => ({ ...p, [q.id]: oIdx }))}
                    style={{
                      background: sel ? 'rgba(0, 240, 255, 0.1)' : 'var(--bg-card)',
                      border: `1px solid ${sel ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      borderRadius: '0.5rem',
                      padding: '0.5rem 0.85rem',
                      textAlign: 'start',
                      color: 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      cursor: submitted ? 'default' : 'pointer',
                    }}
                  >
                    {String.fromCharCode(65 + oIdx)}. {t(opt)}
                  </button>
                )
              })}
            </div>
            {submitted && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: '0.5rem 0 0 0', lineHeight: 1.5 }}>
                {t(q.explanation)}
              </p>
            )}
          </div>
        )
      })}

      {!submitted ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button
            className="btn btn-primary"
            disabled={Object.keys(answers).length < PRE_ASSESSMENT_QUESTIONS.length}
            onClick={submit}
            style={{
              opacity: Object.keys(answers).length < PRE_ASSESSMENT_QUESTIONS.length ? 0.5 : 1,
            }}
          >
            {labels.submit}
          </button>
        </div>
      ) : (
        <div style={{
          marginTop: '0.75rem',
          padding: '1rem 1.25rem',
          borderRadius: '0.75rem',
          background: 'var(--bg-tertiary)',
          borderInlineStart: '3px solid var(--accent-primary)',
        }}>
          {uniqueWeakLabels.length === 0 ? (
            <p style={{ color: 'var(--accent-success)', margin: 0 }}>{labels.resultGood}</p>
          ) : (
            <>
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, margin: '0 0 0.5rem 0' }}>{labels.resultWeak}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {uniqueWeakLabels.map((lbl, i) => (
                  <span key={i} style={{
                    padding: '0.25rem 0.7rem',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    background: 'rgba(255, 170, 0, 0.12)',
                    border: '1px solid rgba(255, 170, 0, 0.4)',
                    color: 'var(--accent-warning)',
                  }}>{t(lbl)}</span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Main Page ─── */

export default function SecurityAwareness() {
  const { lang, t, dir } = useLang()
  const { summary, record } = useAwarenessProgress()
  const [activeCategoryId, setActiveCategoryId] = useState<AwarenessCategory['id']>(AWARENESS_CATEGORIES[0].id)
  const [activeSection, setActiveSection] = useState('training')
  const [weakCategories, setWeakCategories] = useState<string[]>(
    () => [],
  )

  const category = useMemo(
    () => AWARENESS_CATEGORIES.find(c => c.id === activeCategoryId)!,
    [activeCategoryId],
  )

  // Seed weak categories from the most recent persisted pre-assessment.
  useMemo(() => {
    if (summary?.last_pre_assessment_weak_categories?.length && weakCategories.length === 0) {
      setWeakCategories(summary.last_pre_assessment_weak_categories)
    }
    // We intentionally only react to summary; setWeakCategories is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary])

  const categorySummary = summary?.categories.find(c => c.category_id === activeCategoryId)

  const handleCategoryChange = (id: AwarenessCategory['id']) => {
    setActiveCategoryId(id)
    setActiveSection('training')
  }

  const handleQuizSubmit = (score: number, total: number, passed: boolean) => {
    void record({
      event_type: 'quiz_submit',
      category_id: activeCategoryId,
      quiz_score: score,
      quiz_total: total,
      passed,
      lang,
    })
  }

  const handlePreAssessmentSubmit = (weak: string[]) => {
    setWeakCategories(weak)
    void record({
      event_type: 'pre_assessment_submit',
      category_id: activeCategoryId,
      pre_assessment_weak_categories: weak,
      lang,
    })
  }

  const labels = {
    title: lang === 'ar' ? 'تدريب التوعية الأمنية' : 'Security Awareness Training',
    subtitle: lang === 'ar'
      ? 'وحدات تدريبية حسب الدور لجميع موظفي المدينة الذكية'
      : 'Role-based training modules for all smart city personnel',
    modulesCount: (n: number, q: number) => lang === 'ar'
      ? `${n} وحدات · ${q} أسئلة`
      : `${n} modules · ${q} questions`,
    track: lang === 'ar' ? 'مسار' : 'Track',
    sections: {
      pre: lang === 'ar' ? 'تقييم أولي' : 'Pre-Assessment',
      training: lang === 'ar' ? 'الوحدات التدريبية' : 'Training Modules',
      scenarios: lang === 'ar' ? 'سيناريوهات' : 'Example Scenarios',
      quiz: lang === 'ar' ? 'اختبار التقييم' : 'Assessment Quiz',
    },
    scenariosBadge: lang === 'ar' ? 'سيناريوهات' : 'SCENARIOS',
    scenariosHeading: lang === 'ar' ? 'أمثلة هجمات واقعية' : 'Real-World Attack Examples',
    scenariosIntro: (label: string) => lang === 'ar'
      ? `توضح هذه السيناريوهات أنواع الهجمات التي تستهدف الأفراد في دور ${label}. فهم آلية وقوعها هو مفتاح الوقاية منها.`
      : `These scenarios illustrate the types of attacks that target personnel in the ${label} role. Understanding how these attacks unfold is key to recognising and preventing them.`,
    recommendedHeading: lang === 'ar' ? 'مقترحات بناءً على نقاط ضعفك:' : 'Recommended based on your weak areas:',
  }

  const recommendedTopics = category.topics.filter(top => weakCategories.includes(top.category))

  return (
    <div className="container" style={{ maxWidth: 960 }} dir={dir}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <h1>{labels.title}</h1>
        </div>
        <LangToggle />
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        {AWARENESS_CATEGORIES.map(cat => {
          const isActive = cat.id === activeCategoryId
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem 1.25rem',
                borderRadius: '0.75rem',
                border: `1px solid ${isActive ? cat.color : 'var(--border-color)'}`,
                background: isActive ? hexAlpha(cat.hex, 0.12) : 'var(--glass-bg)',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                position: 'relative',
                overflow: 'hidden',
                ...(isActive ? { boxShadow: `0 0 20px ${hexAlpha(cat.hex, 0.2)}` } : {}),
              }}
            >
              <div style={{
                width: '2.5rem', height: '2.5rem', borderRadius: '0.625rem',
                background: isActive ? hexAlpha(cat.hex, 0.2) : 'var(--bg-tertiary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isActive ? cat.color : 'var(--text-tertiary)',
                flexShrink: 0,
                transition: 'all 0.25s ease',
              }}>
                {categoryIcon(cat.id)}
              </div>
              <div style={{ textAlign: 'start' }}>
                <div style={{
                  fontWeight: 700, fontSize: '0.95rem',
                  color: isActive ? cat.color : 'var(--text-primary)',
                  fontFamily: "'Orbitron', sans-serif",
                  letterSpacing: '0.03em',
                  transition: 'color 0.25s ease',
                }}>
                  {t(cat.label)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
                  {labels.modulesCount(cat.modules.length, cat.quiz.length)}
                </div>
              </div>
              {isActive && (
                <div style={{
                  position: 'absolute', bottom: 0, insetInlineStart: '10%', insetInlineEnd: '10%',
                  height: '2px', background: cat.color, boxShadow: `0 0 8px ${cat.color}`, borderRadius: '1px',
                }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Category Description Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{
            width: '3rem', height: '3rem', borderRadius: '0.75rem',
            background: hexAlpha(category.hex, 0.15),
            border: `1px solid ${hexAlpha(category.hex, 0.3)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: category.color, flexShrink: 0,
          }}>
            {categoryIcon(category.id)}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>
              {t(category.label)} {labels.track}
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 1rem 0' }}>
              {t(category.description)}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {category.topics.map(topic => {
                const isRecommended = weakCategories.includes(topic.category)
                return (
                  <span key={topic.id} style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: isRecommended ? 'rgba(255, 170, 0, 0.18)' : hexAlpha(category.hex, 0.1),
                    border: `1px solid ${isRecommended ? 'rgba(255, 170, 0, 0.5)' : hexAlpha(category.hex, 0.25)}`,
                    color: isRecommended ? 'var(--accent-warning)' : category.color,
                    letterSpacing: '0.03em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}>
                    {t(topic.label)}
                    <VideoButton videoKey={topic.videoKey} size="small" />
                  </span>
                )
              })}
            </div>
            {recommendedTopics.length > 0 && (
              <p style={{ color: 'var(--accent-warning)', fontSize: '0.8rem', margin: '0.75rem 0 0 0' }}>
                {labels.recommendedHeading}{' '}
                {recommendedTopics.map(rt => t(rt.label)).join(' · ')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div style={{ marginBottom: '1.5rem' }}>
        <SectionNav
          activeSection={activeSection}
          onSelect={setActiveSection}
          sections={[
            { id: 'pre', label: labels.sections.pre },
            { id: 'training', label: labels.sections.training },
            { id: 'scenarios', label: labels.sections.scenarios },
            { id: 'quiz', label: labels.sections.quiz },
          ]}
        />
      </div>

      {activeSection === 'pre' && (
        <PreAssessment onRecommend={handlePreAssessmentSubmit} />
      )}

      {/* Training Modules */}
      {activeSection === 'training' && (
        <>
          {category.modules.map(mod => {
            const moduleViewed = categorySummary?.modules_viewed.includes(mod.id)
            return (
              <div key={mod.id} className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <span style={{
                    background: mod.badgeBg,
                    border: `1px solid ${mod.badgeColor}`,
                    borderRadius: '0.5rem',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: mod.badgeColor,
                  }}>
                    {t(mod.badge)}
                  </span>
                  <h2 style={{ margin: 0 }}>{t(mod.title)}</h2>
                  {moduleViewed && (
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '0.4rem',
                      background: 'rgba(0, 255, 136, 0.15)',
                      color: 'var(--accent-success)',
                      border: '1px solid rgba(0, 255, 136, 0.4)',
                    }}>
                      {lang === 'ar' ? 'مكتمل' : 'VIEWED'}
                    </span>
                  )}
                  <div style={{ marginInlineStart: 'auto', display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => record(
                        { event_type: 'module_view', category_id: activeCategoryId, module_id: mod.id, lang },
                        { dedupeKey: `module:${activeCategoryId}:${mod.id}` },
                      )}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-tertiary)',
                        borderRadius: '0.5rem',
                        padding: '0.3rem 0.65rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      {lang === 'ar' ? 'تم الإطلاع' : 'Mark Viewed'}
                    </button>
                    <VideoButton videoKey={mod.videoKey} size="small" />
                  </div>
                </div>

                {mod.concepts.map((concept, idx) => (
                  <div key={concept.id} style={{ marginBottom: idx === mod.concepts.length - 1 ? 0 : '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{t(concept.title)}</h3>
                      {concept.videoKey && <VideoButton videoKey={concept.videoKey} size="small" />}
                    </div>
                    <ContentRenderer blocks={concept.body} />
                  </div>
                ))}
              </div>
            )
          })}
        </>
      )}

      {/* Scenarios */}
      {activeSection === 'scenarios' && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <span style={{
              background: hexAlpha(category.hex, 0.15),
              border: `1px solid ${category.color}`,
              borderRadius: '0.5rem',
              padding: '0.35rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: category.color,
            }}>{labels.scenariosBadge}</span>
            <h2 style={{ margin: 0 }}>{labels.scenariosHeading}</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.7 }}>
            {labels.scenariosIntro(t(category.label))}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {category.scenarios.map((sc, idx) => (
              <div key={sc.id} style={{
                background: 'var(--bg-tertiary)',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                borderInlineStart: `3px solid ${sc.color}`,
                transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{
                    background: sc.color,
                    color: '#fff',
                    width: '1.75rem',
                    height: '1.75rem',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    flexShrink: 0,
                  }}>
                    {idx + 1}
                  </div>
                  <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>{t(sc.title)}</h3>
                  <div style={{ marginInlineStart: 'auto' }}>
                    <VideoButton videoKey={sc.videoKey} size="small" />
                  </div>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7, margin: 0, paddingInlineStart: '2.5rem' }}>
                  {t(sc.description)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quiz */}
      {activeSection === 'quiz' && (
        <QuizSection
          key={category.id + ':' + lang}
          questions={category.quiz}
          passThreshold={category.passThreshold}
          accentColor={category.color}
          onSubmit={handleQuizSubmit}
        />
      )}
    </div>
  )
}

