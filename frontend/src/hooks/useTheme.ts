import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'cityshield_theme'
const EVENT = 'cityshield-theme'

function readStored(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const v = window.localStorage.getItem(STORAGE_KEY)
  return v === 'light' ? 'light' : 'dark'
}

/**
 * Theme hook. Persists user choice and applies it to `<html>` via the
 * `data-theme` attribute so CSS variable overrides (see styles/index.css)
 * activate without a re-render.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readStored)

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [theme])

  useEffect(() => {
    const handler = (e: Event) => {
      const next = (e as CustomEvent<Theme>).detail
      if (next === 'dark' || next === 'light') setThemeState(next)
    }
    window.addEventListener(EVENT, handler as EventListener)
    return () => window.removeEventListener(EVENT, handler as EventListener)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    window.localStorage.setItem(STORAGE_KEY, next)
    window.dispatchEvent(new CustomEvent<Theme>(EVENT, { detail: next }))
    setThemeState(next)
  }, [])

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return { theme, setTheme, toggle }
}
