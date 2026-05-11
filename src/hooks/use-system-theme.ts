import { useEffect } from 'react'
import { useThemeStore } from '@/stores/theme-store'

/**
 * Ensures the theme store re-evaluates the system preference when the
 * tab becomes visible (e.g. user changed OS theme while tab was hidden).
 * The primary system-theme listener lives in theme-store.ts at module level.
 */
export function useSystemTheme() {
  const currentTheme = useThemeStore((s) => s.currentTheme)
  const setTheme = useThemeStore((s) => s.setTheme)

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && currentTheme === 'system') {
        setTheme('system')
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [currentTheme, setTheme])
}
