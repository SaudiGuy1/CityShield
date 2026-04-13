import { useState } from 'react'

/* ─── Types ─── */

interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

interface TrainingScenario {
  title: string
  description: string
  color: string
}

interface TrainingModule {
  id: string
  badge: string
  badgeColor: string
  badgeBg: string
  title: string
  content: JSX.Element
}

interface RoleCategory {
  id: string
  label: string
  icon: JSX.Element
  color: string
  hex: string
  description: string
  topics: string[]
  modules: TrainingModule[]
  scenarios: TrainingScenario[]
  quiz: QuizQuestion[]
  passThreshold: number
}

/** Convert hex color + opacity (0-1) to rgba string */
function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/* ─── Quiz Data ─── */

const EMPLOYEE_QUIZ: QuizQuestion[] = [
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
    explanation: 'Report data exposures to your security team immediately. Do not download, redistribute, or attempt to remediate without authorization.',
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
    explanation: 'MFA adds a second verification layer, so a stolen password alone is not enough for an attacker. However, MFA codes must never be shared.',
  },
]

const EXECUTIVE_QUIZ: QuizQuestion[] = [
  {
    question: 'Your CFO emails you urgently requesting a wire transfer to a new vendor, citing a confidential acquisition. The email looks legitimate. What should you do?',
    options: [
      'Process the transfer immediately given the urgency',
      'Reply to the email to confirm the details',
      'Verify the request through a separate communication channel (phone call, in-person)',
      'Forward the email to the finance team to handle',
    ],
    correctIndex: 2,
    explanation: 'Business Email Compromise (BEC) attacks impersonate executives to authorize fraudulent transfers. Always verify unusual financial requests via a separate, trusted channel — never reply to the same email thread.',
  },
  {
    question: 'During a board meeting, a member suggests discussing sensitive M&A details over a popular consumer messaging app. What is the appropriate response?',
    options: [
      'Agree — the app uses end-to-end encryption',
      'Suggest moving the discussion to an approved enterprise communication platform',
      'Continue but avoid naming specific companies',
      'It is fine as long as messages are deleted afterward',
    ],
    correctIndex: 1,
    explanation: 'Consumer apps are not governed by enterprise data retention, compliance, or DLP policies. Sensitive business discussions must use approved enterprise platforms with proper audit trails.',
  },
  {
    question: 'A journalist contacts you about a rumoured data breach at your organisation. You have not been briefed by the security team. What do you do?',
    options: [
      'Deny the breach to protect the company\'s reputation',
      'Provide limited information to control the narrative',
      'Decline to comment and immediately notify your legal and communications team',
      'Confirm the breach to appear transparent',
    ],
    correctIndex: 2,
    explanation: 'Unauthorized disclosure — even denial — can have legal and regulatory consequences. All incident-related communications must be coordinated through legal and PR teams.',
  },
  {
    question: 'Your organisation is evaluating a new SaaS vendor. Which security consideration is MOST critical for the executive decision?',
    options: [
      'The vendor offers the lowest price',
      'The vendor has SOC 2 Type II certification and clear data residency policies',
      'The vendor\'s CEO is a known industry figure',
      'The vendor was recommended by a partner company',
    ],
    correctIndex: 1,
    explanation: 'Third-party risk is a board-level concern. SOC 2 Type II verifies ongoing security controls, and data residency policies ensure compliance with regulations like GDPR.',
  },
  {
    question: 'An attacker who gains access to an executive\'s email account is MOST dangerous because:',
    options: [
      'Executives have the most complex passwords',
      'Executive accounts can authorize financial transactions and access strategic data',
      'Executive emails contain the most attachments',
      'Executives rarely use MFA',
    ],
    correctIndex: 1,
    explanation: 'Executive accounts are high-value targets (whaling) because they can authorize wire transfers, access confidential strategy documents, and impersonate leadership to manipulate employees.',
  },
]

const IT_QUIZ: QuizQuestion[] = [
  {
    question: 'A developer requests temporary admin access to a production database for debugging. What is the correct approach?',
    options: [
      'Grant permanent admin access to avoid repeated requests',
      'Grant time-limited access with logging enabled and require a change ticket',
      'Let them use a shared admin account',
      'Deny the request entirely — developers should never touch production',
    ],
    correctIndex: 1,
    explanation: 'Follow the principle of least privilege with time-bound access. Require a change ticket for audit trails, enable session logging, and revoke access automatically after the window expires.',
  },
  {
    question: 'You discover that a critical server has been running with default credentials for 6 months. What is the FIRST action?',
    options: [
      'Change the credentials immediately and close the ticket',
      'Investigate whether the credentials were exploited before changing them',
      'Report it to management and wait for instructions',
      'Shut down the server to prevent further exposure',
    ],
    correctIndex: 1,
    explanation: 'Before remediating, investigate for indicators of compromise. Changing credentials without checking for existing access could allow an attacker with a backdoor to persist undetected.',
  },
  {
    question: 'During an incident, you identify a compromised host beaconing to a C2 server. What is the preferred containment approach?',
    options: [
      'Immediately power off the machine',
      'Isolate the host from the network while keeping it running for forensic analysis',
      'Block the C2 IP at the firewall and continue monitoring',
      'Reimage the machine immediately',
    ],
    correctIndex: 1,
    explanation: 'Network isolation preserves forensic evidence (memory, running processes, network connections) while stopping lateral movement. Powering off destroys volatile memory evidence.',
  },
  {
    question: 'A security scan reveals a critical CVE in a production dependency. The patch requires a major version upgrade that may break compatibility. What should you do?',
    options: [
      'Apply the patch immediately to production',
      'Ignore it — the vulnerability is theoretical',
      'Assess exploitability, apply compensating controls if needed, and schedule a tested upgrade',
      'Roll back to an older version that is not affected',
    ],
    correctIndex: 2,
    explanation: 'Critical CVEs require risk-based assessment: check if the vulnerability is exploitable in your environment, apply WAF rules or network controls as compensating measures, then plan a tested upgrade.',
  },
  {
    question: 'Which logging practice is MOST effective for detecting privilege escalation attempts?',
    options: [
      'Logging all HTTP 200 responses',
      'Logging failed login attempts only',
      'Logging all privilege changes, sudo usage, and access to sensitive resources with correlation',
      'Logging disk usage metrics',
    ],
    correctIndex: 2,
    explanation: 'Privilege escalation detection requires visibility into authorization changes (role assignments, sudo events, sensitive file access) with correlation to identify attack chains across multiple events.',
  },
]

/* ─── Role Category Definitions ─── */

function buildCategories(): RoleCategory[] {
  return [
    {
      id: 'employees',
      label: 'Employees',
      color: 'var(--accent-primary)',
      hex: '#00f0ff',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      description: 'Foundational security training for all organisation personnel. Covers the essential threats and best practices every employee must understand to protect themselves and the systems they use daily.',
      topics: ['Phishing & Social Engineering', 'Passwords & MFA', 'Safe Browsing & Email', 'Data Protection', 'Incident Reporting'],
      modules: buildEmployeeModules(),
      scenarios: [
        { title: 'Spear Phishing Email', description: 'An attacker impersonates IT Support and sends a credential-harvesting link disguised as a password reset. The email references the target by name and cites a real internal project.', color: 'var(--accent-danger)' },
        { title: 'USB Drop Attack', description: 'A branded USB drive labelled "Q4 Salary Review" is left in the car park. An employee plugs it in, executing a hidden payload that establishes a reverse shell.', color: 'var(--accent-warning)' },
        { title: 'Pretexting Phone Call', description: 'A caller claims to be a vendor technician needing remote access to "update the SCADA firmware." They reference real project names obtained from LinkedIn.', color: 'var(--accent-secondary)' },
      ],
      quiz: EMPLOYEE_QUIZ,
      passThreshold: 4,
    },
    {
      id: 'executives',
      label: 'Executives',
      color: 'var(--accent-warning)',
      hex: '#ffaa00',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 7h-9" />
          <path d="M14 17H5" />
          <circle cx="17" cy="17" r="3" />
          <circle cx="7" cy="7" r="3" />
        </svg>
      ),
      description: 'Strategic security awareness for senior leadership and decision-makers. Focuses on high-value targeted attacks, regulatory obligations, and the business impact of security decisions.',
      topics: ['Business Email Compromise (BEC)', 'Whaling & Targeted Attacks', 'Third-Party & Supply Chain Risk', 'Regulatory & Compliance Obligations', 'Incident Communication & Crisis Management'],
      modules: buildExecutiveModules(),
      scenarios: [
        { title: 'CEO Fraud / BEC Attack', description: 'An attacker compromises or spoofs the CEO\'s email account and sends an urgent wire transfer request to the finance team, citing a confidential acquisition that must close today.', color: 'var(--accent-danger)' },
        { title: 'Board-Level Whaling', description: 'A threat actor creates a fake board portal login page and sends personalised invitations to board members before a quarterly meeting, harvesting credentials for strategic document access.', color: 'var(--accent-warning)' },
        { title: 'Supply Chain Compromise Briefing', description: 'A trusted SaaS vendor suffers a breach, exposing API keys that grant access to your organisation\'s data. The executive team must decide on disclosure timing and remediation strategy.', color: 'var(--accent-secondary)' },
      ],
      quiz: EXECUTIVE_QUIZ,
      passThreshold: 4,
    },
    {
      id: 'it-staff',
      label: 'IT / Technical',
      color: 'var(--accent-success)',
      hex: '#00ff88',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      ),
      description: 'Advanced security training for IT administrators, developers, and security engineers. Covers operational security, hardening, monitoring, and incident response procedures.',
      topics: ['Secure Configuration & Hardening', 'Monitoring & Log Analysis', 'Incident Response Procedures', 'Privilege Management & Access Control', 'Vulnerability & Patch Management'],
      modules: buildITModules(),
      scenarios: [
        { title: 'Misconfigured Cloud Storage', description: 'An S3 bucket containing customer PII is discovered publicly accessible due to a Terraform misconfiguration. The team must contain the exposure, assess data loss, and coordinate disclosure.', color: 'var(--accent-danger)' },
        { title: 'Privilege Escalation via Service Account', description: 'An attacker gains access to a low-privilege service account and exploits overly permissive IAM roles to escalate to admin. Detection depends on proper audit logging of role assumption events.', color: 'var(--accent-warning)' },
        { title: 'Insider Threat — Data Exfiltration', description: 'A disgruntled employee with database access begins exporting large volumes of customer data to a personal cloud account outside business hours. DLP and UEBA must catch the anomaly.', color: 'var(--accent-secondary)' },
      ],
      quiz: IT_QUIZ,
      passThreshold: 4,
    },
  ]
}

/* ─── Module Content Builders ─── */

function buildEmployeeModules(): TrainingModule[] {
  return [
    {
      id: 'emp-1', badge: 'MODULE 1', title: 'Why This Matters',
      badgeColor: 'var(--accent-primary)', badgeBg: 'rgba(0, 240, 255, 0.15)',
      content: (
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          Human error remains the leading cause of security breaches. Over 80% of confirmed data
          breaches involve a human element — phishing, credential misuse, or misconfiguration. As
          operators of critical smart city infrastructure, every team member is a potential target
          and a vital line of defence. This training covers the essential practices that protect
          both you and the systems you manage.
        </p>
      ),
    },
    {
      id: 'emp-2', badge: 'MODULE 2', title: 'Phishing & Social Engineering',
      badgeColor: 'var(--accent-danger)', badgeBg: 'rgba(255, 0, 60, 0.15)',
      content: (
        <>
          <h3 style={{ color: 'var(--accent-danger)', marginTop: '0.5rem' }}>Red Flags to Watch For</h3>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: 2, paddingLeft: '1.25rem' }}>
            <li>Urgent or threatening language ("Your account will be locked in 24 hours")</li>
            <li>Sender address that does not match the organisation's domain</li>
            <li>Links where the displayed text differs from the actual URL (hover to check)</li>
            <li>Unexpected attachments, especially .exe, .zip, or macro-enabled documents</li>
            <li>Requests for credentials, payment details, or sensitive data via email</li>
          </ul>
          <h3 style={{ color: 'var(--accent-success)', marginTop: '1.25rem' }}>If You Suspect Phishing</h3>
          <ol style={{ color: 'var(--text-secondary)', lineHeight: 2, paddingLeft: '1.25rem' }}>
            <li>Do not click any links or open attachments</li>
            <li>Do not reply to the sender</li>
            <li>Report it to your security team via the official channel</li>
            <li>If you already clicked a link, change your password and notify security immediately</li>
          </ol>
        </>
      ),
    },
    {
      id: 'emp-3', badge: 'MODULE 3', title: 'Passwords & Multi-Factor Authentication',
      badgeColor: 'var(--accent-secondary)', badgeBg: 'rgba(191, 0, 255, 0.15)',
      content: (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ background: 'rgba(0, 255, 136, 0.08)', border: '1px solid rgba(0, 255, 136, 0.3)', borderRadius: '0.75rem', padding: '1rem' }}>
              <p style={{ color: 'var(--accent-success)', fontWeight: 600, marginBottom: '0.5rem' }}>Do</p>
              <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
                <li>Use 16+ characters or a 4-word passphrase</li>
                <li>Use a unique password for every account</li>
                <li>Use a password manager</li>
                <li>Enable MFA on all accounts</li>
              </ul>
            </div>
            <div style={{ background: 'rgba(255, 0, 60, 0.08)', border: '1px solid rgba(255, 0, 60, 0.3)', borderRadius: '0.75rem', padding: '1rem' }}>
              <p style={{ color: 'var(--accent-danger)', fontWeight: 600, marginBottom: '0.5rem' }}>Don't</p>
              <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
                <li>Reuse passwords across services</li>
                <li>Use personal info (birthdays, pet names)</li>
                <li>Store passwords in plaintext</li>
                <li>Share passwords via email or chat</li>
              </ul>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            MFA requires a second verification step beyond your password. Even if an attacker
            obtains your password, MFA blocks unauthorized access. Organisations that enforce
            MFA reduce account compromise by over 99%.
          </p>
        </>
      ),
    },
    {
      id: 'emp-4', badge: 'MODULE 4', title: 'Data Protection & Incident Reporting',
      badgeColor: 'var(--accent-warning)', badgeBg: 'rgba(255, 170, 0, 0.15)',
      content: (
        <>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '1rem' }}>
            Classify data before storing or transmitting. Apply the principle of least privilege.
            Do not connect personal USB devices to work systems. Only share files via approved platforms.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {[
              { step: '1', title: 'Stop & Preserve', desc: 'Disconnect the affected system if safe. Do not power off or delete files — preserve forensic evidence.', color: 'var(--accent-danger)' },
              { step: '2', title: 'Report Immediately', desc: 'Contact your security team. Provide: what happened, when, which systems, and any actions taken.', color: 'var(--accent-warning)' },
              { step: '3', title: 'Cooperate & Document', desc: 'Follow instructions from incident response. Write down everything while it is fresh.', color: 'var(--accent-success)' },
            ].map(s => (
              <div key={s.step} style={{ flex: 1, background: 'var(--bg-tertiary)', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid var(--border-color)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '-0.75rem', left: '1rem', background: s.color, color: '#fff', width: '1.75rem', height: '1.75rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>{s.step}</div>
                <h3 style={{ color: s.color, marginTop: '0.5rem' }}>{s.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </>
      ),
    },
  ]
}

function buildExecutiveModules(): TrainingModule[] {
  return [
    {
      id: 'exec-1', badge: 'MODULE 1', title: 'The Executive Threat Landscape',
      badgeColor: 'var(--accent-warning)', badgeBg: 'rgba(255, 170, 0, 0.15)',
      content: (
        <>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '1rem' }}>
            Senior leaders are disproportionately targeted by threat actors. "Whaling" attacks
            specifically target executives because of their authority to approve financial
            transactions, access strategic data, and influence organisational decisions. A single
            compromised executive account can result in multi-million-dollar fraud, regulatory
            penalties, and reputational damage.
          </p>
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: '0.75rem', padding: '1rem 1.25rem', borderLeft: '3px solid var(--accent-warning)' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Key Statistic:</strong> Business Email
              Compromise (BEC) attacks caused over $2.7 billion in losses in 2023 alone (FBI IC3).
              The average BEC attack results in a $125,000 loss — and executives are the primary
              impersonation target.
            </p>
          </div>
        </>
      ),
    },
    {
      id: 'exec-2', badge: 'MODULE 2', title: 'Business Email Compromise (BEC)',
      badgeColor: 'var(--accent-danger)', badgeBg: 'rgba(255, 0, 60, 0.15)',
      content: (
        <>
          <h3 style={{ color: 'var(--accent-danger)', marginTop: '0.5rem' }}>How BEC Works</h3>
          <ol style={{ color: 'var(--text-secondary)', lineHeight: 2, paddingLeft: '1.25rem' }}>
            <li>Attacker researches executive relationships, travel schedules, and communication patterns</li>
            <li>Compromises or spoofs the executive's email account</li>
            <li>Sends urgent, plausible requests to finance, HR, or legal teams</li>
            <li>Requests bypass normal approval workflows due to perceived authority and urgency</li>
          </ol>
          <h3 style={{ color: 'var(--accent-success)', marginTop: '1.25rem' }}>Defence Measures</h3>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: 2, paddingLeft: '1.25rem' }}>
            <li>Verify any unusual financial request via phone call — never reply to the same email</li>
            <li>Establish mandatory dual-approval for transactions above a threshold</li>
            <li>Use email authentication (DMARC, DKIM, SPF) to reduce spoofing</li>
            <li>Enable MFA on all executive accounts — hardware keys preferred</li>
          </ul>
        </>
      ),
    },
    {
      id: 'exec-3', badge: 'MODULE 3', title: 'Third-Party & Supply Chain Risk',
      badgeColor: 'var(--accent-secondary)', badgeBg: 'rgba(191, 0, 255, 0.15)',
      content: (
        <>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '1rem' }}>
            Every vendor, SaaS provider, and contractor with access to your systems extends your
            attack surface. A breach at a trusted third party can cascade into your organisation
            without any direct attack on your infrastructure.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--border-color)' }}>
              <h3 style={{ color: 'var(--accent-warning)' }}>Due Diligence Checklist</h3>
              <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
                <li>Require SOC 2 Type II or ISO 27001 certification</li>
                <li>Review data residency and sovereignty policies</li>
                <li>Include breach notification clauses in contracts</li>
                <li>Assess the vendor's own third-party dependencies</li>
              </ul>
            </div>
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--border-color)' }}>
              <h3 style={{ color: 'var(--accent-warning)' }}>Ongoing Oversight</h3>
              <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
                <li>Conduct annual security reviews of critical vendors</li>
                <li>Monitor vendor breach disclosures</li>
                <li>Maintain an inventory of all third-party data access</li>
                <li>Have a vendor incident response plan ready</li>
              </ul>
            </div>
          </div>
        </>
      ),
    },
    {
      id: 'exec-4', badge: 'MODULE 4', title: 'Incident Communication & Crisis Management',
      badgeColor: 'var(--accent-primary)', badgeBg: 'rgba(0, 240, 255, 0.15)',
      content: (
        <>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '1rem' }}>
            When a breach occurs, executive decisions in the first hours determine the outcome.
            Poor communication can amplify financial and reputational damage beyond the technical
            impact of the breach itself.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            {[
              { title: 'Internal', points: ['Activate incident response team', 'Brief legal counsel immediately', 'Restrict information to need-to-know'], color: 'var(--accent-primary)' },
              { title: 'Regulatory', points: ['Identify notification requirements (GDPR: 72h)', 'Document timeline and containment steps', 'Engage external legal if cross-border'], color: 'var(--accent-warning)' },
              { title: 'Public', points: ['Coordinate messaging with PR team', 'Never speculate on scope or cause', 'Provide actionable guidance to affected parties'], color: 'var(--accent-danger)' },
            ].map(c => (
              <div key={c.title} style={{ background: 'var(--bg-tertiary)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--border-color)' }}>
                <h3 style={{ color: c.color }}>{c.title}</h3>
                <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
                  {c.points.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </>
      ),
    },
  ]
}

function buildITModules(): TrainingModule[] {
  return [
    {
      id: 'it-1', badge: 'MODULE 1', title: 'Secure Configuration & Hardening',
      badgeColor: 'var(--accent-success)', badgeBg: 'rgba(0, 255, 136, 0.15)',
      content: (
        <>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '1rem' }}>
            Misconfiguration is the most common root cause of cloud breaches. Default credentials,
            open ports, overly permissive IAM policies, and missing encryption are low-hanging
            fruit for attackers.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--border-color)' }}>
              <h3 style={{ color: 'var(--accent-success)' }}>Hardening Essentials</h3>
              <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
                <li>Eliminate all default credentials before deployment</li>
                <li>Disable unnecessary services and ports</li>
                <li>Enforce TLS 1.2+ for all communications</li>
                <li>Use infrastructure-as-code with security linting</li>
                <li>Apply CIS Benchmarks for OS and service hardening</li>
              </ul>
            </div>
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--border-color)' }}>
              <h3 style={{ color: 'var(--accent-success)' }}>Access Control</h3>
              <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
                <li>Implement least-privilege for all service accounts</li>
                <li>Use time-bound access for elevated privileges</li>
                <li>Rotate secrets and API keys on a schedule</li>
                <li>Separate development, staging, and production environments</li>
                <li>Audit IAM policies quarterly</li>
              </ul>
            </div>
          </div>
        </>
      ),
    },
    {
      id: 'it-2', badge: 'MODULE 2', title: 'Monitoring, Logging & Detection',
      badgeColor: 'var(--accent-primary)', badgeBg: 'rgba(0, 240, 255, 0.15)',
      content: (
        <>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '1rem' }}>
            Detection is only as good as your logging. Blind spots in telemetry are blind spots
            in your security posture. The goal is not to log everything, but to log the right
            things and correlate them effectively.
          </p>
          <h3 style={{ color: 'var(--accent-primary)' }}>Critical Log Sources</h3>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: 2, paddingLeft: '1.25rem' }}>
            <li><strong style={{ color: 'var(--text-primary)' }}>Authentication events:</strong> All login attempts (success and failure), MFA challenges, token issuance</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Authorization changes:</strong> Role assignments, privilege escalation, sudo usage, policy modifications</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Network telemetry:</strong> Firewall logs, DNS queries, VPN connections, unusual outbound traffic</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Data access:</strong> Database queries, file access patterns, API call volumes, data exports</li>
          </ul>
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginTop: '1rem', borderLeft: '3px solid var(--accent-primary)' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Best Practice:</strong> Centralise
              logs in a SIEM (e.g., OpenSearch, Splunk) with automated alerting. Set retention
              policies that meet compliance requirements. Ensure log integrity — attackers who
              gain access will attempt to clear their tracks (T1070.001).
            </p>
          </div>
        </>
      ),
    },
    {
      id: 'it-3', badge: 'MODULE 3', title: 'Incident Response Procedures',
      badgeColor: 'var(--accent-danger)', badgeBg: 'rgba(255, 0, 60, 0.15)',
      content: (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
            {[
              { phase: '1', title: 'Identify', desc: 'Detect and validate the incident. Determine scope, affected systems, and initial indicators of compromise.', color: 'var(--accent-primary)' },
              { phase: '2', title: 'Contain', desc: 'Isolate affected systems. Block malicious IPs/domains. Preserve evidence before any changes.', color: 'var(--accent-warning)' },
              { phase: '3', title: 'Eradicate', desc: 'Remove attacker access. Patch vulnerabilities. Reset compromised credentials. Verify no backdoors remain.', color: 'var(--accent-danger)' },
              { phase: '4', title: 'Recover', desc: 'Restore systems from clean backups. Monitor for re-compromise. Conduct lessons-learned review.', color: 'var(--accent-success)' },
            ].map(p => (
              <div key={p.phase} style={{ background: 'var(--bg-tertiary)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--border-color)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '-0.6rem', left: '0.75rem', background: p.color, color: '#fff', width: '1.5rem', height: '1.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>{p.phase}</div>
                <h3 style={{ color: p.color, marginTop: '0.5rem', fontSize: '1rem' }}>{p.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>{p.desc}</p>
              </div>
            ))}
          </div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            Key principle: <strong style={{ color: 'var(--text-primary)' }}>never power off a compromised system</strong> unless
            absolutely necessary. Network isolation preserves volatile memory evidence (running
            processes, network connections, encryption keys) that is destroyed on shutdown.
          </p>
        </>
      ),
    },
    {
      id: 'it-4', badge: 'MODULE 4', title: 'Privilege Abuse & Insider Threats',
      badgeColor: 'var(--accent-warning)', badgeBg: 'rgba(255, 170, 0, 0.15)',
      content: (
        <>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '1rem' }}>
            Insider threats — whether malicious or negligent — are among the hardest to detect
            because the actor already has legitimate access. Technical controls must focus on
            anomaly detection and least-privilege enforcement.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--border-color)' }}>
              <h3 style={{ color: 'var(--accent-danger)' }}>Indicators to Monitor</h3>
              <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
                <li>Access to data outside normal job function</li>
                <li>Large data downloads or exports</li>
                <li>Activity outside normal working hours</li>
                <li>Attempts to bypass DLP controls</li>
                <li>Escalation of privileges without a ticket</li>
              </ul>
            </div>
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--border-color)' }}>
              <h3 style={{ color: 'var(--accent-success)' }}>Preventive Controls</h3>
              <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
                <li>Enforce separation of duties for critical operations</li>
                <li>Require peer review for production changes</li>
                <li>Implement just-in-time access provisioning</li>
                <li>Conduct regular access reviews and deprovisioning</li>
                <li>Use UEBA tools for behavioural anomaly detection</li>
              </ul>
            </div>
          </div>
        </>
      ),
    },
  ]
}

/* ─── Quiz Component ─── */

function QuizSection({ questions, passThreshold, accentColor }: {
  questions: QuizQuestion[]
  passThreshold: number
  accentColor: string
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)

  const score = Object.entries(answers).reduce((acc, [qIdx, aIdx]) => {
    return acc + (questions[Number(qIdx)].correctIndex === aIdx ? 1 : 0)
  }, 0)
  const passed = score >= passThreshold

  const handleSelect = (questionIndex: number, optionIndex: number) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }))
  }

  const handleSubmit = () => {
    if (Object.keys(answers).length < questions.length) return
    setSubmitted(true)
  }

  const handleReset = () => {
    setAnswers({})
    setSubmitted(false)
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
        }}>ASSESSMENT</span>
        <h2 style={{ margin: 0 }}>Knowledge Check</h2>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Answer all {questions.length} questions. A score of {Math.round((passThreshold / questions.length) * 100)}% or higher is required to pass.
      </p>

      {questions.map((q, qIdx) => {
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
            <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.75rem', lineHeight: 1.6 }}>
              <span style={{ color: accentColor, marginRight: '0.5rem' }}>Q{qIdx + 1}.</span>
              {q.question}
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
                    textAlign: 'left', fontSize: '0.9rem', lineHeight: 1.5, transition: 'all 0.2s',
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
                    {opt}
                  </button>
                )
              })}
            </div>
            {submitted && (
              <div style={{
                marginTop: '0.75rem', padding: '0.75rem 1rem', borderRadius: '0.5rem',
                background: isCorrect ? 'rgba(0, 255, 136, 0.08)' : 'rgba(255, 0, 60, 0.08)',
                borderLeft: `3px solid ${isCorrect ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
              }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                  <strong style={{ color: isCorrect ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                    {isCorrect ? 'Correct.' : 'Incorrect.'}
                  </strong>{' '}{q.explanation}
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
            Submit Answers
          </button>
        </div>
      ) : (
        <div style={{
          marginTop: '1rem', padding: '1.25rem', borderRadius: '0.75rem',
          background: passed ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 0, 60, 0.1)',
          border: `1px solid ${passed ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '1.1rem', color: passed ? 'var(--accent-success)' : 'var(--accent-danger)', marginBottom: '0.25rem' }}>
              Score: {score}/{questions.length} ({Math.round((score / questions.length) * 100)}%)
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {passed ? 'You have passed the assessment.' : `You did not reach the ${Math.round((passThreshold / questions.length) * 100)}% threshold. Review the material and try again.`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {passed && <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>PASSED</span>}
            <button className="btn btn-secondary" onClick={handleReset}>{passed ? 'Retake' : 'Try Again'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Subcomponents ─── */

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

/* ─── Main Component ─── */

export default function SecurityAwareness() {
  const categories = buildCategories()
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0].id)
  const [activeSection, setActiveSection] = useState('training')

  const category = categories.find(c => c.id === activeCategoryId)!

  const handleCategoryChange = (id: string) => {
    setActiveCategoryId(id)
    setActiveSection('training')
  }

  return (
    <div className="container" style={{ maxWidth: 960 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Security Awareness Training</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '-1rem' }}>
            Role-based training modules for all CityShield personnel
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        {categories.map(cat => {
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
                background: isActive
                  ? hexAlpha(cat.hex, 0.12)
                  : 'var(--glass-bg)',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                position: 'relative',
                overflow: 'hidden',
                ...(isActive ? {
                  boxShadow: `0 0 20px ${hexAlpha(cat.hex, 0.2)}`,
                } : {}),
              }}
            >
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.625rem',
                background: isActive
                  ? hexAlpha(cat.hex, 0.2)
                  : 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isActive ? cat.color : 'var(--text-tertiary)',
                flexShrink: 0,
                transition: 'all 0.25s ease',
              }}>
                {cat.icon}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: isActive ? cat.color : 'var(--text-primary)',
                  fontFamily: "'Orbitron', sans-serif",
                  letterSpacing: '0.03em',
                  transition: 'color 0.25s ease',
                }}>
                  {cat.label}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-tertiary)',
                  marginTop: '0.15rem',
                }}>
                  {cat.modules.length} modules &middot; {cat.quiz.length} questions
                </div>
              </div>
              {isActive && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '10%',
                  right: '10%',
                  height: '2px',
                  background: cat.color,
                  boxShadow: `0 0 8px ${cat.color}`,
                  borderRadius: '1px',
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
            {category.icon}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>{category.label} Track</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 1rem 0' }}>
              {category.description}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {category.topics.map(topic => (
                <span key={topic} style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: hexAlpha(category.hex, 0.1),
                  border: `1px solid ${hexAlpha(category.hex, 0.25)}`,
                  color: category.color,
                  letterSpacing: '0.03em',
                }}>
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section Tabs (Training / Scenarios / Quiz) */}
      <div style={{ marginBottom: '1.5rem' }}>
        <SectionNav
          activeSection={activeSection}
          onSelect={setActiveSection}
          sections={[
            { id: 'training', label: 'Training Modules' },
            { id: 'scenarios', label: 'Example Scenarios' },
            { id: 'quiz', label: 'Assessment Quiz' },
          ]}
        />
      </div>

      {/* Training Modules */}
      {activeSection === 'training' && (
        <>
          {category.modules.map(mod => (
            <div key={mod.id} className="card" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <span style={{
                  background: mod.badgeBg,
                  border: `1px solid ${mod.badgeColor}`,
                  borderRadius: '0.5rem',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: mod.badgeColor,
                }}>
                  {mod.badge}
                </span>
                <h2 style={{ margin: 0 }}>{mod.title}</h2>
              </div>
              {mod.content}
            </div>
          ))}
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
            }}>SCENARIOS</span>
            <h2 style={{ margin: 0 }}>Real-World Attack Examples</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.7 }}>
            These scenarios illustrate the types of attacks that target personnel in the <strong style={{ color: 'var(--text-primary)' }}>{category.label}</strong> role.
            Understanding how these attacks unfold is key to recognising and preventing them.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {category.scenarios.map((sc, idx) => (
              <div key={idx} style={{
                background: 'var(--bg-tertiary)',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                borderLeft: `3px solid ${sc.color}`,
                transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
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
                  <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>{sc.title}</h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7, margin: 0, paddingLeft: '2.5rem' }}>
                  {sc.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quiz */}
      {activeSection === 'quiz' && (
        <QuizSection
          key={category.id}
          questions={category.quiz}
          passThreshold={category.passThreshold}
          accentColor={category.color}
        />
      )}
    </div>
  )
}
