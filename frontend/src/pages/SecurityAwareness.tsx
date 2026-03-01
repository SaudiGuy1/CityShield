import { useState } from 'react'

interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: 'You receive an email from "IT Support" asking you to click a link and verify your credentials. The sender address is support@c0mpany-helpdesk.net. What should you do?',
    options: [
      'Click the link — IT Support often sends these requests',
      'Reply to the email asking if it is legitimate',
      'Do not click the link, report it to your security team via the official channel',
      'Forward it to colleagues to check if they received it too',
    ],
    correctIndex: 2,
    explanation: 'Never click links in unsolicited credential requests. The misspelled domain (c0mpany) is a strong indicator of phishing. Report through your official security channel.',
  },
  {
    question: 'Which of the following is the strongest password?',
    options: [
      'P@ssw0rd123',
      'correct-horse-battery-staple',
      'qwerty2024!',
      'Admin@123',
    ],
    correctIndex: 1,
    explanation: 'Long passphrases with random words are far stronger than short passwords with predictable substitutions. "correct-horse-battery-staple" has high entropy and is memorable.',
  },
  {
    question: 'A colleague asks to borrow your USB drive to transfer files from an unknown external laptop. What is the correct response?',
    options: [
      'Allow it — colleagues can be trusted',
      'Allow it but scan the USB afterward',
      'Decline and suggest using an approved file sharing service instead',
      'Allow it only if the laptop has antivirus installed',
    ],
    correctIndex: 2,
    explanation: 'USB drives from uncontrolled devices can introduce malware. Always use approved file-sharing channels. USB-based attacks (e.g., BadUSB) can bypass antivirus.',
  },
  {
    question: 'You discover that a publicly accessible cloud storage link contains internal project documents. What should you do first?',
    options: [
      'Download the files for safekeeping',
      'Share the link with your manager via chat',
      'Report the exposure to your security team immediately',
      'Change the link permissions yourself',
    ],
    correctIndex: 2,
    explanation: 'Report data exposures to your security team immediately. Do not download, redistribute, or attempt to remediate without authorization — you could make the situation worse or violate policy.',
  },
  {
    question: 'Multi-Factor Authentication (MFA) protects your account even if:',
    options: [
      'Your password is written on a sticky note',
      'You use the same password across all services',
      'Your password is compromised in a data breach',
      'You share your MFA code with a trusted colleague',
    ],
    correctIndex: 2,
    explanation: 'MFA adds a second verification layer, so a stolen password alone is not enough for an attacker. However, MFA codes must never be shared — they are proof of your identity.',
  },
]

export default function SecurityAwareness() {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)

  const score = Object.entries(answers).reduce((acc, [qIdx, aIdx]) => {
    return acc + (QUIZ_QUESTIONS[Number(qIdx)].correctIndex === aIdx ? 1 : 0)
  }, 0)
  const passed = score >= 4 // 80% of 5 = 4

  const handleSelect = (questionIndex: number, optionIndex: number) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }))
  }

  const handleSubmit = () => {
    if (Object.keys(answers).length < QUIZ_QUESTIONS.length) return
    setSubmitted(true)
  }

  const handleReset = () => {
    setAnswers({})
    setSubmitted(false)
  }

  return (
    <div className="container" style={{ maxWidth: 900 }}>
      <div className="page-header">
        <div>
          <h1>Security Awareness Training</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '-1rem' }}>
            Mandatory training module for all CityShield personnel
          </p>
        </div>
      </div>

      {/* Section 1 – Introduction */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span style={{
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid var(--accent-primary)',
            borderRadius: '0.5rem',
            padding: '0.35rem 0.75rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--accent-primary)',
          }}>MODULE 1</span>
          <h2 style={{ margin: 0 }}>Why This Matters</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          Human error remains the leading cause of security breaches. According to industry
          research, over 80% of confirmed data breaches involve a human element — whether
          through phishing, credential misuse, or misconfiguration. As operators of critical
          smart city infrastructure, every team member is a potential target and a vital line
          of defense. This training covers the essential security practices that protect both
          you and the systems you manage.
        </p>
      </div>

      {/* Section 2 – Phishing & Social Engineering */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid var(--accent-danger)',
            borderRadius: '0.5rem',
            padding: '0.35rem 0.75rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--accent-danger)',
          }}>MODULE 2</span>
          <h2 style={{ margin: 0 }}>Phishing &amp; Social Engineering</h2>
        </div>

        <h3 style={{ color: 'var(--accent-danger)', marginTop: '0.5rem' }}>Red Flags to Watch For</h3>
        <ul style={{ color: 'var(--text-secondary)', lineHeight: 2, paddingLeft: '1.25rem' }}>
          <li>Urgent or threatening language ("Your account will be locked in 24 hours")</li>
          <li>Sender address that does not match the organization's domain</li>
          <li>Links where the displayed text differs from the actual URL (hover to check)</li>
          <li>Unexpected attachments, especially .exe, .zip, or macro-enabled documents</li>
          <li>Requests for credentials, payment details, or sensitive data via email</li>
        </ul>

        <h3 style={{ color: 'var(--accent-warning)', marginTop: '1.25rem' }}>Realistic Examples</h3>
        <div style={{
          background: 'var(--bg-tertiary)',
          borderRadius: '0.75rem',
          padding: '1rem 1.25rem',
          marginBottom: '0.75rem',
          borderLeft: '3px solid var(--accent-warning)',
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Spear phishing:</strong> "Hi [Name], I'm from the IT help desk.
            We noticed unusual login activity on your CityShield account. Please verify your
            identity by clicking the link below within 30 minutes or your access will be suspended."
          </p>
        </div>
        <div style={{
          background: 'var(--bg-tertiary)',
          borderRadius: '0.75rem',
          padding: '1rem 1.25rem',
          marginBottom: '0.75rem',
          borderLeft: '3px solid var(--accent-warning)',
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Pretexting:</strong> A caller claims to be a vendor technician and
            requests remote access to "update the SCADA firmware." They reference real project
            names obtained from LinkedIn to seem credible.
          </p>
        </div>

        <h3 style={{ color: 'var(--accent-success)', marginTop: '1.25rem' }}>If You Suspect a Phishing Attempt</h3>
        <ol style={{ color: 'var(--text-secondary)', lineHeight: 2, paddingLeft: '1.25rem' }}>
          <li>Do not click any links or open attachments</li>
          <li>Do not reply to the sender</li>
          <li>Report it to your security team using the official reporting channel</li>
          <li>If you already clicked a link or entered credentials, change your password immediately and notify security</li>
        </ol>
      </div>

      {/* Section 3 – Passwords & MFA */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span style={{
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid var(--accent-secondary)',
            borderRadius: '0.5rem',
            padding: '0.35rem 0.75rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--accent-secondary)',
          }}>MODULE 3</span>
          <h2 style={{ margin: 0 }}>Passwords &amp; Multi-Factor Authentication</h2>
        </div>

        <h3>Strong Password Guidelines</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '0.75rem',
            padding: '1rem',
          }}>
            <p style={{ color: 'var(--accent-success)', fontWeight: 600, marginBottom: '0.5rem' }}>Do</p>
            <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
              <li>Use 16+ characters or a 4-word passphrase</li>
              <li>Use a unique password for every account</li>
              <li>Use a password manager (e.g., Bitwarden, 1Password)</li>
              <li>Enable MFA on all accounts that support it</li>
            </ul>
          </div>
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '0.75rem',
            padding: '1rem',
          }}>
            <p style={{ color: 'var(--accent-danger)', fontWeight: 600, marginBottom: '0.5rem' }}>Don't</p>
            <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
              <li>Reuse passwords across services</li>
              <li>Use personal info (birthdays, pet names)</li>
              <li>Store passwords in plaintext (notes, spreadsheets)</li>
              <li>Share passwords via email or chat</li>
            </ul>
          </div>
        </div>

        <h3>Why MFA Matters</h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          Multi-Factor Authentication requires a second verification step beyond your password —
          typically a time-based code from an authenticator app, a hardware security key, or a
          push notification. Even if an attacker obtains your password through phishing or a
          data breach, MFA blocks unauthorized access. Organizations that enforce MFA reduce
          account compromise by over 99%.
        </p>

        <div style={{
          background: 'var(--bg-tertiary)',
          borderRadius: '0.75rem',
          padding: '1rem 1.25rem',
          marginTop: '1rem',
          borderLeft: '3px solid var(--accent-secondary)',
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Recommendation:</strong> Use a dedicated
            password manager to generate and store unique credentials for every service. Preferred
            options: Bitwarden (open source), 1Password, or KeePassXC (offline). Never rely on
            browser-saved passwords as your only method.
          </p>
        </div>
      </div>

      {/* Section 4 – Safe Browsing & Email Safety */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid var(--accent-success)',
            borderRadius: '0.5rem',
            padding: '0.35rem 0.75rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--accent-success)',
          }}>MODULE 4</span>
          <h2 style={{ margin: 0 }}>Safe Browsing &amp; Email Safety</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <h3>Browsing Checklist</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {[
                'Verify HTTPS and valid certificates before entering data',
                'Do not install browser extensions from untrusted sources',
                'Avoid downloading software from unofficial mirrors',
                'Clear session data when using shared or public workstations',
                'Keep your browser and OS up to date',
              ].map((item, i) => (
                <li key={i} style={{
                  color: 'var(--text-secondary)',
                  padding: '0.5rem 0',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  fontSize: '0.9rem',
                  lineHeight: 1.6,
                }}>
                  <span style={{ color: 'var(--accent-success)', fontWeight: 700, flexShrink: 0 }}>&#10003;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Email Safety Checklist</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {[
                'Verify sender identity before acting on requests',
                'Never open unexpected attachments without scanning',
                'Do not use personal email for work communications',
                'Encrypt sensitive documents before sending',
                'Use BCC for large distribution lists with external recipients',
              ].map((item, i) => (
                <li key={i} style={{
                  color: 'var(--text-secondary)',
                  padding: '0.5rem 0',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  fontSize: '0.9rem',
                  lineHeight: 1.6,
                }}>
                  <span style={{ color: 'var(--accent-success)', fontWeight: 700, flexShrink: 0 }}>&#10003;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Section 5 – Data Protection & Handling */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span style={{
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid var(--accent-warning)',
            borderRadius: '0.5rem',
            padding: '0.35rem 0.75rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--accent-warning)',
          }}>MODULE 5</span>
          <h2 style={{ margin: 0 }}>Data Protection &amp; Handling</h2>
        </div>

        <div className="card-grid" style={{ marginBottom: 0 }}>
          <div style={{
            background: 'var(--bg-tertiary)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            border: '1px solid var(--border-color)',
          }}>
            <h3 style={{ color: 'var(--accent-warning)' }}>PII Awareness</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8 }}>
              Personally Identifiable Information includes names, addresses, ID numbers, and
              biometric data. Always classify data before storing or transmitting it. Apply the
              principle of least privilege — only access what your role requires. Anonymize or
              pseudonymize PII in development and testing environments.
            </p>
          </div>
          <div style={{
            background: 'var(--bg-tertiary)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            border: '1px solid var(--border-color)',
          }}>
            <h3 style={{ color: 'var(--accent-warning)' }}>USB &amp; Device Policy</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8 }}>
              Do not connect personal or unverified USB devices to work systems. Removable media
              can carry malware that executes automatically. Use approved file transfer services
              for all data exchange. Report found USB drives to security — do not insert them
              to "check what's on them."
            </p>
          </div>
          <div style={{
            background: 'var(--bg-tertiary)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            border: '1px solid var(--border-color)',
            gridColumn: '1 / -1',
          }}>
            <h3 style={{ color: 'var(--accent-warning)' }}>Cloud Sharing Rules</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8 }}>
              Only share files via approved platforms (e.g., organization-managed cloud storage).
              Set the most restrictive sharing permissions possible — prefer "specific people"
              over "anyone with the link." Review shared links quarterly and revoke access that
              is no longer needed. Never upload classified or restricted data to personal cloud
              accounts.
            </p>
          </div>
        </div>
      </div>

      {/* Section 6 – Incident Reporting */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span style={{
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid var(--accent-primary)',
            borderRadius: '0.5rem',
            padding: '0.35rem 0.75rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--accent-primary)',
          }}>MODULE 6</span>
          <h2 style={{ margin: 0 }}>Incident Reporting</h2>
        </div>

        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.8 }}>
          Timely reporting is critical. A 5-minute delay can be the difference between containing
          an incident and a full-scale breach. Follow this 3-step process:
        </p>

        <div style={{ display: 'flex', gap: '1rem' }}>
          {[
            {
              step: '1',
              title: 'Stop & Preserve',
              desc: 'Disconnect the affected system from the network if safe to do so. Do not power off, delete files, or attempt to "fix" the issue — you may destroy forensic evidence.',
              color: 'var(--accent-danger)',
            },
            {
              step: '2',
              title: 'Report Immediately',
              desc: 'Contact your security team via the designated channel (phone, ticketing system, or in-person). Provide: what happened, when you noticed it, which systems are affected, and any actions you have already taken.',
              color: 'var(--accent-warning)',
            },
            {
              step: '3',
              title: 'Cooperate & Document',
              desc: 'Follow instructions from the incident response team. Write down everything you remember while it is fresh — timestamps, error messages, unusual behavior. Do not discuss the incident on unofficial channels.',
              color: 'var(--accent-success)',
            },
          ].map(s => (
            <div key={s.step} style={{
              flex: 1,
              background: 'var(--bg-tertiary)',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              border: '1px solid var(--border-color)',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute',
                top: '-0.75rem',
                left: '1rem',
                background: s.color,
                color: '#fff',
                width: '1.75rem',
                height: '1.75rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}>{s.step}</div>
              <h3 style={{ color: s.color, marginTop: '0.5rem' }}>{s.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 7 – Knowledge Check */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span style={{
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid var(--accent-secondary)',
            borderRadius: '0.5rem',
            padding: '0.35rem 0.75rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--accent-secondary)',
          }}>ASSESSMENT</span>
          <h2 style={{ margin: 0 }}>Quick Knowledge Check</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Answer all 5 questions to complete the training. A score of 80% or higher is required to pass.
        </p>

        {QUIZ_QUESTIONS.map((q, qIdx) => {
          const userAnswer = answers[qIdx]
          const isCorrect = userAnswer === q.correctIndex

          return (
            <div key={qIdx} style={{
              background: 'var(--bg-tertiary)',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              marginBottom: '1rem',
              border: submitted
                ? `1px solid ${isCorrect ? 'var(--accent-success)' : 'var(--accent-danger)'}`
                : '1px solid var(--border-color)',
            }}>
              <p style={{
                color: 'var(--text-primary)',
                fontWeight: 600,
                marginBottom: '0.75rem',
                lineHeight: 1.6,
              }}>
                <span style={{ color: 'var(--accent-secondary)', marginRight: '0.5rem' }}>Q{qIdx + 1}.</span>
                {q.question}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {q.options.map((opt, oIdx) => {
                  const isSelected = userAnswer === oIdx
                  const isThisCorrect = oIdx === q.correctIndex
                  let borderColor = 'var(--border-color)'
                  let bgColor = 'var(--bg-card)'

                  if (submitted) {
                    if (isThisCorrect) {
                      borderColor = 'var(--accent-success)'
                      bgColor = 'rgba(16, 185, 129, 0.1)'
                    } else if (isSelected && !isThisCorrect) {
                      borderColor = 'var(--accent-danger)'
                      bgColor = 'rgba(239, 68, 68, 0.1)'
                    }
                  } else if (isSelected) {
                    borderColor = 'var(--accent-primary)'
                    bgColor = 'rgba(59, 130, 246, 0.1)'
                  }

                  return (
                    <button
                      key={oIdx}
                      onClick={() => handleSelect(qIdx, oIdx)}
                      style={{
                        background: bgColor,
                        border: `1px solid ${borderColor}`,
                        borderRadius: '0.5rem',
                        padding: '0.75rem 1rem',
                        color: 'var(--text-secondary)',
                        cursor: submitted ? 'default' : 'pointer',
                        textAlign: 'left',
                        fontSize: '0.9rem',
                        lineHeight: 1.5,
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                        width: '100%',
                      }}
                    >
                      <span style={{
                        fontWeight: 600,
                        color: isSelected && !submitted
                          ? 'var(--accent-primary)'
                          : submitted && isThisCorrect
                            ? 'var(--accent-success)'
                            : submitted && isSelected
                              ? 'var(--accent-danger)'
                              : 'var(--text-tertiary)',
                        flexShrink: 0,
                      }}>
                        {String.fromCharCode(65 + oIdx)}.
                      </span>
                      {opt}
                    </button>
                  )
                })}
              </div>
              {submitted && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  background: isCorrect ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  borderLeft: `3px solid ${isCorrect ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
                }}>
                  <p style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    margin: 0,
                    lineHeight: 1.6,
                  }}>
                    <strong style={{ color: isCorrect ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                      {isCorrect ? 'Correct.' : 'Incorrect.'}
                    </strong>{' '}
                    {q.explanation}
                  </p>
                </div>
              )}
            </div>
          )
        })}

        {/* Submit / Results */}
        {!submitted ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={Object.keys(answers).length < QUIZ_QUESTIONS.length}
              style={{
                opacity: Object.keys(answers).length < QUIZ_QUESTIONS.length ? 0.5 : 1,
                cursor: Object.keys(answers).length < QUIZ_QUESTIONS.length ? 'not-allowed' : 'pointer',
              }}
            >
              Submit Answers
            </button>
          </div>
        ) : (
          <div style={{
            marginTop: '1rem',
            padding: '1.25rem',
            borderRadius: '0.75rem',
            background: passed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${passed ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <p style={{
                fontWeight: 700,
                fontSize: '1.1rem',
                color: passed ? 'var(--accent-success)' : 'var(--accent-danger)',
                marginBottom: '0.25rem',
              }}>
                Score: {score}/{QUIZ_QUESTIONS.length} ({Math.round((score / QUIZ_QUESTIONS.length) * 100)}%)
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {passed
                  ? 'You have passed the security awareness assessment.'
                  : 'You did not reach the 80% threshold. Review the material and try again.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {passed && (
                <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
                  COMPLETED
                </span>
              )}
              <button className="btn btn-secondary" onClick={handleReset}>
                {passed ? 'Retake' : 'Try Again'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
