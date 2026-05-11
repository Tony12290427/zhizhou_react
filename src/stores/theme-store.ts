import { create } from 'zustand'
import type { ThemeMode } from '@/types/common'

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getSavedTheme(): ThemeMode {
  return (localStorage.getItem('theme') as ThemeMode) || 'system'
}

function applyTheme(theme: ThemeMode): 'light' | 'dark' {
  const actualTheme = theme === 'system' ? getSystemTheme() : theme
  document.documentElement.setAttribute('data-theme', actualTheme)
  return actualTheme
}

function saveTheme(theme: ThemeMode) {
  localStorage.setItem('theme', theme)
}

export const themeOptions = [
  { value: 'system' as const, label: '跟随系统', icon: 'setting' },
  { value: 'light' as const, label: '浅色模式', icon: 'sun' },
  { value: 'dark' as const, label: '深色模式', icon: 'moon' },
]

interface ThemeState {
  currentTheme: ThemeMode
  actualTheme: 'light' | 'dark'
  isDark: boolean
  isLight: boolean
  isSystem: boolean
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  toggleTwoTheme: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  currentTheme: getSavedTheme(),
  actualTheme: applyTheme(getSavedTheme()),
  isDark: applyTheme(getSavedTheme()) === 'dark',
  isLight: applyTheme(getSavedTheme()) === 'light',
  isSystem: getSavedTheme() === 'system',

  setTheme: (theme: ThemeMode) => {
    const actual = applyTheme(theme)
    saveTheme(theme)
    set({
      currentTheme: theme,
      actualTheme: actual,
      isDark: actual === 'dark',
      isLight: actual === 'light',
      isSystem: theme === 'system',
    })
  },

  toggleTheme: () => {
    const { currentTheme } = get()
    const currentIndex = themeOptions.findIndex((opt) => opt.value === currentTheme)
    const nextTheme = themeOptions[(currentIndex + 1) % themeOptions.length].value
    get().setTheme(nextTheme)
  },

  toggleTwoTheme: () => {
    const { currentTheme } = get()
    get().setTheme(currentTheme === 'light' ? 'dark' : 'light')
  },
}))

// Module-level system theme listener — matches Vue3 Pinia store approach.
// Lives outside React component lifecycle so it's always active.
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
mediaQuery.addEventListener('change', () => {
  const { currentTheme, setTheme } = useThemeStore.getState()
  if (currentTheme === 'system') {
    setTheme('system')
  }
})
