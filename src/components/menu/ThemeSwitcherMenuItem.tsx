import React, { useCallback, useMemo } from 'react'
import { useThemeStore, themeOptions } from '@/stores/theme-store'
import { Sun, Moon, Monitor } from 'lucide-react'

const iconMap: Record<string, React.ReactNode> = {
  setting: <Monitor size={14} />,
  sun: <Sun size={14} />,
  moon: <Moon size={14} />,
}

export function ThemeSwitcherMenuItem() {
  const currentTheme = useThemeStore((s) => s.currentTheme)
  const setTheme = useThemeStore((s) => s.setTheme)

  const indicatorPosition = useMemo(() => {
    const index = themeOptions.findIndex((opt) => opt.value === currentTheme)
    return index * 28
  }, [currentTheme])

  return (
    <div className="theme-switcher-menu-item">
      <div className="theme-item-content">
        <span className="theme-label">深色模式</span>
        <div className="theme-toggle-container">
          <div className="theme-toggle-track">
            <div
              className="theme-toggle-indicator"
              style={{ transform: `translateX(${indicatorPosition}px)` }}
            />
            {themeOptions.map((option) => (
              <div key={option.value} className="theme-option-wrapper">
                <button
                  className={`theme-toggle-option ${currentTheme === option.value ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setTheme(option.value)
                  }}
                  aria-label={option.label}
                >
                  {iconMap[option.icon]}
                </button>
                <div className="tooltip">{option.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .theme-switcher-menu-item {
          padding: 8px 4px;
          margin: 4px;
          border-radius: 999px;
        }
        .theme-item-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 10px;
          gap: 20px;
        }
        .theme-label {
          font-size: 16px;
          color: var(--text-color-primary);
          font-weight: 400;
          flex-shrink: 0;
        }
        .theme-toggle-container {
          display: inline-block;
          flex-shrink: 0;
        }
        .theme-toggle-track {
          position: relative;
          display: flex;
          background: var(--bg-color-secondary);
          border-radius: 16px;
          padding: 2px;
          border: 1px solid var(--border-color-primary);
        }
        .theme-option-wrapper {
          position: relative;
          display: inline-block;
        }
        .theme-toggle-indicator {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 26px;
          height: 26px;
          background: var(--bg-color-primary);
          border-radius: 50%;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          z-index: 1;
        }
        [data-theme="dark"] .theme-toggle-indicator {
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
        .theme-toggle-option {
          position: relative;
          width: 28px;
          height: 28px;
          padding: 0;
          border: none;
          background: transparent;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 2;
          color: var(--text-color-tertiary);
        }
        .theme-toggle-option:hover {
          color: var(--text-color-secondary);
        }
        .theme-toggle-option.active {
          color: var(--text-color-primary);
        }
        .tooltip {
          position: absolute;
          bottom: 35px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--bg-color-primary);
          color: var(--text-color-primary);
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          white-space: nowrap;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.2s ease, visibility 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          border: 1px solid var(--border-color-primary);
          z-index: 10;
          pointer-events: none;
        }
        .theme-option-wrapper:hover .tooltip {
          opacity: 1;
          visibility: visible;
        }
      `}</style>
    </div>
  )
}

export default ThemeSwitcherMenuItem
