import { useCallback, useEffect, useState } from 'react'
import {
  LANG_EVENT,
  persistLang,
  readStoredLang,
  tb,
  tk,
  type Bilingual,
  type Lang,
  type StringKey,
} from '../i18n'

/**
 * Centralized language hook used across the platform.
 *
 * Public surface (intentionally stable since Phase 1):
 *   - `lang`     — current language code
 *   - `setLang`  — persist + broadcast a new choice
 *   - `t(b)`     — translate a `{en, ar}` Bilingual object
 *   - `tk(key)`  — translate a chrome string key from the central dictionary
 *   - `dir`      — `'ltr' | 'rtl'` ready to spread onto a container
 */
export function useLang() {
  const [lang, setLangState] = useState<Lang>(readStoredLang)

  useEffect(() => {
    const handler = (e: Event) => {
      const next = (e as CustomEvent<Lang>).detail
      if (next === 'en' || next === 'ar') setLangState(next)
    }
    window.addEventListener(LANG_EVENT, handler as EventListener)
    return () => window.removeEventListener(LANG_EVENT, handler as EventListener)
  }, [])

  const setLang = useCallback((next: Lang) => {
    persistLang(next)
    setLangState(next)
  }, [])

  const t = useCallback((b: Bilingual | undefined | null) => tb(lang, b), [lang])
  const tkBound = useCallback(
    (key: StringKey, vars?: Record<string, string | number>) => tk(lang, key, vars),
    [lang],
  )

  const dir: 'ltr' | 'rtl' = lang === 'ar' ? 'rtl' : 'ltr'

  return { lang, setLang, t, tk: tkBound, dir }
}
