/**
 * CityShield centralized i18n.
 *
 * Two coexisting translation surfaces:
 *
 *  1. `tk(key)` — keyed strings for app chrome (Nav, modals, page headers, ...).
 *     The dictionary lives in this file. Adding a new label means adding the
 *     key here + an `ar` entry; otherwise the EN fallback is used.
 *
 *  2. `t(bilingual)` — inline `{en, ar}` objects (used heavily by the
 *     Awareness manifest and similar long-form content). Kept stable so the
 *     Phase 1 content does not have to be rewritten.
 *
 * Persistence + sync: language choice is held in `localStorage` and broadcast
 * via the `cityshield-lang` `CustomEvent` so any hook subscribed via
 * `useLang()` rerenders without a context provider.
 */

import type { Bilingual } from '../data/awarenessContent'

export type Lang = 'en' | 'ar'

export const LANG_STORAGE_KEY = 'cityshield_lang'
export const LANG_EVENT = 'cityshield-lang'

/** Read persisted language (SSR-safe). */
export function readStoredLang(): Lang {
  if (typeof window === 'undefined') return 'en'
  const v = window.localStorage.getItem(LANG_STORAGE_KEY)
  return v === 'ar' ? 'ar' : 'en'
}

/** Persist + broadcast a language change. */
export function persistLang(next: Lang): void {
  window.localStorage.setItem(LANG_STORAGE_KEY, next)
  window.dispatchEvent(new CustomEvent<Lang>(LANG_EVENT, { detail: next }))
}

/* ──────────────────────────── Dictionaries ──────────────────────────── */

const en = {
  // global
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.create': 'Create',
  'common.loading': 'Loading…',
  'common.search': 'Search',
  'common.actions': 'Actions',
  'common.status': 'Status',
  'common.username': 'Username',
  'common.email': 'Email',
  'common.role': 'Role',
  'common.created': 'Created',
  'common.required': 'Required',
  'common.none': '—',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.active': 'Active',
  'common.inactive': 'Inactive',
  'common.optional': 'optional',
  'common.submit': 'Submit',
  'common.reset': 'Reset',
  'common.error': 'Error',
  'common.success': 'Success',
  'common.try_again': 'Try Again',
  'common.retake': 'Retake',
  'common.passed': 'Passed',
  'common.failed': 'Failed',
  'common.view': 'View',
  'common.logout': 'Logout',

  // nav
  'nav.dashboard': 'Dashboard',
  'nav.smart_city': 'Smart City',
  'nav.alerts': 'Alerts',
  'nav.devices': 'Devices',
  'nav.scenarios': 'Scenarios',
  'nav.rules': 'Rules',
  'nav.resolutions': 'Resolutions',
  'nav.awareness': 'Awareness',
  'nav.team': 'Team',
  'nav.proposals': 'Proposals',
  'nav.users': 'Users',
  'nav.attack_live': 'ATTACK LIVE',
  'nav.user': 'User',
  'nav.unknown_role': 'Unknown',

  // login
  'login.title': 'CityShield',
  'login.subtitle': 'Smart City Cyber Range',
  'login.username': 'Username',
  'login.password': 'Password',
  'login.submit': 'Sign In',
  'login.signing_in': 'Signing in…',
  'login.error': 'Invalid username or password',

  // alerts
  'alerts.title': 'Alerts',
  'alerts.subtitle': 'Real-time detection alerts across the smart city',
  'alerts.filter_severity': 'Severity',
  'alerts.filter_status': 'Status',
  'alerts.filter_all': 'All',
  'alerts.severity.critical': 'Critical',
  'alerts.severity.high': 'High',
  'alerts.severity.medium': 'Medium',
  'alerts.severity.low': 'Low',
  'alerts.status.open': 'Open',
  'alerts.status.triaged': 'Triaged',
  'alerts.status.resolved': 'Resolved',
  'alerts.triage': 'Triage',
  'alerts.resolve_ellipsis': 'Resolve…',
  'alerts.amend': 'Amend',
  'alerts.reopen': 'Reopen',
  'alerts.history': 'History',
  'alerts.resolution_history': 'Resolution History',
  'alerts.no_history': 'No history entries for this alert.',
  'alerts.reopen_prompt': 'Reason for reopening this alert? (required)',
  'alerts.could_not_reopen': 'Could not reopen alert',

  // resolution modal
  'resolution.title.resolve': 'Resolve Alert',
  'resolution.title.amend': 'Amend Resolution',
  'resolution.intro.resolve': 'Pick a classification and document what happened. Resolution notes are required.',
  'resolution.intro.amend': 'Change the classification or notes. A reason is required and recorded in the audit history.',
  'resolution.classification': 'Classification',
  'resolution.classification.true_positive': 'True Positive',
  'resolution.classification.false_positive': 'False Positive',
  'resolution.classification.benign': 'Benign',
  'resolution.classification.informational': 'Informational',
  'resolution.classification.true_positive.help': 'Real malicious activity confirmed.',
  'resolution.classification.false_positive.help': 'Rule fired on benign activity. Rule needs tuning.',
  'resolution.classification.benign.help': 'Suspicious but expected (e.g. authorised scan).',
  'resolution.classification.informational.help': 'No action required; recorded for awareness only.',
  'resolution.notes': 'Resolution notes',
  'resolution.notes.placeholder': 'What was the decision and why?',
  'resolution.notes.required_hint': 'Required. Captured on the alert and in the audit log.',
  'resolution.investigation': 'Investigation notes',
  'resolution.investigation.placeholder': 'What did you check? Which logs, IOCs, related alerts?',
  'resolution.remediation': 'Remediation notes',
  'resolution.remediation.placeholder': 'What action was taken? Block, isolate, ticket, none, …',
  'resolution.amend_reason': 'Reason for amendment',
  'resolution.amend_reason.placeholder': 'Why are you changing this resolution?',
  'resolution.save': 'Save Amendment',
  'resolution.resolve': 'Resolve Alert',
  'resolution.saving': 'Saving…',

  // resolution analytics
  'analytics.title': 'Resolution Analytics',
  'analytics.subtitle': 'TP/FP trends, analyst activity, and resolution timelines.',
  'analytics.window': 'Window',
  'analytics.bucket': 'Bucket',
  'analytics.bucket.hour': 'Hourly',
  'analytics.bucket.day': 'Daily',
  'analytics.bucket.week': 'Weekly',
  'analytics.window.1d': '1 day',
  'analytics.window.7d': '7 days',
  'analytics.window.30d': '30 days',
  'analytics.window.90d': '90 days',
  'analytics.totals_title': 'TP / FP / Benign / Informational',
  'analytics.analyst_activity': 'Analyst Activity',
  'analytics.timeline_title': 'Resolution Timeline',
  'analytics.mean': 'Mean',
  'analytics.median': 'Median',
  'analytics.p95': 'p95',
  'analytics.samples': 'Samples',
  'analytics.no_data': 'No data in this window.',
  'analytics.no_activity': 'No analyst activity in this window.',
  'analytics.no_resolved': 'No resolved alerts in this window.',
  'analytics.alert': 'Alert',
  'analytics.triggered': 'Triggered',
  'analytics.resolved': 'Resolved',
  'analytics.time_to_resolve': 'Time to Resolve',
  'analytics.resolves': 'Resolves',
  'analytics.amendments': 'Amendments',
  'analytics.reopens': 'Reopens',
  'analytics.total': 'Total',
  'analytics.activity': 'Activity',
  'analytics.forbidden': 'Forbidden — analyst or administrator role required.',

  // admin users
  'admin.title': 'User Management',
  'admin.subtitle': 'Manage user accounts and role-based access control',
  'admin.create_user': '+ Create User',
  'admin.create_new_user': 'Create New User',
  'admin.password': 'Password',
  'admin.password_hint': 'Minimum 8 characters',
  'admin.manager': 'Manager',
  'admin.manager_optional': 'Manager (optional)',
  'admin.manager_none': '— No manager —',
  'admin.manager_hint': 'Only active Managers and Administrators may be assigned as a manager.',
  'admin.access_denied': 'Access Denied',
  'admin.admin_only': 'This page is only accessible to administrators',
  'admin.no_users': 'No users found',
  'admin.users_count': 'Users',
  'admin.role.viewer': 'Viewer',
  'admin.role.manager': 'Manager',
  'admin.role.analyst': 'Analyst',
  'admin.role.researcher': 'Researcher',
  'admin.role.administrator': 'Administrator',
  'admin.role.viewer.desc': 'Viewer - View security awareness content only',
  'admin.role.manager.desc': 'Manager - Oversees direct reports\' awareness training',
  'admin.role.analyst.desc': 'Analyst - View and analyze security data, execute response actions',
  'admin.role.researcher.desc': 'Researcher - Design scenarios, configure rules, manage research lab',
  'admin.role.administrator.desc': 'Administrator - Full system access including user management',
  'admin.active_user': 'Active User',
  'admin.deactivate': 'Deactivate',
  'admin.activate': 'Activate',
  'admin.confirm_delete': 'Are you sure you want to delete user "{username}"?',

  // team
  'team.title': 'Team Analytics',
  'team.empty': 'No team members are assigned to you yet. Ask an administrator to assign reports to you.',
  'team.user': 'User',
  'team.role': 'Role',
  'team.events': 'Events',
  'team.last_pre': 'Last pre-assessment',
  'team.pending': 'in progress',

  // theme
  'theme.toggle': 'Toggle theme',
  'theme.dark': 'Dark',
  'theme.light': 'Light',

  // lang
  'lang.toggle': 'Toggle language',
} as const

type StringKey = keyof typeof en

const ar: Record<StringKey, string> = {
  // global
  'common.save': 'حفظ',
  'common.cancel': 'إلغاء',
  'common.close': 'إغلاق',
  'common.delete': 'حذف',
  'common.edit': 'تعديل',
  'common.create': 'إنشاء',
  'common.loading': 'جارٍ التحميل…',
  'common.search': 'بحث',
  'common.actions': 'إجراءات',
  'common.status': 'الحالة',
  'common.username': 'اسم المستخدم',
  'common.email': 'البريد الإلكتروني',
  'common.role': 'الدور',
  'common.created': 'تاريخ الإنشاء',
  'common.required': 'مطلوب',
  'common.none': '—',
  'common.yes': 'نعم',
  'common.no': 'لا',
  'common.active': 'نشط',
  'common.inactive': 'غير نشط',
  'common.optional': 'اختياري',
  'common.submit': 'إرسال',
  'common.reset': 'إعادة تعيين',
  'common.error': 'خطأ',
  'common.success': 'تم بنجاح',
  'common.try_again': 'حاول مرة أخرى',
  'common.retake': 'إعادة',
  'common.passed': 'ناجح',
  'common.failed': 'فشل',
  'common.view': 'عرض',
  'common.logout': 'تسجيل الخروج',

  // nav
  'nav.dashboard': 'لوحة التحكم',
  'nav.smart_city': 'المدينة الذكية',
  'nav.alerts': 'التنبيهات',
  'nav.devices': 'الأجهزة',
  'nav.scenarios': 'السيناريوهات',
  'nav.rules': 'القواعد',
  'nav.resolutions': 'الحلول',
  'nav.awareness': 'التوعية',
  'nav.team': 'الفريق',
  'nav.proposals': 'المقترحات',
  'nav.users': 'المستخدمون',
  'nav.attack_live': 'هجوم جارٍ',
  'nav.user': 'المستخدم',
  'nav.unknown_role': 'غير معروف',

  // login
  'login.title': 'CityShield',
  'login.subtitle': 'منصة المدى السيبراني للمدن الذكية',
  'login.username': 'اسم المستخدم',
  'login.password': 'كلمة المرور',
  'login.submit': 'تسجيل الدخول',
  'login.signing_in': 'جارٍ تسجيل الدخول…',
  'login.error': 'اسم المستخدم أو كلمة المرور غير صحيحة',

  // alerts
  'alerts.title': 'التنبيهات',
  'alerts.subtitle': 'تنبيهات الكشف اللحظية عبر المدينة الذكية',
  'alerts.filter_severity': 'الخطورة',
  'alerts.filter_status': 'الحالة',
  'alerts.filter_all': 'الكل',
  'alerts.severity.critical': 'حرجة',
  'alerts.severity.high': 'عالية',
  'alerts.severity.medium': 'متوسطة',
  'alerts.severity.low': 'منخفضة',
  'alerts.status.open': 'مفتوحة',
  'alerts.status.triaged': 'تحت الفحص',
  'alerts.status.resolved': 'محلولة',
  'alerts.triage': 'فحص',
  'alerts.resolve_ellipsis': 'حل…',
  'alerts.amend': 'تعديل',
  'alerts.reopen': 'إعادة فتح',
  'alerts.history': 'السجل',
  'alerts.resolution_history': 'سجل الحل',
  'alerts.no_history': 'لا توجد إدخالات في السجل لهذا التنبيه.',
  'alerts.reopen_prompt': 'سبب إعادة فتح هذا التنبيه؟ (مطلوب)',
  'alerts.could_not_reopen': 'تعذر إعادة فتح التنبيه',

  // resolution modal
  'resolution.title.resolve': 'حل التنبيه',
  'resolution.title.amend': 'تعديل الحل',
  'resolution.intro.resolve': 'اختر التصنيف ووثّق ما حدث. ملاحظات الحل مطلوبة.',
  'resolution.intro.amend': 'غيّر التصنيف أو الملاحظات. السبب مطلوب ويُسجَّل في السجل التدقيقي.',
  'resolution.classification': 'التصنيف',
  'resolution.classification.true_positive': 'إيجابي حقيقي',
  'resolution.classification.false_positive': 'إيجابي زائف',
  'resolution.classification.benign': 'غير ضار',
  'resolution.classification.informational': 'إعلامي',
  'resolution.classification.true_positive.help': 'نشاط خبيث حقيقي مؤكد.',
  'resolution.classification.false_positive.help': 'القاعدة أُطلِقت على نشاط حميد. تحتاج إلى ضبط.',
  'resolution.classification.benign.help': 'مشبوه لكنه متوقع (مثلاً فحص مصرح به).',
  'resolution.classification.informational.help': 'لا حاجة لإجراء؛ يُسجَّل للعلم فقط.',
  'resolution.notes': 'ملاحظات الحل',
  'resolution.notes.placeholder': 'ما القرار ولماذا؟',
  'resolution.notes.required_hint': 'مطلوب. يُسجَّل على التنبيه وفي السجل التدقيقي.',
  'resolution.investigation': 'ملاحظات التحقيق',
  'resolution.investigation.placeholder': 'ماذا فحصت؟ أي سجلات أو مؤشرات أو تنبيهات ذات صلة؟',
  'resolution.remediation': 'ملاحظات المعالجة',
  'resolution.remediation.placeholder': 'ما الإجراء المتخذ؟ حجب، عزل، تذكرة، لا شيء، …',
  'resolution.amend_reason': 'سبب التعديل',
  'resolution.amend_reason.placeholder': 'لماذا تغيّر هذا الحل؟',
  'resolution.save': 'حفظ التعديل',
  'resolution.resolve': 'حل التنبيه',
  'resolution.saving': 'جارٍ الحفظ…',

  // analytics
  'analytics.title': 'تحليلات الحل',
  'analytics.subtitle': 'اتجاهات الإيجابيات الحقيقية والزائفة ونشاط المحللين وخطوط زمنية الحل.',
  'analytics.window': 'النافذة',
  'analytics.bucket': 'الفترة',
  'analytics.bucket.hour': 'كل ساعة',
  'analytics.bucket.day': 'يومياً',
  'analytics.bucket.week': 'أسبوعياً',
  'analytics.window.1d': 'يوم واحد',
  'analytics.window.7d': '7 أيام',
  'analytics.window.30d': '30 يوماً',
  'analytics.window.90d': '90 يوماً',
  'analytics.totals_title': 'إيجابي حقيقي / إيجابي زائف / غير ضار / إعلامي',
  'analytics.analyst_activity': 'نشاط المحللين',
  'analytics.timeline_title': 'خط زمني الحل',
  'analytics.mean': 'المتوسط',
  'analytics.median': 'الوسيط',
  'analytics.p95': 'النسبة 95',
  'analytics.samples': 'العيّنات',
  'analytics.no_data': 'لا توجد بيانات في هذه النافذة.',
  'analytics.no_activity': 'لا يوجد نشاط للمحللين في هذه النافذة.',
  'analytics.no_resolved': 'لا توجد تنبيهات محلولة في هذه النافذة.',
  'analytics.alert': 'التنبيه',
  'analytics.triggered': 'وقت الإطلاق',
  'analytics.resolved': 'وقت الحل',
  'analytics.time_to_resolve': 'زمن الحل',
  'analytics.resolves': 'حلول',
  'analytics.amendments': 'تعديلات',
  'analytics.reopens': 'إعادة فتح',
  'analytics.total': 'المجموع',
  'analytics.activity': 'النشاط',
  'analytics.forbidden': 'ممنوع — يتطلب دور محلل أو مسؤول.',

  // admin
  'admin.title': 'إدارة المستخدمين',
  'admin.subtitle': 'إدارة حسابات المستخدمين والتحكم في الصلاحيات حسب الأدوار',
  'admin.create_user': '+ إنشاء مستخدم',
  'admin.create_new_user': 'إنشاء مستخدم جديد',
  'admin.password': 'كلمة المرور',
  'admin.password_hint': 'الحد الأدنى 8 أحرف',
  'admin.manager': 'المدير',
  'admin.manager_optional': 'المدير (اختياري)',
  'admin.manager_none': '— لا يوجد —',
  'admin.manager_hint': 'يُسمح فقط بتعيين المديرين أو المسؤولين النشطين كمديرين.',
  'admin.access_denied': 'الوصول مرفوض',
  'admin.admin_only': 'هذه الصفحة متاحة فقط للمسؤولين',
  'admin.no_users': 'لا يوجد مستخدمون',
  'admin.users_count': 'المستخدمون',
  'admin.role.viewer': 'مشاهد',
  'admin.role.manager': 'مدير',
  'admin.role.analyst': 'محلل',
  'admin.role.researcher': 'باحث',
  'admin.role.administrator': 'مسؤول',
  'admin.role.viewer.desc': 'مشاهد - عرض محتوى التوعية الأمنية فقط',
  'admin.role.manager.desc': 'مدير - يشرف على تدريب التوعية لموظفيه',
  'admin.role.analyst.desc': 'محلل - عرض وتحليل البيانات الأمنية وتنفيذ إجراءات الاستجابة',
  'admin.role.researcher.desc': 'باحث - تصميم السيناريوهات وضبط القواعد وإدارة المختبر البحثي',
  'admin.role.administrator.desc': 'مسؤول - وصول كامل للنظام بما في ذلك إدارة المستخدمين',
  'admin.active_user': 'مستخدم نشط',
  'admin.deactivate': 'تعطيل',
  'admin.activate': 'تفعيل',
  'admin.confirm_delete': 'هل أنت متأكد من حذف المستخدم "{username}"؟',

  // team
  'team.title': 'تحليلات الفريق',
  'team.empty': 'لم يُعيَّن لك أعضاء فريق بعد. اطلب من المسؤول تعيين موظفين تحت إشرافك.',
  'team.user': 'الموظف',
  'team.role': 'الدور',
  'team.events': 'الأحداث',
  'team.last_pre': 'آخر تقييم أولي',
  'team.pending': 'قيد التقدم',

  // theme
  'theme.toggle': 'تبديل السمة',
  'theme.dark': 'داكن',
  'theme.light': 'فاتح',

  // lang
  'lang.toggle': 'تبديل اللغة',
}

const DICTS: Record<Lang, Record<StringKey, string>> = { en, ar }

/** Resolve a keyed string against the active language with EN fallback. */
export function tk(lang: Lang, key: StringKey, vars?: Record<string, string | number>): string {
  const raw = DICTS[lang]?.[key] ?? en[key] ?? key
  if (!vars) return raw
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`))
}

/** Resolve a Bilingual `{en, ar}` object — used by the Awareness manifest. */
export function tb(lang: Lang, b: Bilingual | undefined | null): string {
  if (!b) return ''
  return b[lang] ?? b.en ?? ''
}

export type { StringKey, Bilingual }
