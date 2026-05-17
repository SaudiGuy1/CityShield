/**
 * CityShield Security Awareness Content Manifest
 *
 * Single source of truth for awareness training content.
 * - Bilingual (English / Arabic)
 * - Each lesson, concept, topic, scenario, and module carries a curated video reference
 *   used by the "See in Video" / "شاهد بالفيديو" UI affordance.
 * - Video URLs point to curated educational channels (IBM Technology, KnowBe4,
 *   Professor Messer, Computerphile, SANS, CISA, NIST). Search-scoped URLs are used
 *   when a single canonical video cannot be guaranteed long-term stable, so the link
 *   always lands on reputable educational results.
 *
 * To add new content: extend the AWARENESS_VIDEOS registry and the categories array.
 * To swap a video: change only the URL in AWARENESS_VIDEOS.
 */

export type Lang = 'en' | 'ar'

export interface Bilingual {
  en: string
  ar: string
}

export interface VideoRef {
  title: Bilingual
  channel: string
  url: string
  /** Optional human-readable duration like "8 min". */
  duration?: string
}

/* ───────────────────────────── Video Registry ───────────────────────────── */

/**
 * Curated educational video references keyed by stable string.
 * Channels chosen: IBM Technology, KnowBe4, Computerphile, Professor Messer,
 * SANS Institute, CISA, NIST, Cisco. All URLs route to live, reputable content.
 */
export const AWARENESS_VIDEOS: Record<string, VideoRef> = {
  phishing_explained: {
    title: { en: 'Phishing Attacks Explained', ar: 'شرح هجمات التصيد الاحتيالي' },
    channel: 'IBM Technology',
    url: 'https://www.youtube.com/results?search_query=what+is+phishing+IBM+Technology',
    duration: '8 min',
  },
  social_engineering: {
    title: { en: 'Social Engineering Attacks', ar: 'هجمات الهندسة الاجتماعية' },
    channel: 'IBM Technology',
    url: 'https://www.youtube.com/results?search_query=social+engineering+explained+IBM+Technology',
    duration: '9 min',
  },
  password_security: {
    title: { en: 'How Secure Is Your Password?', ar: 'ما مدى أمان كلمة المرور الخاصة بك؟' },
    channel: 'Computerphile',
    url: 'https://www.youtube.com/results?search_query=password+security+computerphile',
    duration: '10 min',
  },
  mfa_explained: {
    title: { en: 'What Is Multi-Factor Authentication?', ar: 'ما هي المصادقة متعددة العوامل؟' },
    channel: 'IBM Technology',
    url: 'https://www.youtube.com/results?search_query=multi+factor+authentication+IBM+Technology',
    duration: '7 min',
  },
  passphrases: {
    title: { en: 'Passphrases vs Passwords', ar: 'العبارات المرورية مقابل كلمات المرور' },
    channel: 'Computerphile',
    url: 'https://www.youtube.com/results?search_query=correct+horse+battery+staple+computerphile',
    duration: '9 min',
  },
  safe_browsing: {
    title: { en: 'Safe Browsing & Email Hygiene', ar: 'التصفح الآمن ونظافة البريد الإلكتروني' },
    channel: 'Professor Messer',
    url: 'https://www.youtube.com/results?search_query=safe+browsing+email+hygiene+professor+messer',
    duration: '11 min',
  },
  data_protection: {
    title: { en: 'Data Classification & Protection', ar: 'تصنيف البيانات وحمايتها' },
    channel: 'IBM Technology',
    url: 'https://www.youtube.com/results?search_query=data+classification+protection+IBM+Technology',
    duration: '8 min',
  },
  incident_reporting: {
    title: { en: 'How to Report a Security Incident', ar: 'كيفية الإبلاغ عن حادث أمني' },
    channel: 'SANS Institute',
    url: 'https://www.youtube.com/results?search_query=how+to+report+security+incident+SANS',
    duration: '6 min',
  },
  usb_drop_attack: {
    title: { en: 'USB Drop Attacks Demonstrated', ar: 'عرض توضيحي لهجمات إسقاط فلاش USB' },
    channel: 'Hak5',
    url: 'https://www.youtube.com/results?search_query=usb+drop+attack+badusb+hak5',
    duration: '12 min',
  },
  pretexting: {
    title: { en: 'Pretexting & Vishing Calls', ar: 'هجمات الاستدراج والاتصالات الاحتيالية' },
    channel: 'KnowBe4',
    url: 'https://www.youtube.com/results?search_query=pretexting+vishing+knowbe4',
    duration: '7 min',
  },
  bec_attacks: {
    title: { en: 'Business Email Compromise (BEC)', ar: 'اختراق البريد الإلكتروني للأعمال (BEC)' },
    channel: 'IBM Technology',
    url: 'https://www.youtube.com/results?search_query=business+email+compromise+BEC+IBM+Technology',
    duration: '10 min',
  },
  whaling_attack: {
    title: { en: 'Whaling & Executive Targeting', ar: 'هجمات صيد الحيتان واستهداف المسؤولين التنفيذيين' },
    channel: 'KnowBe4',
    url: 'https://www.youtube.com/results?search_query=whaling+attack+executives+knowbe4',
    duration: '8 min',
  },
  supply_chain_risk: {
    title: { en: 'Third-Party & Supply Chain Risk', ar: 'مخاطر الأطراف الثالثة وسلسلة التوريد' },
    channel: 'IBM Technology',
    url: 'https://www.youtube.com/results?search_query=supply+chain+risk+third+party+IBM+Technology',
    duration: '11 min',
  },
  compliance_overview: {
    title: { en: 'Compliance & Regulation Overview (GDPR, SOC 2)', ar: 'نظرة عامة على الامتثال واللوائح (GDPR، SOC 2)' },
    channel: 'IBM Technology',
    url: 'https://www.youtube.com/results?search_query=GDPR+SOC2+compliance+overview+IBM+Technology',
    duration: '12 min',
  },
  crisis_communication: {
    title: { en: 'Crisis Communication During a Breach', ar: 'التواصل في الأزمات أثناء حدوث اختراق' },
    channel: 'SANS Institute',
    url: 'https://www.youtube.com/results?search_query=incident+crisis+communication+SANS',
    duration: '14 min',
  },
  executive_threat_landscape: {
    title: { en: 'The Executive Threat Landscape', ar: 'مشهد التهديدات للمسؤولين التنفيذيين' },
    channel: 'KnowBe4',
    url: 'https://www.youtube.com/results?search_query=executive+threat+landscape+whaling+knowbe4',
    duration: '10 min',
  },
  ceo_fraud: {
    title: { en: 'CEO Fraud / Wire Transfer Scams', ar: 'احتيال انتحال المدير التنفيذي وعمليات التحويل المالي' },
    channel: 'KnowBe4',
    url: 'https://www.youtube.com/results?search_query=CEO+fraud+wire+transfer+scam+knowbe4',
    duration: '9 min',
  },
  hardening_basics: {
    title: { en: 'System Hardening Basics', ar: 'أساسيات تصلب الأنظمة' },
    channel: 'Professor Messer',
    url: 'https://www.youtube.com/results?search_query=system+hardening+CIS+benchmarks+professor+messer',
    duration: '13 min',
  },
  least_privilege: {
    title: { en: 'Least Privilege & Access Control', ar: 'مبدأ أقل الصلاحيات والتحكم في الوصول' },
    channel: 'IBM Technology',
    url: 'https://www.youtube.com/results?search_query=least+privilege+access+control+IBM+Technology',
    duration: '8 min',
  },
  logging_siem: {
    title: { en: 'Logging, SIEM & Detection', ar: 'التسجيل وSIEM والكشف' },
    channel: 'IBM Technology',
    url: 'https://www.youtube.com/results?search_query=SIEM+logging+detection+IBM+Technology',
    duration: '11 min',
  },
  incident_response: {
    title: { en: 'Incident Response Lifecycle', ar: 'دورة حياة الاستجابة للحوادث' },
    channel: 'IBM Technology',
    url: 'https://www.youtube.com/results?search_query=incident+response+lifecycle+IBM+Technology',
    duration: '12 min',
  },
  privilege_management: {
    title: { en: 'Privileged Access Management (PAM)', ar: 'إدارة الوصول المميز (PAM)' },
    channel: 'IBM Technology',
    url: 'https://www.youtube.com/results?search_query=privileged+access+management+PAM+IBM+Technology',
    duration: '9 min',
  },
  vulnerability_mgmt: {
    title: { en: 'Vulnerability & Patch Management', ar: 'إدارة الثغرات والتحديثات الأمنية' },
    channel: 'IBM Technology',
    url: 'https://www.youtube.com/results?search_query=vulnerability+patch+management+IBM+Technology',
    duration: '10 min',
  },
  insider_threats: {
    title: { en: 'Insider Threats & UEBA', ar: 'التهديدات الداخلية وتحليل سلوك المستخدم (UEBA)' },
    channel: 'IBM Technology',
    url: 'https://www.youtube.com/results?search_query=insider+threats+UEBA+IBM+Technology',
    duration: '11 min',
  },
  c2_beaconing: {
    title: { en: 'Command & Control (C2) Beaconing', ar: 'إشارات القيادة والسيطرة (C2)' },
    channel: 'SANS Institute',
    url: 'https://www.youtube.com/results?search_query=command+and+control+C2+beaconing+SANS',
    duration: '10 min',
  },
  cloud_misconfig: {
    title: { en: 'Cloud Misconfiguration Breaches', ar: 'اختراقات بسبب أخطاء إعداد السحابة' },
    channel: 'IBM Technology',
    url: 'https://www.youtube.com/results?search_query=cloud+misconfiguration+S3+IBM+Technology',
    duration: '9 min',
  },
  data_exfiltration: {
    title: { en: 'Data Exfiltration Detection', ar: 'كشف تسريب البيانات' },
    channel: 'SANS Institute',
    url: 'https://www.youtube.com/results?search_query=data+exfiltration+detection+DLP+SANS',
    duration: '12 min',
  },
  zero_trust: {
    title: { en: 'Zero Trust Architecture', ar: 'هندسة الثقة الصفرية' },
    channel: 'IBM Technology',
    url: 'https://www.youtube.com/results?search_query=zero+trust+architecture+IBM+Technology',
    duration: '10 min',
  },
}

/* ──────────────────────────── Content Block Types ──────────────────────────── */

export type ContentBlock =
  | { kind: 'paragraph'; text: Bilingual }
  | {
      kind: 'list'
      heading?: Bilingual
      headingColor?: string
      items: Bilingual[]
      ordered?: boolean
    }
  | {
      kind: 'twocol'
      left: { heading: Bilingual; headingColor: string; items: Bilingual[]; tone: 'positive' | 'negative' | 'neutral' }
      right: { heading: Bilingual; headingColor: string; items: Bilingual[]; tone: 'positive' | 'negative' | 'neutral' }
    }
  | {
      kind: 'callout'
      tone: 'info' | 'warning' | 'danger' | 'success'
      title?: Bilingual
      text: Bilingual
    }
  | {
      kind: 'steps'
      steps: { number: string; title: Bilingual; description: Bilingual; color: string }[]
    }
  | {
      kind: 'phases'
      phases: { number: string; title: Bilingual; description: Bilingual; color: string }[]
    }
  | {
      kind: 'columns3'
      columns: { title: Bilingual; titleColor: string; points: Bilingual[] }[]
    }

/* ─────────────────────────── Topic / Module / Quiz ─────────────────────────── */

export interface AwarenessTopic {
  id: string
  /** Maps to a weak-area category used by the pre-assessment recommender. */
  category: string
  label: Bilingual
  videoKey: string
}

export interface AwarenessConcept {
  id: string
  title: Bilingual
  body: ContentBlock[]
  videoKey?: string
}

export interface AwarenessModule {
  id: string
  badge: Bilingual
  title: Bilingual
  badgeColor: string
  badgeBg: string
  /** Concepts inside the module each carry their own optional video. */
  concepts: AwarenessConcept[]
  videoKey: string
}

export interface AwarenessScenario {
  id: string
  title: Bilingual
  description: Bilingual
  color: string
  videoKey: string
}

export interface AwarenessQuizQuestion {
  id: string
  /** Weak-area category used by the pre-assessment recommender (matches AwarenessTopic.category). */
  category: string
  question: Bilingual
  options: Bilingual[]
  correctIndex: number
  explanation: Bilingual
}

export interface AwarenessCategory {
  id: 'employees' | 'executives' | 'it-staff'
  label: Bilingual
  description: Bilingual
  color: string
  hex: string
  topics: AwarenessTopic[]
  modules: AwarenessModule[]
  scenarios: AwarenessScenario[]
  quiz: AwarenessQuizQuestion[]
  passThreshold: number
}

/* ─────────────────────────────── EMPLOYEES ─────────────────────────────── */

const EMPLOYEE_TOPICS: AwarenessTopic[] = [
  { id: 'emp-t-1', category: 'phishing',         label: { en: 'Phishing & Social Engineering', ar: 'التصيد الاحتيالي والهندسة الاجتماعية' }, videoKey: 'phishing_explained' },
  { id: 'emp-t-2', category: 'passwords_mfa',    label: { en: 'Passwords & MFA',                ar: 'كلمات المرور والمصادقة متعددة العوامل' }, videoKey: 'mfa_explained' },
  { id: 'emp-t-3', category: 'safe_browsing',    label: { en: 'Safe Browsing & Email',          ar: 'التصفح الآمن والبريد الإلكتروني' }, videoKey: 'safe_browsing' },
  { id: 'emp-t-4', category: 'data_protection',  label: { en: 'Data Protection',                ar: 'حماية البيانات' }, videoKey: 'data_protection' },
  { id: 'emp-t-5', category: 'incident_reporting', label: { en: 'Incident Reporting',           ar: 'الإبلاغ عن الحوادث' }, videoKey: 'incident_reporting' },
]

const EMPLOYEE_MODULES: AwarenessModule[] = [
  {
    id: 'emp-m1',
    badge: { en: 'MODULE 1', ar: 'الوحدة 1' },
    title: { en: 'Why This Matters', ar: 'لماذا هذا مهم' },
    badgeColor: 'var(--accent-primary)',
    badgeBg: 'rgba(0, 240, 255, 0.15)',
    videoKey: 'social_engineering',
    concepts: [
      {
        id: 'emp-m1-c1',
        title: { en: 'Human Error in Breaches', ar: 'الخطأ البشري في الاختراقات' },
        videoKey: 'social_engineering',
        body: [
          {
            kind: 'paragraph',
            text: {
              en: 'Human error remains the leading cause of security breaches. Over 80% of confirmed data breaches involve a human element — phishing, credential misuse, or misconfiguration. As operators of critical smart city infrastructure, every team member is a potential target and a vital line of defence. This training covers the essential practices that protect both you and the systems you manage.',
              ar: 'لا يزال الخطأ البشري السبب الرئيسي لحوادث الاختراق الأمني. حيث تتضمن أكثر من 80% من حوادث تسريب البيانات المؤكدة عنصراً بشرياً — سواء عبر التصيد الاحتيالي أو إساءة استخدام بيانات الاعتماد أو سوء الإعداد. وبصفتنا مشغلين لبنية تحتية حيوية في المدينة الذكية، فإن كل عضو في الفريق هدف محتمل وخط دفاع أساسي في الوقت ذاته. يغطي هذا التدريب الممارسات الأساسية التي تحميك وتحمي الأنظمة التي تشرف عليها.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'emp-m2',
    badge: { en: 'MODULE 2', ar: 'الوحدة 2' },
    title: { en: 'Phishing & Social Engineering', ar: 'التصيد الاحتيالي والهندسة الاجتماعية' },
    badgeColor: 'var(--accent-danger)',
    badgeBg: 'rgba(255, 0, 60, 0.15)',
    videoKey: 'phishing_explained',
    concepts: [
      {
        id: 'emp-m2-c1',
        title: { en: 'Red Flags to Watch For', ar: 'علامات التحذير التي يجب الانتباه إليها' },
        videoKey: 'phishing_explained',
        body: [
          {
            kind: 'list',
            heading: { en: 'Red Flags to Watch For', ar: 'علامات التحذير التي يجب الانتباه إليها' },
            headingColor: 'var(--accent-danger)',
            items: [
              { en: 'Urgent or threatening language ("Your account will be locked in 24 hours")', ar: 'لغة عاجلة أو تهديدية ("سيتم إقفال حسابك خلال 24 ساعة")' },
              { en: 'Sender address that does not match the organisation\'s domain', ar: 'عنوان مرسل لا يطابق النطاق الرسمي للمؤسسة' },
              { en: 'Links where the displayed text differs from the actual URL (hover to check)', ar: 'روابط يختلف نصها الظاهر عن الرابط الفعلي (مرر فوقها للتحقق)' },
              { en: 'Unexpected attachments, especially .exe, .zip, or macro-enabled documents', ar: 'مرفقات غير متوقعة، خاصة ملفات .exe و .zip أو مستندات تحتوي على ماكرو' },
              { en: 'Requests for credentials, payment details, or sensitive data via email', ar: 'طلبات لبيانات اعتماد أو معلومات دفع أو بيانات حساسة عبر البريد الإلكتروني' },
            ],
          },
        ],
      },
      {
        id: 'emp-m2-c2',
        title: { en: 'If You Suspect Phishing', ar: 'إذا اشتبهت بمحاولة تصيد احتيالي' },
        videoKey: 'incident_reporting',
        body: [
          {
            kind: 'list',
            heading: { en: 'If You Suspect Phishing', ar: 'إذا اشتبهت بمحاولة تصيد احتيالي' },
            headingColor: 'var(--accent-success)',
            ordered: true,
            items: [
              { en: 'Do not click any links or open attachments', ar: 'لا تنقر على أي روابط ولا تفتح أي مرفقات' },
              { en: 'Do not reply to the sender', ar: 'لا ترد على المرسل' },
              { en: 'Report it to your security team via the official channel', ar: 'أبلغ فريق الأمن لديك عبر القناة الرسمية المعتمدة' },
              { en: 'If you already clicked a link, change your password and notify security immediately', ar: 'إذا كنت قد نقرت على رابط بالفعل، فغيّر كلمة المرور وأبلغ فريق الأمن فوراً' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'emp-m3',
    badge: { en: 'MODULE 3', ar: 'الوحدة 3' },
    title: { en: 'Passwords & Multi-Factor Authentication', ar: 'كلمات المرور والمصادقة متعددة العوامل' },
    badgeColor: 'var(--accent-secondary)',
    badgeBg: 'rgba(191, 0, 255, 0.15)',
    videoKey: 'password_security',
    concepts: [
      {
        id: 'emp-m3-c1',
        title: { en: 'Do and Don\'t', ar: 'ما يجب فعله وما يجب تجنبه' },
        videoKey: 'passphrases',
        body: [
          {
            kind: 'twocol',
            left: {
              heading: { en: 'Do', ar: 'افعل' },
              headingColor: 'var(--accent-success)',
              tone: 'positive',
              items: [
                { en: 'Use 16+ characters or a 4-word passphrase', ar: 'استخدم 16 حرفاً فأكثر أو عبارة من 4 كلمات' },
                { en: 'Use a unique password for every account', ar: 'استخدم كلمة مرور فريدة لكل حساب' },
                { en: 'Use a password manager', ar: 'استخدم مدير كلمات المرور' },
                { en: 'Enable MFA on all accounts', ar: 'فعّل المصادقة متعددة العوامل على جميع الحسابات' },
              ],
            },
            right: {
              heading: { en: 'Don\'t', ar: 'تجنب' },
              headingColor: 'var(--accent-danger)',
              tone: 'negative',
              items: [
                { en: 'Reuse passwords across services', ar: 'إعادة استخدام كلمات المرور بين الخدمات' },
                { en: 'Use personal info (birthdays, pet names)', ar: 'استخدام معلومات شخصية (تواريخ الميلاد، أسماء الحيوانات الأليفة)' },
                { en: 'Store passwords in plaintext', ar: 'تخزين كلمات المرور كنص واضح' },
                { en: 'Share passwords via email or chat', ar: 'مشاركة كلمات المرور عبر البريد أو المحادثات' },
              ],
            },
          },
          {
            kind: 'paragraph',
            text: {
              en: 'MFA requires a second verification step beyond your password. Even if an attacker obtains your password, MFA blocks unauthorized access. Organisations that enforce MFA reduce account compromise by over 99%.',
              ar: 'تتطلب المصادقة متعددة العوامل خطوة تحقق ثانية بعد كلمة المرور. حتى إذا حصل المهاجم على كلمة المرور، فإنها تمنع الوصول غير المصرح به. والمؤسسات التي تفرض تفعيلها تقلل من نسبة اختراق الحسابات بأكثر من 99%.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'emp-m4',
    badge: { en: 'MODULE 4', ar: 'الوحدة 4' },
    title: { en: 'Data Protection & Incident Reporting', ar: 'حماية البيانات والإبلاغ عن الحوادث' },
    badgeColor: 'var(--accent-warning)',
    badgeBg: 'rgba(255, 170, 0, 0.15)',
    videoKey: 'data_protection',
    concepts: [
      {
        id: 'emp-m4-c1',
        title: { en: 'Data Protection Basics', ar: 'أساسيات حماية البيانات' },
        videoKey: 'data_protection',
        body: [
          {
            kind: 'paragraph',
            text: {
              en: 'Classify data before storing or transmitting. Apply the principle of least privilege. Do not connect personal USB devices to work systems. Only share files via approved platforms.',
              ar: 'صنّف البيانات قبل تخزينها أو إرسالها. طبّق مبدأ أقل الصلاحيات. لا تصل أجهزة USB الشخصية بأجهزة العمل. شارك الملفات فقط عبر المنصات المعتمدة.',
            },
          },
        ],
      },
      {
        id: 'emp-m4-c2',
        title: { en: 'Incident Reporting Steps', ar: 'خطوات الإبلاغ عن الحادث' },
        videoKey: 'incident_reporting',
        body: [
          {
            kind: 'steps',
            steps: [
              { number: '1', title: { en: 'Stop & Preserve', ar: 'توقف واحفظ الأدلة' }, description: { en: 'Disconnect the affected system if safe. Do not power off or delete files — preserve forensic evidence.', ar: 'افصل النظام المتأثر إذا كان ذلك آمناً. لا تطفئ الجهاز ولا تحذف الملفات — احفظ الأدلة الجنائية الرقمية.' }, color: 'var(--accent-danger)' },
              { number: '2', title: { en: 'Report Immediately', ar: 'أبلغ فوراً' }, description: { en: 'Contact your security team. Provide: what happened, when, which systems, and any actions taken.', ar: 'تواصل مع فريق الأمن وزوّدهم بما حدث ومتى وأي الأنظمة تأثرت وأي إجراءات قد اتخذتها.' }, color: 'var(--accent-warning)' },
              { number: '3', title: { en: 'Cooperate & Document', ar: 'تعاون ووثّق' }, description: { en: 'Follow instructions from incident response. Write down everything while it is fresh.', ar: 'اتبع تعليمات فريق الاستجابة للحوادث. وثّق كل شيء بينما يكون حاضراً في ذاكرتك.' }, color: 'var(--accent-success)' },
            ],
          },
        ],
      },
    ],
  },
]

const EMPLOYEE_SCENARIOS: AwarenessScenario[] = [
  { id: 'emp-s1', title: { en: 'Spear Phishing Email', ar: 'رسالة تصيد موجّهة' }, description: { en: 'An attacker impersonates IT Support and sends a credential-harvesting link disguised as a password reset. The email references the target by name and cites a real internal project.', ar: 'ينتحل المهاجم هوية فريق الدعم الفني ويرسل رابطاً لجمع بيانات الاعتماد متخفياً في صورة طلب إعادة تعيين كلمة المرور. تتضمن الرسالة اسم المستهدف وتشير إلى مشروع داخلي حقيقي.' }, color: 'var(--accent-danger)', videoKey: 'phishing_explained' },
  { id: 'emp-s2', title: { en: 'USB Drop Attack', ar: 'هجوم إسقاط USB' }, description: { en: 'A branded USB drive labelled "Q4 Salary Review" is left in the car park. An employee plugs it in, executing a hidden payload that establishes a reverse shell.', ar: 'يُترك قرص USB يحمل علامة "مراجعة رواتب الربع الرابع" في موقف السيارات. يقوم موظف بتوصيله فيُنفَّذ حمولة خبيثة خفية تُنشئ اتصال shell عكسي.' }, color: 'var(--accent-warning)', videoKey: 'usb_drop_attack' },
  { id: 'emp-s3', title: { en: 'Pretexting Phone Call', ar: 'مكالمة هاتفية بذريعة كاذبة' }, description: { en: 'A caller claims to be a vendor technician needing remote access to "update the SCADA firmware." They reference real project names obtained from LinkedIn.', ar: 'يتصل شخص مدعياً أنه فني من مزود خدمة ويحتاج وصولاً عن بُعد "لتحديث برنامج SCADA". يستخدم أسماء مشاريع حقيقية حصل عليها من LinkedIn.' }, color: 'var(--accent-secondary)', videoKey: 'pretexting' },
]

const EMPLOYEE_QUIZ: AwarenessQuizQuestion[] = [
  {
    id: 'emp-q1',
    category: 'phishing',
    question: { en: 'You receive an email from "IT Support" asking you to click a link and verify your credentials. The sender address is support@c0mpany-helpdesk.net. What should you do?', ar: 'تتلقى رسالة بريد من "الدعم الفني" تطلب منك النقر على رابط للتحقق من بيانات اعتمادك. عنوان المرسل هو support@c0mpany-helpdesk.net. ماذا تفعل؟' },
    options: [
      { en: 'Click the link — IT Support often sends these requests', ar: 'النقر على الرابط — الدعم الفني يرسل مثل هذه الطلبات' },
      { en: 'Reply to the email asking if it is legitimate', ar: 'الرد على الرسالة للسؤال عما إذا كانت موثوقة' },
      { en: 'Do not click the link, report it to your security team via the official channel', ar: 'عدم النقر على الرابط والإبلاغ عنه لفريق الأمن عبر القناة الرسمية' },
      { en: 'Forward it to colleagues to check if they received it too', ar: 'إعادة توجيهها للزملاء للتحقق مما إذا كانوا قد تلقوها أيضاً' },
    ],
    correctIndex: 2,
    explanation: { en: 'Never click links in unsolicited credential requests. The misspelled domain (c0mpany) is a strong indicator of phishing. Report through your official security channel.', ar: 'لا تنقر أبداً على روابط في طلبات بيانات اعتماد غير متوقعة. النطاق المكتوب بشكل خاطئ (c0mpany) دليل قوي على التصيد. أبلغ عبر قناة الأمن الرسمية.' },
  },
  {
    id: 'emp-q2',
    category: 'passwords_mfa',
    question: { en: 'Which of the following is the strongest password?', ar: 'أيٌّ من التالي يُعدّ أقوى كلمة مرور؟' },
    options: [
      { en: 'P@ssw0rd123', ar: 'P@ssw0rd123' },
      { en: 'correct-horse-battery-staple', ar: 'correct-horse-battery-staple' },
      { en: 'qwerty2024!', ar: 'qwerty2024!' },
      { en: 'Admin@123', ar: 'Admin@123' },
    ],
    correctIndex: 1,
    explanation: { en: 'Long passphrases with random words are far stronger than short passwords with predictable substitutions. "correct-horse-battery-staple" has high entropy and is memorable.', ar: 'العبارات الطويلة المؤلفة من كلمات عشوائية أقوى بكثير من كلمات المرور القصيرة ذات الاستبدالات المتوقعة. "correct-horse-battery-staple" تتميز بإنتروبيا عالية وسهلة التذكر.' },
  },
  {
    id: 'emp-q3',
    category: 'safe_browsing',
    question: { en: 'A colleague asks to borrow your USB drive to transfer files from an unknown external laptop. What is the correct response?', ar: 'يطلب منك زميل استعارة قرص USB الخاص بك لنقل ملفات من جهاز محمول خارجي غير معروف. ما الإجراء الصحيح؟' },
    options: [
      { en: 'Allow it — colleagues can be trusted', ar: 'السماح — يمكن الوثوق بالزملاء' },
      { en: 'Allow it but scan the USB afterward', ar: 'السماح ثم فحص القرص لاحقاً' },
      { en: 'Decline and suggest using an approved file sharing service instead', ar: 'الرفض واقتراح استخدام خدمة مشاركة ملفات معتمدة بدلاً من ذلك' },
      { en: 'Allow it only if the laptop has antivirus installed', ar: 'السماح فقط إذا كان الجهاز يحتوي على برنامج مكافحة فيروسات' },
    ],
    correctIndex: 2,
    explanation: { en: 'USB drives from uncontrolled devices can introduce malware. Always use approved file-sharing channels. USB-based attacks (e.g., BadUSB) can bypass antivirus.', ar: 'يمكن لأقراص USB من أجهزة غير منضبطة أن تنقل برمجيات خبيثة. استخدم دائماً قنوات المشاركة المعتمدة. هجمات USB مثل BadUSB قادرة على تجاوز برامج مكافحة الفيروسات.' },
  },
  {
    id: 'emp-q4',
    category: 'data_protection',
    question: { en: 'You discover that a publicly accessible cloud storage link contains internal project documents. What should you do first?', ar: 'تكتشف أن رابطاً عاماً لتخزين سحابي يحتوي على مستندات مشاريع داخلية. ما أول إجراء تتخذه؟' },
    options: [
      { en: 'Download the files for safekeeping', ar: 'تنزيل الملفات للاحتفاظ بها في مكان آمن' },
      { en: 'Share the link with your manager via chat', ar: 'مشاركة الرابط مع مديرك عبر المحادثة' },
      { en: 'Report the exposure to your security team immediately', ar: 'الإبلاغ عن التسريب لفريق الأمن فوراً' },
      { en: 'Change the link permissions yourself', ar: 'تغيير صلاحيات الرابط بنفسك' },
    ],
    correctIndex: 2,
    explanation: { en: 'Report data exposures to your security team immediately. Do not download, redistribute, or attempt to remediate without authorization.', ar: 'أبلغ فريق الأمن فوراً عن أي تسريب للبيانات. لا تقم بالتنزيل أو إعادة التوزيع أو محاولة المعالجة دون تصريح.' },
  },
  {
    id: 'emp-q5',
    category: 'passwords_mfa',
    question: { en: 'Multi-Factor Authentication (MFA) protects your account even if:', ar: 'تحمي المصادقة متعددة العوامل حسابك حتى إذا:' },
    options: [
      { en: 'Your password is written on a sticky note', ar: 'كانت كلمة المرور مكتوبة على ورقة لاصقة' },
      { en: 'You use the same password across all services', ar: 'كنت تستخدم نفس كلمة المرور في جميع الخدمات' },
      { en: 'Your password is compromised in a data breach', ar: 'تم تسريب كلمة المرور في حادث اختراق بيانات' },
      { en: 'You share your MFA code with a trusted colleague', ar: 'شاركت رمز المصادقة مع زميل تثق به' },
    ],
    correctIndex: 2,
    explanation: { en: 'MFA adds a second verification layer, so a stolen password alone is not enough for an attacker. However, MFA codes must never be shared.', ar: 'تضيف المصادقة طبقة تحقق ثانية، لذا فإن كلمة المرور المسروقة وحدها لا تكفي المهاجم. ومع ذلك يجب عدم مشاركة رموز المصادقة أبداً.' },
  },
]

/* ─────────────────────────────── EXECUTIVES ─────────────────────────────── */

const EXECUTIVE_TOPICS: AwarenessTopic[] = [
  { id: 'exec-t-1', category: 'bec',               label: { en: 'Business Email Compromise (BEC)',           ar: 'اختراق البريد الإلكتروني للأعمال (BEC)' }, videoKey: 'bec_attacks' },
  { id: 'exec-t-2', category: 'whaling',           label: { en: 'Whaling & Targeted Attacks',                 ar: 'هجمات صيد الحيتان والهجمات المستهدفة' }, videoKey: 'whaling_attack' },
  { id: 'exec-t-3', category: 'supply_chain',      label: { en: 'Third-Party & Supply Chain Risk',            ar: 'مخاطر الأطراف الثالثة وسلسلة التوريد' }, videoKey: 'supply_chain_risk' },
  { id: 'exec-t-4', category: 'compliance',        label: { en: 'Regulatory & Compliance Obligations',        ar: 'الالتزامات التنظيمية والامتثال' }, videoKey: 'compliance_overview' },
  { id: 'exec-t-5', category: 'crisis_management', label: { en: 'Incident Communication & Crisis Management', ar: 'التواصل في الحوادث وإدارة الأزمات' }, videoKey: 'crisis_communication' },
]

const EXECUTIVE_MODULES: AwarenessModule[] = [
  {
    id: 'exec-m1',
    badge: { en: 'MODULE 1', ar: 'الوحدة 1' },
    title: { en: 'The Executive Threat Landscape', ar: 'مشهد التهديدات للمسؤولين التنفيذيين' },
    badgeColor: 'var(--accent-warning)',
    badgeBg: 'rgba(255, 170, 0, 0.15)',
    videoKey: 'executive_threat_landscape',
    concepts: [
      {
        id: 'exec-m1-c1',
        title: { en: 'Why Executives Are Targeted', ar: 'لماذا يُستهدَف المسؤولون التنفيذيون' },
        videoKey: 'whaling_attack',
        body: [
          {
            kind: 'paragraph',
            text: {
              en: 'Senior leaders are disproportionately targeted by threat actors. "Whaling" attacks specifically target executives because of their authority to approve financial transactions, access strategic data, and influence organisational decisions. A single compromised executive account can result in multi-million-dollar fraud, regulatory penalties, and reputational damage.',
              ar: 'يستهدف المهاجمون كبار القادة بشكل غير متناسب. تستهدف هجمات "صيد الحيتان" المسؤولين التنفيذيين بشكل خاص نظراً لصلاحياتهم في اعتماد المعاملات المالية والوصول إلى البيانات الاستراتيجية والتأثير في قرارات المؤسسة. ويمكن لاختراق حساب تنفيذي واحد أن يؤدي إلى احتيال بملايين الدولارات وعقوبات تنظيمية وأضرار في السمعة.',
            },
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: { en: 'Key Statistic', ar: 'إحصائية مهمة' },
            text: {
              en: 'Business Email Compromise (BEC) attacks caused over $2.7 billion in losses in 2023 alone (FBI IC3). The average BEC attack results in a $125,000 loss — and executives are the primary impersonation target.',
              ar: 'تسببت هجمات اختراق البريد الإلكتروني للأعمال (BEC) في خسائر تجاوزت 2.7 مليار دولار في عام 2023 وحده (تقرير FBI IC3). متوسط الخسارة في الهجمة الواحدة يبلغ 125,000 دولار — والمسؤولون التنفيذيون هم الهدف الرئيسي للانتحال.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'exec-m2',
    badge: { en: 'MODULE 2', ar: 'الوحدة 2' },
    title: { en: 'Business Email Compromise (BEC)', ar: 'اختراق البريد الإلكتروني للأعمال (BEC)' },
    badgeColor: 'var(--accent-danger)',
    badgeBg: 'rgba(255, 0, 60, 0.15)',
    videoKey: 'bec_attacks',
    concepts: [
      {
        id: 'exec-m2-c1',
        title: { en: 'How BEC Works', ar: 'كيف تعمل هجمات BEC' },
        videoKey: 'ceo_fraud',
        body: [
          {
            kind: 'list',
            heading: { en: 'How BEC Works', ar: 'كيف تعمل هجمات BEC' },
            headingColor: 'var(--accent-danger)',
            ordered: true,
            items: [
              { en: 'Attacker researches executive relationships, travel schedules, and communication patterns', ar: 'يبحث المهاجم في علاقات المسؤول التنفيذي وجداول سفره وأنماط تواصله' },
              { en: 'Compromises or spoofs the executive\'s email account', ar: 'يخترق حساب البريد الإلكتروني للمسؤول التنفيذي أو ينتحله' },
              { en: 'Sends urgent, plausible requests to finance, HR, or legal teams', ar: 'يرسل طلبات عاجلة ومُقنعة إلى فرق المالية أو الموارد البشرية أو الشؤون القانونية' },
              { en: 'Requests bypass normal approval workflows due to perceived authority and urgency', ar: 'تتجاوز هذه الطلبات إجراءات الاعتماد المعتادة بسبب السلطة المُدّعاة والاستعجال' },
            ],
          },
          {
            kind: 'list',
            heading: { en: 'Defence Measures', ar: 'إجراءات الدفاع' },
            headingColor: 'var(--accent-success)',
            items: [
              { en: 'Verify any unusual financial request via phone call — never reply to the same email', ar: 'تحقق من أي طلب مالي غير معتاد عبر اتصال هاتفي — لا ترد على نفس البريد أبداً' },
              { en: 'Establish mandatory dual-approval for transactions above a threshold', ar: 'اعتمد سياسة الموافقة المزدوجة الإلزامية للمعاملات التي تتجاوز حداً معيناً' },
              { en: 'Use email authentication (DMARC, DKIM, SPF) to reduce spoofing', ar: 'استخدم آليات مصادقة البريد (DMARC، DKIM، SPF) للحد من الانتحال' },
              { en: 'Enable MFA on all executive accounts — hardware keys preferred', ar: 'فعّل المصادقة متعددة العوامل على جميع حسابات المسؤولين التنفيذيين — يُفضّل المفاتيح المادية' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'exec-m3',
    badge: { en: 'MODULE 3', ar: 'الوحدة 3' },
    title: { en: 'Third-Party & Supply Chain Risk', ar: 'مخاطر الأطراف الثالثة وسلسلة التوريد' },
    badgeColor: 'var(--accent-secondary)',
    badgeBg: 'rgba(191, 0, 255, 0.15)',
    videoKey: 'supply_chain_risk',
    concepts: [
      {
        id: 'exec-m3-c1',
        title: { en: 'Vendor Risk Overview', ar: 'نظرة عامة على مخاطر الموردين' },
        videoKey: 'supply_chain_risk',
        body: [
          {
            kind: 'paragraph',
            text: {
              en: 'Every vendor, SaaS provider, and contractor with access to your systems extends your attack surface. A breach at a trusted third party can cascade into your organisation without any direct attack on your infrastructure.',
              ar: 'كل مورد أو مزود خدمة سحابية أو مقاول يصل إلى أنظمتك يوسّع سطح الهجوم الخاص بك. ويمكن لاختراق طرف ثالث موثوق أن ينتقل إلى مؤسستك دون أي هجوم مباشر على بنيتك التحتية.',
            },
          },
          {
            kind: 'twocol',
            left: {
              heading: { en: 'Due Diligence Checklist', ar: 'قائمة العناية الواجبة' },
              headingColor: 'var(--accent-warning)',
              tone: 'neutral',
              items: [
                { en: 'Require SOC 2 Type II or ISO 27001 certification', ar: 'اشترط شهادة SOC 2 Type II أو ISO 27001' },
                { en: 'Review data residency and sovereignty policies', ar: 'راجع سياسات إقامة البيانات والسيادة الرقمية' },
                { en: 'Include breach notification clauses in contracts', ar: 'ضمّن العقود بنوداً للإبلاغ عن الاختراقات' },
                { en: 'Assess the vendor\'s own third-party dependencies', ar: 'قيّم اعتماد المورد على أطراف ثالثة بدوره' },
              ],
            },
            right: {
              heading: { en: 'Ongoing Oversight', ar: 'الرقابة المستمرة' },
              headingColor: 'var(--accent-warning)',
              tone: 'neutral',
              items: [
                { en: 'Conduct annual security reviews of critical vendors', ar: 'أجرِ مراجعات أمنية سنوية للموردين الحيويين' },
                { en: 'Monitor vendor breach disclosures', ar: 'راقب إفصاحات الاختراق الخاصة بالموردين' },
                { en: 'Maintain an inventory of all third-party data access', ar: 'احتفظ بسجل لكل وصول من أطراف ثالثة إلى البيانات' },
                { en: 'Have a vendor incident response plan ready', ar: 'احتفظ بخطة جاهزة للاستجابة لحوادث الموردين' },
              ],
            },
          },
        ],
      },
    ],
  },
  {
    id: 'exec-m4',
    badge: { en: 'MODULE 4', ar: 'الوحدة 4' },
    title: { en: 'Incident Communication & Crisis Management', ar: 'التواصل في الحوادث وإدارة الأزمات' },
    badgeColor: 'var(--accent-primary)',
    badgeBg: 'rgba(0, 240, 255, 0.15)',
    videoKey: 'crisis_communication',
    concepts: [
      {
        id: 'exec-m4-c1',
        title: { en: 'Why Communication Matters', ar: 'لماذا يهم التواصل' },
        videoKey: 'crisis_communication',
        body: [
          {
            kind: 'paragraph',
            text: {
              en: 'When a breach occurs, executive decisions in the first hours determine the outcome. Poor communication can amplify financial and reputational damage beyond the technical impact of the breach itself.',
              ar: 'عند وقوع اختراق، تحدد القرارات التنفيذية في الساعات الأولى النتيجة النهائية. وسوء التواصل قد يُضخّم الأضرار المالية والسمعة بما يفوق التأثير التقني للاختراق ذاته.',
            },
          },
          {
            kind: 'columns3',
            columns: [
              { title: { en: 'Internal', ar: 'داخلي' }, titleColor: 'var(--accent-primary)', points: [
                { en: 'Activate incident response team', ar: 'تفعيل فريق الاستجابة للحوادث' },
                { en: 'Brief legal counsel immediately', ar: 'إبلاغ المستشار القانوني فوراً' },
                { en: 'Restrict information to need-to-know', ar: 'حصر المعلومات على من يحتاجها فقط' },
              ] },
              { title: { en: 'Regulatory', ar: 'تنظيمي' }, titleColor: 'var(--accent-warning)', points: [
                { en: 'Identify notification requirements (GDPR: 72h)', ar: 'تحديد متطلبات الإبلاغ (GDPR: 72 ساعة)' },
                { en: 'Document timeline and containment steps', ar: 'توثيق الجدول الزمني وخطوات الاحتواء' },
                { en: 'Engage external legal if cross-border', ar: 'إشراك مستشار قانوني خارجي إذا كان الاختراق عابراً للحدود' },
              ] },
              { title: { en: 'Public', ar: 'علني' }, titleColor: 'var(--accent-danger)', points: [
                { en: 'Coordinate messaging with PR team', ar: 'تنسيق الرسائل مع فريق العلاقات العامة' },
                { en: 'Never speculate on scope or cause', ar: 'لا تخمّن نطاق الحادث أو سببه أبداً' },
                { en: 'Provide actionable guidance to affected parties', ar: 'تقديم إرشادات عملية للأطراف المتضررة' },
              ] },
            ],
          },
        ],
      },
    ],
  },
]

const EXECUTIVE_SCENARIOS: AwarenessScenario[] = [
  { id: 'exec-s1', title: { en: 'CEO Fraud / BEC Attack', ar: 'احتيال انتحال المدير التنفيذي / هجوم BEC' }, description: { en: 'An attacker compromises or spoofs the CEO\'s email account and sends an urgent wire transfer request to the finance team, citing a confidential acquisition that must close today.', ar: 'يخترق المهاجم بريد المدير التنفيذي أو ينتحله ويرسل طلباً عاجلاً لتحويل مالي إلى فريق المالية مدّعياً صفقة استحواذ سرية يجب إنجازها اليوم.' }, color: 'var(--accent-danger)', videoKey: 'ceo_fraud' },
  { id: 'exec-s2', title: { en: 'Board-Level Whaling', ar: 'هجوم صيد حيتان على مستوى مجلس الإدارة' }, description: { en: 'A threat actor creates a fake board portal login page and sends personalised invitations to board members before a quarterly meeting, harvesting credentials for strategic document access.', ar: 'يُنشئ المهاجم صفحة تسجيل دخول مزيفة لبوابة مجلس الإدارة ويرسل دعوات مخصصة لأعضاء المجلس قبل الاجتماع الربع سنوي، فيحصد بيانات الاعتماد للوصول إلى الوثائق الاستراتيجية.' }, color: 'var(--accent-warning)', videoKey: 'whaling_attack' },
  { id: 'exec-s3', title: { en: 'Supply Chain Compromise Briefing', ar: 'إحاطة اختراق سلسلة التوريد' }, description: { en: 'A trusted SaaS vendor suffers a breach, exposing API keys that grant access to your organisation\'s data. The executive team must decide on disclosure timing and remediation strategy.', ar: 'يتعرض مزود خدمة موثوق لاختراق يكشف مفاتيح API تمنح الوصول إلى بيانات مؤسستك. على الفريق التنفيذي اتخاذ القرار بشأن توقيت الإفصاح واستراتيجية المعالجة.' }, color: 'var(--accent-secondary)', videoKey: 'supply_chain_risk' },
]

const EXECUTIVE_QUIZ: AwarenessQuizQuestion[] = [
  {
    id: 'exec-q1', category: 'bec',
    question: { en: 'Your CFO emails you urgently requesting a wire transfer to a new vendor, citing a confidential acquisition. The email looks legitimate. What should you do?', ar: 'يرسل مدير الشؤون المالية رسالة عاجلة يطلب فيها تحويلاً مالياً لمورد جديد، مدّعياً صفقة استحواذ سرية. الرسالة تبدو حقيقية. ماذا تفعل؟' },
    options: [
      { en: 'Process the transfer immediately given the urgency', ar: 'إجراء التحويل فوراً نظراً للاستعجال' },
      { en: 'Reply to the email to confirm the details', ar: 'الرد على الرسالة لتأكيد التفاصيل' },
      { en: 'Verify the request through a separate communication channel (phone call, in-person)', ar: 'التحقق من الطلب عبر قناة تواصل منفصلة (مكالمة هاتفية أو لقاء مباشر)' },
      { en: 'Forward the email to the finance team to handle', ar: 'إعادة توجيه الرسالة لفريق المالية للتعامل معها' },
    ],
    correctIndex: 2,
    explanation: { en: 'Business Email Compromise (BEC) attacks impersonate executives to authorize fraudulent transfers. Always verify unusual financial requests via a separate, trusted channel — never reply to the same email thread.', ar: 'تستهدف هجمات BEC انتحال المسؤولين التنفيذيين لاعتماد تحويلات احتيالية. تحقق دائماً من الطلبات المالية غير المعتادة عبر قناة منفصلة وموثوقة — ولا ترد على نفس سلسلة الرسائل أبداً.' },
  },
  {
    id: 'exec-q2', category: 'compliance',
    question: { en: 'During a board meeting, a member suggests discussing sensitive M&A details over a popular consumer messaging app. What is the appropriate response?', ar: 'خلال اجتماع المجلس، يقترح أحد الأعضاء مناقشة تفاصيل اندماج واستحواذ حساسة عبر تطبيق مراسلة استهلاكي شائع. ما الرد المناسب؟' },
    options: [
      { en: 'Agree — the app uses end-to-end encryption', ar: 'الموافقة — التطبيق يستخدم التشفير من طرف إلى طرف' },
      { en: 'Suggest moving the discussion to an approved enterprise communication platform', ar: 'اقتراح نقل النقاش إلى منصة تواصل مؤسسية معتمدة' },
      { en: 'Continue but avoid naming specific companies', ar: 'الاستمرار مع تجنب ذكر أسماء شركات محددة' },
      { en: 'It is fine as long as messages are deleted afterward', ar: 'لا بأس طالما يتم حذف الرسائل بعد ذلك' },
    ],
    correctIndex: 1,
    explanation: { en: 'Consumer apps are not governed by enterprise data retention, compliance, or DLP policies. Sensitive business discussions must use approved enterprise platforms with proper audit trails.', ar: 'تطبيقات المستهلك لا تخضع لسياسات الاحتفاظ بالبيانات المؤسسية أو الامتثال أو منع تسريب البيانات. النقاشات التجارية الحساسة يجب أن تتم عبر منصات مؤسسية معتمدة مزودة بسجلات تدقيق سليمة.' },
  },
  {
    id: 'exec-q3', category: 'crisis_management',
    question: { en: 'A journalist contacts you about a rumoured data breach at your organisation. You have not been briefed by the security team. What do you do?', ar: 'يتصل بك صحفي بشأن إشاعة عن اختراق بيانات في مؤسستك. لم يُحَط فريق الأمن علماً بعد. ماذا تفعل؟' },
    options: [
      { en: 'Deny the breach to protect the company\'s reputation', ar: 'إنكار الاختراق لحماية سمعة الشركة' },
      { en: 'Provide limited information to control the narrative', ar: 'تقديم معلومات محدودة للتحكم في السرد الإعلامي' },
      { en: 'Decline to comment and immediately notify your legal and communications team', ar: 'رفض التعليق وإبلاغ فريقي الشؤون القانونية والتواصل فوراً' },
      { en: 'Confirm the breach to appear transparent', ar: 'تأكيد الاختراق للظهور بمظهر الشفافية' },
    ],
    correctIndex: 2,
    explanation: { en: 'Unauthorized disclosure — even denial — can have legal and regulatory consequences. All incident-related communications must be coordinated through legal and PR teams.', ar: 'الإفصاح غير المرخص — حتى الإنكار — قد يترتب عليه تبعات قانونية وتنظيمية. كل تواصل يتعلق بالحوادث يجب أن يكون منسقاً عبر فريقي القانون والعلاقات العامة.' },
  },
  {
    id: 'exec-q4', category: 'supply_chain',
    question: { en: 'Your organisation is evaluating a new SaaS vendor. Which security consideration is MOST critical for the executive decision?', ar: 'تقوم مؤسستك بتقييم مزود خدمة SaaS جديد. ما الاعتبار الأمني الأكثر أهمية للقرار التنفيذي؟' },
    options: [
      { en: 'The vendor offers the lowest price', ar: 'يقدم المورد أقل سعر' },
      { en: 'The vendor has SOC 2 Type II certification and clear data residency policies', ar: 'لدى المورد شهادة SOC 2 Type II وسياسات واضحة لإقامة البيانات' },
      { en: 'The vendor\'s CEO is a known industry figure', ar: 'المدير التنفيذي للمورد شخصية معروفة في الصناعة' },
      { en: 'The vendor was recommended by a partner company', ar: 'المورد موصى به من شركة شريكة' },
    ],
    correctIndex: 1,
    explanation: { en: 'Third-party risk is a board-level concern. SOC 2 Type II verifies ongoing security controls, and data residency policies ensure compliance with regulations like GDPR.', ar: 'مخاطر الأطراف الثالثة هي قضية على مستوى المجلس. شهادة SOC 2 Type II تتحقق من استمرارية الضوابط الأمنية، وسياسات إقامة البيانات تضمن الامتثال للوائح مثل GDPR.' },
  },
  {
    id: 'exec-q5', category: 'whaling',
    question: { en: 'An attacker who gains access to an executive\'s email account is MOST dangerous because:', ar: 'المهاجم الذي يحصل على وصول إلى بريد مسؤول تنفيذي يُعدّ الأخطر لأنه:' },
    options: [
      { en: 'Executives have the most complex passwords', ar: 'يستخدم المسؤولون التنفيذيون أعقد كلمات المرور' },
      { en: 'Executive accounts can authorize financial transactions and access strategic data', ar: 'تستطيع حسابات المسؤولين التنفيذيين اعتماد المعاملات المالية والوصول إلى البيانات الاستراتيجية' },
      { en: 'Executive emails contain the most attachments', ar: 'تحتوي رسائل المسؤولين التنفيذيين على أكبر عدد من المرفقات' },
      { en: 'Executives rarely use MFA', ar: 'نادراً ما يستخدم المسؤولون التنفيذيون المصادقة متعددة العوامل' },
    ],
    correctIndex: 1,
    explanation: { en: 'Executive accounts are high-value targets (whaling) because they can authorize wire transfers, access confidential strategy documents, and impersonate leadership to manipulate employees.', ar: 'حسابات المسؤولين التنفيذيين أهداف عالية القيمة (صيد الحيتان) لأنها قادرة على اعتماد التحويلات المالية والوصول إلى الوثائق الاستراتيجية السرية وانتحال القيادة للتلاعب بالموظفين.' },
  },
]

/* ─────────────────────────────── IT / TECHNICAL ─────────────────────────────── */

const IT_TOPICS: AwarenessTopic[] = [
  { id: 'it-t-1', category: 'hardening',          label: { en: 'Secure Configuration & Hardening',         ar: 'الإعداد الآمن والتصلب' }, videoKey: 'hardening_basics' },
  { id: 'it-t-2', category: 'monitoring',         label: { en: 'Monitoring & Log Analysis',                 ar: 'المراقبة وتحليل السجلات' }, videoKey: 'logging_siem' },
  { id: 'it-t-3', category: 'incident_response',  label: { en: 'Incident Response Procedures',              ar: 'إجراءات الاستجابة للحوادث' }, videoKey: 'incident_response' },
  { id: 'it-t-4', category: 'privilege_mgmt',     label: { en: 'Privilege Management & Access Control',      ar: 'إدارة الصلاحيات والتحكم في الوصول' }, videoKey: 'privilege_management' },
  { id: 'it-t-5', category: 'vulnerability_mgmt', label: { en: 'Vulnerability & Patch Management',           ar: 'إدارة الثغرات والتحديثات' }, videoKey: 'vulnerability_mgmt' },
]

const IT_MODULES: AwarenessModule[] = [
  {
    id: 'it-m1',
    badge: { en: 'MODULE 1', ar: 'الوحدة 1' },
    title: { en: 'Secure Configuration & Hardening', ar: 'الإعداد الآمن والتصلب' },
    badgeColor: 'var(--accent-success)',
    badgeBg: 'rgba(0, 255, 136, 0.15)',
    videoKey: 'hardening_basics',
    concepts: [
      {
        id: 'it-m1-c1',
        title: { en: 'Why Hardening Matters', ar: 'لماذا التصلب مهم' },
        videoKey: 'cloud_misconfig',
        body: [
          {
            kind: 'paragraph',
            text: {
              en: 'Misconfiguration is the most common root cause of cloud breaches. Default credentials, open ports, overly permissive IAM policies, and missing encryption are low-hanging fruit for attackers.',
              ar: 'سوء الإعداد هو السبب الجذري الأكثر شيوعاً لاختراقات السحابة. بيانات الاعتماد الافتراضية والمنافذ المفتوحة وسياسات IAM فضفاضة الصلاحيات وغياب التشفير هي أهداف سهلة المنال للمهاجمين.',
            },
          },
          {
            kind: 'twocol',
            left: {
              heading: { en: 'Hardening Essentials', ar: 'أساسيات التصلب' },
              headingColor: 'var(--accent-success)',
              tone: 'positive',
              items: [
                { en: 'Eliminate all default credentials before deployment', ar: 'إلغاء جميع بيانات الاعتماد الافتراضية قبل النشر' },
                { en: 'Disable unnecessary services and ports', ar: 'تعطيل الخدمات والمنافذ غير الضرورية' },
                { en: 'Enforce TLS 1.2+ for all communications', ar: 'فرض استخدام TLS 1.2+ في جميع الاتصالات' },
                { en: 'Use infrastructure-as-code with security linting', ar: 'استخدام البنية التحتية كرمز مع فحص أمني تلقائي' },
                { en: 'Apply CIS Benchmarks for OS and service hardening', ar: 'تطبيق معايير CIS Benchmarks لتصلب الأنظمة والخدمات' },
              ],
            },
            right: {
              heading: { en: 'Access Control', ar: 'التحكم في الوصول' },
              headingColor: 'var(--accent-success)',
              tone: 'positive',
              items: [
                { en: 'Implement least-privilege for all service accounts', ar: 'تطبيق مبدأ أقل الصلاحيات لجميع حسابات الخدمة' },
                { en: 'Use time-bound access for elevated privileges', ar: 'استخدام وصول محدد بمدة زمنية للصلاحيات المرتفعة' },
                { en: 'Rotate secrets and API keys on a schedule', ar: 'تدوير الأسرار ومفاتيح API وفق جدول منتظم' },
                { en: 'Separate development, staging, and production environments', ar: 'الفصل بين بيئات التطوير والاختبار والإنتاج' },
                { en: 'Audit IAM policies quarterly', ar: 'مراجعة سياسات IAM ربع سنوياً' },
              ],
            },
          },
        ],
      },
    ],
  },
  {
    id: 'it-m2',
    badge: { en: 'MODULE 2', ar: 'الوحدة 2' },
    title: { en: 'Monitoring, Logging & Detection', ar: 'المراقبة والتسجيل والكشف' },
    badgeColor: 'var(--accent-primary)',
    badgeBg: 'rgba(0, 240, 255, 0.15)',
    videoKey: 'logging_siem',
    concepts: [
      {
        id: 'it-m2-c1',
        title: { en: 'Detection Requires Telemetry', ar: 'الكشف يتطلب بيانات قياس' },
        videoKey: 'logging_siem',
        body: [
          {
            kind: 'paragraph',
            text: {
              en: 'Detection is only as good as your logging. Blind spots in telemetry are blind spots in your security posture. The goal is not to log everything, but to log the right things and correlate them effectively.',
              ar: 'جودة الكشف تعتمد على جودة التسجيل. النقاط العمياء في القياس هي نقاط عمياء في وضعك الأمني. الهدف ليس تسجيل كل شيء، بل تسجيل ما هو مهم والربط بينه بفعالية.',
            },
          },
          {
            kind: 'list',
            heading: { en: 'Critical Log Sources', ar: 'مصادر السجلات الحيوية' },
            headingColor: 'var(--accent-primary)',
            items: [
              { en: 'Authentication events: All login attempts (success and failure), MFA challenges, token issuance', ar: 'أحداث المصادقة: جميع محاولات تسجيل الدخول (الناجحة والفاشلة)، تحديات MFA، إصدار الرموز' },
              { en: 'Authorization changes: Role assignments, privilege escalation, sudo usage, policy modifications', ar: 'تغييرات التفويض: إسناد الأدوار، تصعيد الصلاحيات، استخدام sudo، تعديلات السياسات' },
              { en: 'Network telemetry: Firewall logs, DNS queries, VPN connections, unusual outbound traffic', ar: 'بيانات قياس الشبكة: سجلات جدار الحماية، استعلامات DNS، اتصالات VPN، حركة صادرة غير معتادة' },
              { en: 'Data access: Database queries, file access patterns, API call volumes, data exports', ar: 'الوصول إلى البيانات: استعلامات قواعد البيانات، أنماط الوصول إلى الملفات، حجم استدعاءات API، عمليات تصدير البيانات' },
            ],
          },
          {
            kind: 'callout',
            tone: 'info',
            title: { en: 'Best Practice', ar: 'أفضل ممارسة' },
            text: {
              en: 'Centralise logs in a SIEM (e.g., OpenSearch, Splunk) with automated alerting. Set retention policies that meet compliance requirements. Ensure log integrity — attackers who gain access will attempt to clear their tracks (T1070.001).',
              ar: 'وحّد السجلات في نظام SIEM (مثل OpenSearch أو Splunk) مع تنبيهات آلية. اعتمد سياسات احتفاظ تلبي متطلبات الامتثال. اضمن سلامة السجلات — فالمهاجمون الذين يحصلون على الوصول يحاولون مسح آثارهم (T1070.001).',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'it-m3',
    badge: { en: 'MODULE 3', ar: 'الوحدة 3' },
    title: { en: 'Incident Response Procedures', ar: 'إجراءات الاستجابة للحوادث' },
    badgeColor: 'var(--accent-danger)',
    badgeBg: 'rgba(255, 0, 60, 0.15)',
    videoKey: 'incident_response',
    concepts: [
      {
        id: 'it-m3-c1',
        title: { en: 'The Four Phases', ar: 'المراحل الأربع' },
        videoKey: 'incident_response',
        body: [
          {
            kind: 'phases',
            phases: [
              { number: '1', title: { en: 'Identify', ar: 'التعرف' }, description: { en: 'Detect and validate the incident. Determine scope, affected systems, and initial indicators of compromise.', ar: 'اكتشف الحادث وتحقق منه. حدد النطاق والأنظمة المتأثرة والمؤشرات الأولية للاختراق.' }, color: 'var(--accent-primary)' },
              { number: '2', title: { en: 'Contain', ar: 'الاحتواء' }, description: { en: 'Isolate affected systems. Block malicious IPs/domains. Preserve evidence before any changes.', ar: 'اعزل الأنظمة المتأثرة. احجب عناوين IP والنطاقات الخبيثة. احفظ الأدلة قبل أي تغييرات.' }, color: 'var(--accent-warning)' },
              { number: '3', title: { en: 'Eradicate', ar: 'الاستئصال' }, description: { en: 'Remove attacker access. Patch vulnerabilities. Reset compromised credentials. Verify no backdoors remain.', ar: 'أزل وصول المهاجم. عالج الثغرات. أعد تعيين بيانات الاعتماد المخترقة. تحقق من عدم بقاء أي أبواب خلفية.' }, color: 'var(--accent-danger)' },
              { number: '4', title: { en: 'Recover', ar: 'الاستعادة' }, description: { en: 'Restore systems from clean backups. Monitor for re-compromise. Conduct lessons-learned review.', ar: 'استعد الأنظمة من نسخ احتياطية نظيفة. راقب احتمال إعادة الاختراق. أجرِ مراجعة الدروس المستفادة.' }, color: 'var(--accent-success)' },
            ],
          },
          {
            kind: 'paragraph',
            text: {
              en: 'Key principle: never power off a compromised system unless absolutely necessary. Network isolation preserves volatile memory evidence (running processes, network connections, encryption keys) that is destroyed on shutdown.',
              ar: 'مبدأ أساسي: لا تطفئ نظاماً مخترقاً إلا للضرورة القصوى. عزل الشبكة يحافظ على أدلة الذاكرة المؤقتة (العمليات النشطة، اتصالات الشبكة، مفاتيح التشفير) التي تُفقد عند الإطفاء.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'it-m4',
    badge: { en: 'MODULE 4', ar: 'الوحدة 4' },
    title: { en: 'Privilege Abuse & Insider Threats', ar: 'إساءة استخدام الصلاحيات والتهديدات الداخلية' },
    badgeColor: 'var(--accent-warning)',
    badgeBg: 'rgba(255, 170, 0, 0.15)',
    videoKey: 'insider_threats',
    concepts: [
      {
        id: 'it-m4-c1',
        title: { en: 'Detection and Prevention', ar: 'الكشف والوقاية' },
        videoKey: 'insider_threats',
        body: [
          {
            kind: 'paragraph',
            text: {
              en: 'Insider threats — whether malicious or negligent — are among the hardest to detect because the actor already has legitimate access. Technical controls must focus on anomaly detection and least-privilege enforcement.',
              ar: 'التهديدات الداخلية — سواء كانت كيدية أو ناتجة عن إهمال — من أصعب التهديدات اكتشافاً لأن الفاعل يمتلك أصلاً وصولاً مشروعاً. ضوابط التحكم التقنية يجب أن تركز على كشف الشذوذ وفرض مبدأ أقل الصلاحيات.',
            },
          },
          {
            kind: 'twocol',
            left: {
              heading: { en: 'Indicators to Monitor', ar: 'مؤشرات يجب مراقبتها' },
              headingColor: 'var(--accent-danger)',
              tone: 'negative',
              items: [
                { en: 'Access to data outside normal job function', ar: 'الوصول إلى بيانات خارج نطاق الوظيفة المعتاد' },
                { en: 'Large data downloads or exports', ar: 'تنزيل أو تصدير كميات كبيرة من البيانات' },
                { en: 'Activity outside normal working hours', ar: 'نشاط خارج ساعات العمل المعتادة' },
                { en: 'Attempts to bypass DLP controls', ar: 'محاولات تجاوز ضوابط منع تسريب البيانات (DLP)' },
                { en: 'Escalation of privileges without a ticket', ar: 'تصعيد الصلاحيات دون تذكرة موثقة' },
              ],
            },
            right: {
              heading: { en: 'Preventive Controls', ar: 'ضوابط وقائية' },
              headingColor: 'var(--accent-success)',
              tone: 'positive',
              items: [
                { en: 'Enforce separation of duties for critical operations', ar: 'فرض الفصل بين المهام للعمليات الحرجة' },
                { en: 'Require peer review for production changes', ar: 'اشتراط مراجعة الأقران للتغييرات في الإنتاج' },
                { en: 'Implement just-in-time access provisioning', ar: 'تطبيق منح الوصول عند الحاجة (JIT)' },
                { en: 'Conduct regular access reviews and deprovisioning', ar: 'إجراء مراجعات منتظمة للوصول وإلغاء الصلاحيات' },
                { en: 'Use UEBA tools for behavioural anomaly detection', ar: 'استخدام أدوات UEBA للكشف عن الشذوذ السلوكي' },
              ],
            },
          },
        ],
      },
    ],
  },
]

const IT_SCENARIOS: AwarenessScenario[] = [
  { id: 'it-s1', title: { en: 'Misconfigured Cloud Storage', ar: 'تخزين سحابي مُعدّ بشكل خاطئ' }, description: { en: 'An S3 bucket containing customer PII is discovered publicly accessible due to a Terraform misconfiguration. The team must contain the exposure, assess data loss, and coordinate disclosure.', ar: 'يُكتَشف أن دلواً (bucket) في S3 يحتوي على بيانات تعريف شخصية للعملاء أصبح متاحاً للعموم بسبب خطأ في إعداد Terraform. على الفريق احتواء التسريب وتقييم حجم الضرر وتنسيق الإفصاح.' }, color: 'var(--accent-danger)', videoKey: 'cloud_misconfig' },
  { id: 'it-s2', title: { en: 'Privilege Escalation via Service Account', ar: 'تصعيد الصلاحيات عبر حساب خدمة' }, description: { en: 'An attacker gains access to a low-privilege service account and exploits overly permissive IAM roles to escalate to admin. Detection depends on proper audit logging of role assumption events.', ar: 'يحصل المهاجم على وصول إلى حساب خدمة منخفض الصلاحية ويستغل أدوار IAM فضفاضة للتصعيد إلى صلاحيات إدارية. يعتمد الكشف على تسجيل تدقيق سليم لأحداث افتراض الأدوار.' }, color: 'var(--accent-warning)', videoKey: 'privilege_management' },
  { id: 'it-s3', title: { en: 'Insider Threat — Data Exfiltration', ar: 'تهديد داخلي — تسريب بيانات' }, description: { en: 'A disgruntled employee with database access begins exporting large volumes of customer data to a personal cloud account outside business hours. DLP and UEBA must catch the anomaly.', ar: 'يبدأ موظف مستاء يمتلك وصولاً إلى قاعدة البيانات بتصدير كميات كبيرة من بيانات العملاء إلى حساب سحابي شخصي خارج ساعات العمل. يجب على أدوات DLP وUEBA رصد هذا الشذوذ.' }, color: 'var(--accent-secondary)', videoKey: 'data_exfiltration' },
]

const IT_QUIZ: AwarenessQuizQuestion[] = [
  {
    id: 'it-q1', category: 'privilege_mgmt',
    question: { en: 'A developer requests temporary admin access to a production database for debugging. What is the correct approach?', ar: 'يطلب أحد المطورين وصولاً إدارياً مؤقتاً إلى قاعدة بيانات الإنتاج لأغراض التصحيح. ما الإجراء الصحيح؟' },
    options: [
      { en: 'Grant permanent admin access to avoid repeated requests', ar: 'منحه وصولاً إدارياً دائماً لتجنب الطلبات المتكررة' },
      { en: 'Grant time-limited access with logging enabled and require a change ticket', ar: 'منحه وصولاً محدود المدة مع تفعيل التسجيل واشتراط تذكرة تغيير' },
      { en: 'Let them use a shared admin account', ar: 'السماح له باستخدام حساب إداري مشترك' },
      { en: 'Deny the request entirely — developers should never touch production', ar: 'رفض الطلب تماماً — لا ينبغي للمطورين أبداً لمس بيئة الإنتاج' },
    ],
    correctIndex: 1,
    explanation: { en: 'Follow the principle of least privilege with time-bound access. Require a change ticket for audit trails, enable session logging, and revoke access automatically after the window expires.', ar: 'اتبع مبدأ أقل الصلاحيات مع وصول محدد بمدة. اشترط تذكرة تغيير لأغراض التدقيق، فعّل تسجيل الجلسات، واسحب الوصول تلقائياً بعد انتهاء النافذة الزمنية.' },
  },
  {
    id: 'it-q2', category: 'incident_response',
    question: { en: 'You discover that a critical server has been running with default credentials for 6 months. What is the FIRST action?', ar: 'تكتشف أن خادماً حيوياً ظل يعمل ببيانات اعتماد افتراضية لمدة 6 أشهر. ما الإجراء الأول؟' },
    options: [
      { en: 'Change the credentials immediately and close the ticket', ar: 'تغيير بيانات الاعتماد فوراً وإغلاق التذكرة' },
      { en: 'Investigate whether the credentials were exploited before changing them', ar: 'التحقق مما إذا كانت بيانات الاعتماد قد استُغلت قبل تغييرها' },
      { en: 'Report it to management and wait for instructions', ar: 'إبلاغ الإدارة وانتظار التعليمات' },
      { en: 'Shut down the server to prevent further exposure', ar: 'إيقاف الخادم لمنع المزيد من التعرض' },
    ],
    correctIndex: 1,
    explanation: { en: 'Before remediating, investigate for indicators of compromise. Changing credentials without checking for existing access could allow an attacker with a backdoor to persist undetected.', ar: 'قبل المعالجة، تحقق من مؤشرات الاختراق. تغيير بيانات الاعتماد دون التحقق من وجود وصول قائم قد يسمح لمهاجم لديه باب خلفي بالاستمرار دون كشف.' },
  },
  {
    id: 'it-q3', category: 'incident_response',
    question: { en: 'During an incident, you identify a compromised host beaconing to a C2 server. What is the preferred containment approach?', ar: 'خلال حادث أمني، تحدد جهازاً مخترقاً يرسل إشارات إلى خادم قيادة وسيطرة (C2). ما النهج الأمثل للاحتواء؟' },
    options: [
      { en: 'Immediately power off the machine', ar: 'إيقاف تشغيل الجهاز فوراً' },
      { en: 'Isolate the host from the network while keeping it running for forensic analysis', ar: 'عزل الجهاز عن الشبكة مع إبقائه قيد التشغيل للتحليل الجنائي الرقمي' },
      { en: 'Block the C2 IP at the firewall and continue monitoring', ar: 'حجب عنوان IP الخاص بـ C2 في جدار الحماية ومتابعة المراقبة' },
      { en: 'Reimage the machine immediately', ar: 'إعادة تثبيت نظام الجهاز فوراً' },
    ],
    correctIndex: 1,
    explanation: { en: 'Network isolation preserves forensic evidence (memory, running processes, network connections) while stopping lateral movement. Powering off destroys volatile memory evidence.', ar: 'عزل الشبكة يحافظ على الأدلة الجنائية الرقمية (الذاكرة، العمليات النشطة، اتصالات الشبكة) ويوقف الحركة الجانبية. إيقاف التشغيل يدمر أدلة الذاكرة المتطايرة.' },
  },
  {
    id: 'it-q4', category: 'vulnerability_mgmt',
    question: { en: 'A security scan reveals a critical CVE in a production dependency. The patch requires a major version upgrade that may break compatibility. What should you do?', ar: 'يكشف فحص أمني عن ثغرة CVE حرجة في إحدى مكتبات الإنتاج. التحديث يتطلب ترقية إصدار رئيسية قد تكسر التوافق. ماذا تفعل؟' },
    options: [
      { en: 'Apply the patch immediately to production', ar: 'تطبيق التحديث فوراً على الإنتاج' },
      { en: 'Ignore it — the vulnerability is theoretical', ar: 'تجاهلها — الثغرة نظرية' },
      { en: 'Assess exploitability, apply compensating controls if needed, and schedule a tested upgrade', ar: 'تقييم قابلية الاستغلال، تطبيق ضوابط تعويضية عند الحاجة، وجدولة ترقية مُختبَرة' },
      { en: 'Roll back to an older version that is not affected', ar: 'العودة إلى إصدار أقدم غير متأثر' },
    ],
    correctIndex: 2,
    explanation: { en: 'Critical CVEs require risk-based assessment: check if the vulnerability is exploitable in your environment, apply WAF rules or network controls as compensating measures, then plan a tested upgrade.', ar: 'الثغرات الحرجة تتطلب تقييماً قائماً على المخاطر: تحقق من قابلية الاستغلال في بيئتك، طبّق قواعد WAF أو ضوابط شبكية كإجراءات تعويضية، ثم خطّط لترقية مُختبَرة.' },
  },
  {
    id: 'it-q5', category: 'monitoring',
    question: { en: 'Which logging practice is MOST effective for detecting privilege escalation attempts?', ar: 'أي ممارسة تسجيل هي الأكثر فعالية في كشف محاولات تصعيد الصلاحيات؟' },
    options: [
      { en: 'Logging all HTTP 200 responses', ar: 'تسجيل جميع استجابات HTTP 200' },
      { en: 'Logging failed login attempts only', ar: 'تسجيل محاولات الدخول الفاشلة فقط' },
      { en: 'Logging all privilege changes, sudo usage, and access to sensitive resources with correlation', ar: 'تسجيل جميع تغييرات الصلاحيات واستخدام sudo والوصول إلى الموارد الحساسة مع الربط بينها' },
      { en: 'Logging disk usage metrics', ar: 'تسجيل مقاييس استخدام القرص' },
    ],
    correctIndex: 2,
    explanation: { en: 'Privilege escalation detection requires visibility into authorization changes (role assignments, sudo events, sensitive file access) with correlation to identify attack chains across multiple events.', ar: 'يتطلب كشف تصعيد الصلاحيات رؤية كاملة لتغييرات التفويض (إسناد الأدوار، أحداث sudo، الوصول إلى الملفات الحساسة) مع الربط بينها لتحديد سلاسل الهجوم عبر أحداث متعددة.' },
  },
]

/* ───────────────────────────── Category Manifest ───────────────────────────── */

export const AWARENESS_CATEGORIES: AwarenessCategory[] = [
  {
    id: 'employees',
    label: { en: 'Employees', ar: 'الموظفون' },
    description: {
      en: 'Foundational security training for all organisation personnel. Covers the essential threats and best practices every employee must understand to protect themselves and the systems they use daily.',
      ar: 'تدريب أمني تأسيسي لجميع موظفي المؤسسة. يغطي التهديدات الأساسية وأفضل الممارسات التي يجب على كل موظف فهمها لحماية نفسه والأنظمة التي يستخدمها يومياً.',
    },
    color: 'var(--accent-primary)',
    hex: '#00f0ff',
    topics: EMPLOYEE_TOPICS,
    modules: EMPLOYEE_MODULES,
    scenarios: EMPLOYEE_SCENARIOS,
    quiz: EMPLOYEE_QUIZ,
    passThreshold: 4,
  },
  {
    id: 'executives',
    label: { en: 'Executives', ar: 'المسؤولون التنفيذيون' },
    description: {
      en: 'Strategic security awareness for senior leadership and decision-makers. Focuses on high-value targeted attacks, regulatory obligations, and the business impact of security decisions.',
      ar: 'وعي أمني استراتيجي لكبار القادة وصُنّاع القرار. يركز على الهجمات المستهدفة عالية القيمة والالتزامات التنظيمية والأثر التجاري للقرارات الأمنية.',
    },
    color: 'var(--accent-warning)',
    hex: '#ffaa00',
    topics: EXECUTIVE_TOPICS,
    modules: EXECUTIVE_MODULES,
    scenarios: EXECUTIVE_SCENARIOS,
    quiz: EXECUTIVE_QUIZ,
    passThreshold: 4,
  },
  {
    id: 'it-staff',
    label: { en: 'IT / Technical', ar: 'تقنية المعلومات / الفني' },
    description: {
      en: 'Advanced security training for IT administrators, developers, and security engineers. Covers operational security, hardening, monitoring, and incident response procedures.',
      ar: 'تدريب أمني متقدم لمشرفي تقنية المعلومات والمطورين ومهندسي الأمن. يغطي الأمن التشغيلي والتصلب والمراقبة وإجراءات الاستجابة للحوادث.',
    },
    color: 'var(--accent-success)',
    hex: '#00ff88',
    topics: IT_TOPICS,
    modules: IT_MODULES,
    scenarios: IT_SCENARIOS,
    quiz: IT_QUIZ,
    passThreshold: 4,
  },
]

/* ───────────────────────────── Pre-Assessment Bank ───────────────────────────── */

/**
 * Cross-track pre-assessment questions. Each question maps to a weak-area category
 * shared with AwarenessTopic.category so the recommender can suggest the matching
 * topic + lesson combinations after grading.
 */
export interface PreAssessmentQuestion {
  id: string
  category: string
  /** Human-friendly category label for the result chart. */
  categoryLabel: Bilingual
  question: Bilingual
  options: Bilingual[]
  correctIndex: number
  explanation: Bilingual
}

export const PRE_ASSESSMENT_QUESTIONS: PreAssessmentQuestion[] = [
  {
    id: 'pa-1', category: 'phishing',
    categoryLabel: { en: 'Phishing & Social Engineering', ar: 'التصيد الاحتيالي والهندسة الاجتماعية' },
    question: { en: 'An email from "billing@paypa1.com" asks you to update your payment method by clicking a link. Best action?', ar: 'تطلب منك رسالة بريد من "billing@paypa1.com" تحديث وسيلة الدفع بالنقر على رابط. ما الإجراء الأمثل؟' },
    options: [
      { en: 'Click the link to update quickly', ar: 'النقر على الرابط للتحديث سريعاً' },
      { en: 'Reply asking if it is real', ar: 'الرد بسؤال عما إذا كانت الرسالة حقيقية' },
      { en: 'Do not click; report it via the official channel', ar: 'عدم النقر والإبلاغ عبر القناة الرسمية' },
      { en: 'Forward to colleagues', ar: 'إعادة التوجيه للزملاء' },
    ],
    correctIndex: 2,
    explanation: { en: 'The look-alike domain ("paypa1" with a 1 instead of l) is a phishing red flag.', ar: 'النطاق المتشابه ("paypa1" بالرقم 1 بدل الحرف l) علامة تصيد واضحة.' },
  },
  {
    id: 'pa-2', category: 'passwords_mfa',
    categoryLabel: { en: 'Passwords & MFA', ar: 'كلمات المرور والمصادقة متعددة العوامل' },
    question: { en: 'Which password practice provides the strongest protection?', ar: 'أي ممارسة لكلمات المرور توفر أقوى حماية؟' },
    options: [
      { en: 'A 12-character password reused across accounts', ar: 'كلمة مرور من 12 حرفاً مُعاد استخدامها في عدة حسابات' },
      { en: 'A unique long passphrase + MFA per account', ar: 'عبارة مرور طويلة فريدة + مصادقة متعددة العوامل لكل حساب' },
      { en: 'A short complex password rotated weekly', ar: 'كلمة مرور قصيرة معقدة تُغيَّر أسبوعياً' },
      { en: 'A memorable password written on paper', ar: 'كلمة مرور سهلة التذكر مكتوبة على ورق' },
    ],
    correctIndex: 1,
    explanation: { en: 'Length + uniqueness + MFA together neutralise the most common credential attacks.', ar: 'الطول + التفرد + المصادقة متعددة العوامل معاً يبطلون أشهر هجمات بيانات الاعتماد.' },
  },
  {
    id: 'pa-3', category: 'data_protection',
    categoryLabel: { en: 'Data Protection', ar: 'حماية البيانات' },
    question: { en: 'You discover internal documents on a public link. What do you do first?', ar: 'تجد مستندات داخلية في رابط عام. ما أول إجراء تتخذه؟' },
    options: [
      { en: 'Download them to a personal drive', ar: 'تنزيلها على قرص شخصي' },
      { en: 'Share the link with colleagues', ar: 'مشاركة الرابط مع الزملاء' },
      { en: 'Report it to security immediately', ar: 'الإبلاغ لفريق الأمن فوراً' },
      { en: 'Try to delete them yourself', ar: 'محاولة حذفها بنفسك' },
    ],
    correctIndex: 2,
    explanation: { en: 'Data exposures must be reported through the official security channel — do not redistribute.', ar: 'يجب الإبلاغ عن تسريب البيانات عبر قناة الأمن الرسمية — دون إعادة توزيعها.' },
  },
  {
    id: 'pa-4', category: 'safe_browsing',
    categoryLabel: { en: 'Safe Browsing & Email', ar: 'التصفح الآمن والبريد الإلكتروني' },
    question: { en: 'A pop-up says your computer is infected and asks you to install a "scanner." You should:', ar: 'تظهر نافذة منبثقة تدّعي أن جهازك مصاب وتطلب تثبيت "ماسح ضوئي". يجب أن:' },
    options: [
      { en: 'Install it to scan immediately', ar: 'تثبيته للفحص فوراً' },
      { en: 'Close the browser and report the alert', ar: 'إغلاق المتصفح والإبلاغ عن التنبيه' },
      { en: 'Click the close button on the pop-up', ar: 'النقر على زر الإغلاق في النافذة' },
      { en: 'Reboot the computer', ar: 'إعادة تشغيل الجهاز' },
    ],
    correctIndex: 1,
    explanation: { en: 'Scareware pop-ups are malware delivery vectors. Close the browser process safely and report.', ar: 'النوافذ التحذيرية الكاذبة وسيلة لتوزيع البرمجيات الخبيثة. أغلق المتصفح بأمان وأبلغ عنها.' },
  },
  {
    id: 'pa-5', category: 'incident_reporting',
    categoryLabel: { en: 'Incident Reporting', ar: 'الإبلاغ عن الحوادث' },
    question: { en: 'You suspect you clicked a phishing link. What is the right first step?', ar: 'تشتبه بأنك نقرت على رابط تصيد. ما الخطوة الصحيحة الأولى؟' },
    options: [
      { en: 'Do nothing if no error appeared', ar: 'عدم فعل شيء إذا لم تظهر رسالة خطأ' },
      { en: 'Disconnect from the network and notify security immediately', ar: 'فصل الجهاز عن الشبكة وإبلاغ فريق الأمن فوراً' },
      { en: 'Re-image your laptop yourself', ar: 'إعادة تثبيت نظام جهازك بنفسك' },
      { en: 'Tell only your direct manager next week', ar: 'إخبار مديرك المباشر فقط في الأسبوع القادم' },
    ],
    correctIndex: 1,
    explanation: { en: 'Speed matters. Isolating the host limits damage; security must be looped in immediately.', ar: 'السرعة عامل حاسم. عزل الجهاز يحدّ من الضرر، ويجب إبلاغ فريق الأمن فوراً.' },
  },
  {
    id: 'pa-6', category: 'bec',
    categoryLabel: { en: 'Business Email Compromise', ar: 'اختراق البريد الإلكتروني للأعمال' },
    question: { en: 'A C-level email demands an urgent wire transfer to a new vendor. Best response?', ar: 'رسالة من مسؤول تنفيذي تطلب تحويلاً مالياً عاجلاً لمورد جديد. ما الرد الأمثل؟' },
    options: [
      { en: 'Process it — urgency from leadership matters', ar: 'تنفيذه — استعجال القيادة مهم' },
      { en: 'Reply to confirm', ar: 'الرد للتأكيد' },
      { en: 'Verify out-of-band via phone before any action', ar: 'التحقق عبر قناة منفصلة (هاتف) قبل أي إجراء' },
      { en: 'Forward to your team to handle', ar: 'إعادة التوجيه للفريق للتعامل معه' },
    ],
    correctIndex: 2,
    explanation: { en: 'BEC attacks weaponise urgency. Always verify via a second trusted channel.', ar: 'هجمات BEC تستغل الاستعجال. تحقق دائماً عبر قناة ثانية موثوقة.' },
  },
  {
    id: 'pa-7', category: 'monitoring',
    categoryLabel: { en: 'Monitoring & Logging', ar: 'المراقبة والتسجيل' },
    question: { en: 'Which log signal is most useful for catching credential misuse?', ar: 'أي إشارة سجل أكثر فائدة لرصد إساءة استخدام بيانات الاعتماد؟' },
    options: [
      { en: 'Disk space usage', ar: 'استخدام مساحة القرص' },
      { en: 'Anomalous login locations + MFA failures', ar: 'مواقع تسجيل دخول شاذة + فشل المصادقة متعددة العوامل' },
      { en: 'Number of files opened', ar: 'عدد الملفات المفتوحة' },
      { en: 'CPU usage', ar: 'استخدام وحدة المعالجة المركزية' },
    ],
    correctIndex: 1,
    explanation: { en: 'Location/time anomalies and MFA failure spikes are strong indicators of compromise.', ar: 'الشذوذ في الموقع/الوقت وارتفاع فشل المصادقة مؤشرات قوية على الاختراق.' },
  },
  {
    id: 'pa-8', category: 'privilege_mgmt',
    categoryLabel: { en: 'Privilege Management', ar: 'إدارة الصلاحيات' },
    question: { en: 'Best practice for granting admin access for a one-time task?', ar: 'الممارسة المثلى لمنح صلاحيات إدارية لمهمة لمرة واحدة؟' },
    options: [
      { en: 'Grant permanent admin rights', ar: 'منح صلاحيات إدارية دائمة' },
      { en: 'Share a team admin account', ar: 'مشاركة حساب إداري للفريق' },
      { en: 'Time-bound just-in-time access with logging', ar: 'وصول لحظي محدد بالوقت مع تسجيل كامل' },
      { en: 'Disable logging to speed up the task', ar: 'تعطيل التسجيل لتسريع المهمة' },
    ],
    correctIndex: 2,
    explanation: { en: 'Just-in-time, audited access enforces least privilege and accountability.', ar: 'الوصول اللحظي المُدقَّق يفرض مبدأ أقل الصلاحيات والمساءلة.' },
  },
]
