import { useState, useEffect, useMemo, useCallback } from 'react'
import clsx from 'clsx'

interface Dimension {
  key: string
  label: string
  options: { value: string; label: string }[]
}

interface MbtiPickerProps {
  value?: string
  dimensions: Dimension[]
  onChange?: (value: string) => void
  className?: string
}

export function MbtiPicker({
  value = '',
  dimensions,
  onChange,
  className,
}: MbtiPickerProps) {
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({})

  // Initialize values from prop
  useEffect(() => {
    if (value && value.length === 4) {
      const chars = value.split('')
      const newValues: Record<string, string> = {}
      dimensions.forEach((dimension, index) => {
        if (chars[index]) {
          newValues[dimension.key] = chars[index]
        }
      })
      setSelectedValues(newValues)
    } else {
      const newValues: Record<string, string> = {}
      dimensions.forEach((dimension) => {
        newValues[dimension.key] = ''
      })
      setSelectedValues(newValues)
    }
  }, [value, dimensions])

  // Display value
  const displayValue = useMemo(() => {
    const hasSelection = dimensions.some(
      (dimension) => selectedValues[dimension.key]
    )
    if (!hasSelection) return '请选择MBTI类型'
    return dimensions
      .map((dimension) => selectedValues[dimension.key] || '_ ')
      .join('')
  }, [dimensions, selectedValues])

  const clearSelection = useCallback(() => {
    const newValues: Record<string, string> = {}
    dimensions.forEach((dimension) => {
      newValues[dimension.key] = ''
    })
    setSelectedValues(newValues)
    onChange?.('')
  }, [dimensions, onChange])

  const selectOption = useCallback(
    (dimensionKey: string, optionValue: string) => {
      const newValues = { ...selectedValues, [dimensionKey]: optionValue }
      setSelectedValues(newValues)

      // Build MBTI string
      const mbtiValues = dimensions.map((dim) => newValues[dim.key] || '')
      const hasAllSelections = mbtiValues.every((v) => v !== '')
      const mbtiString = hasAllSelections ? mbtiValues.join('') : ''
      onChange?.(mbtiString)
    },
    [selectedValues, dimensions, onChange]
  )

  return (
    <div className={clsx('mbti-picker', className)}>
      <div className="mbti-header">
        <span className="mbti-result">{displayValue}</span>
        <button
          type="button"
          className="clear-btn"
          onClick={clearSelection}
          title="清除选择"
        >
          &times;
        </button>
      </div>
      <div className="picker-container">
        {dimensions.map((dimension) => (
          <div key={dimension.key} className="dimension-picker">
            <div className="dimension-label">{dimension.label}</div>
            <div className="picker-wheel">
              <div className="picker-options">
                {dimension.options.map((option) => (
                  <div
                    key={option.value}
                    className={clsx('picker-option', {
                      active: selectedValues[dimension.key] === option.value,
                    })}
                    onClick={() => selectOption(dimension.key, option.value)}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        .mbti-picker {
          width: 60%;
          max-width: 400px;
          margin: 0 auto;
        }
        .mbti-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding: 2px 6px;
          border: 1px solid var(--border-color-primary);
          border-radius: 4px;
        }
        .mbti-result {
          font-size: 12px;
          color: var(--text-color-primary);
        }
        .clear-btn {
          background: none;
          border: none;
          font-size: 20px;
          color: var(--text-color-secondary);
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s ease;
          line-height: 1;
        }
        .clear-btn:hover {
          color: var(--text-color-primary);
          transform: scale(1.1);
        }
        .clear-btn:active {
          transform: scale(0.95);
        }
        .picker-container {
          display: flex;
          gap: 20px;
          justify-content: space-between;
        }
        .dimension-picker {
          flex: 1;
          min-width: 0;
        }
        .dimension-label {
          text-align: center;
          font-size: 12px;
          color: var(--text-color-secondary);
          margin-bottom: 8px;
          font-weight: 500;
        }
        .picker-wheel {
          background: var(--bg-color-primary);
          border: 1px solid var(--border-color-primary);
          border-radius: 4px;
          overflow: hidden;
        }
        .picker-options {
          display: flex;
          flex-direction: column;
        }
        .picker-option {
          padding: 10px 5px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 18px;
          font-weight: 500;
        }
        .picker-option:last-child {
          border-bottom: none;
        }
        .picker-option:hover {
          opacity: 0.8;
        }
        .picker-option.active {
          background: var(--primary-color);
          color: white;
        }
        .picker-option.active:hover {
          background: var(--primary-color);
          opacity: 0.9;
        }
        @media (max-width: 550px) {
          .mbti-picker {
            width: 80%;
            max-width: 300px;
            margin: 0 auto;
          }
          .picker-container {
            gap: 8px;
          }
          .picker-option {
            padding: 10px 6px;
            font-size: 13px;
          }
          .dimension-label {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  )
}
