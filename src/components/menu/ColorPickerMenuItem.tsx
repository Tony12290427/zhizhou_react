import React, { useRef, useEffect, useCallback, useState } from 'react'
import clsx from 'clsx'

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

function adjustBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex

  const adjust = (color: number) => {
    const adjusted = Math.round(color * (1 + percent / 100))
    return Math.max(0, Math.min(255, adjusted))
  }

  const r = adjust(rgb.r)
  const g = adjust(rgb.g)
  const b = adjust(rgb.b)

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

function updateThemeColors(baseColor: string) {
  const root = document.documentElement

  root.style.setProperty('--primary-color', baseColor)

  const darkColor = adjustBrightness(baseColor, -10)
  root.style.setProperty('--primary-color-dark', darkColor)

  const rgb = hexToRgb(darkColor)
  if (rgb) {
    const shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`
    root.style.setProperty('--primary-color-shadow', shadowColor)
  }

  localStorage.setItem('theme-color', baseColor)
}

function getCurrentThemeColor(): string {
  const rootStyles = getComputedStyle(document.documentElement)
  const primaryColor = rootStyles.getPropertyValue('--primary-color').trim()
  return primaryColor || '#ff2e4d'
}

export function ColorPickerMenuItem() {
  const colorInputRef = useRef<HTMLInputElement>(null)
  const [currentColor, setCurrentColor] = useState('#ff2e4d')

  useEffect(() => {
    const savedColor = localStorage.getItem('theme-color')
    if (savedColor) {
      setCurrentColor(savedColor)
      updateThemeColors(savedColor)
    } else {
      setCurrentColor(getCurrentThemeColor())
    }
  }, [])

  const openColorPicker = useCallback(() => {
    colorInputRef.current?.click()
  }, [])

  const handleColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newColor = e.target.value
      setCurrentColor(newColor)
      updateThemeColors(newColor)
    },
    []
  )

  return (
    <div className="color-picker-menu-item">
      <div className="color-item-content">
        <span className="color-label">主题色</span>
        <div className="color-picker-container">
          <div className="color-picker-wrapper">
            <input
              type="color"
              value={currentColor}
              onChange={handleColorChange}
              className="color-input"
              ref={colorInputRef}
            />
            <div
              className="color-display"
              style={{ backgroundColor: currentColor }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                openColorPicker()
              }}
            />
          </div>
        </div>
      </div>
      <style>{`
        .color-picker-menu-item {
          padding: 4px;
          margin: 0 5px;
          border-radius: 999px;
        }
        .color-item-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 10px;
          gap: 20px;
        }
        .color-label {
          font-size: 16px;
          color: var(--text-color-primary);
          font-weight: 400;
          flex-shrink: 0;
        }
        .color-picker-container {
          display: inline-block;
          flex-shrink: 0;
        }
        .color-picker-wrapper {
          position: relative;
          display: inline-block;
        }
        .color-input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
          pointer-events: none;
        }
        .color-display {
          width: 32px;
          margin-right: 20px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid var(--border-color-secondary);
          cursor: pointer;
          transition: box-shadow 0.3s ease, transform 0.3s ease;
        }
        .color-display:hover {
          transform: scale(1.05);
        }
        .color-display:active {
          transform: scale(0.9);
          box-shadow: 0 0 0 1px var(--primary-color);
        }
      `}</style>
    </div>
  )
}

export default ColorPickerMenuItem
