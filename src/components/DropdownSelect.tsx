import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'

interface Option {
  [key: string]: any
}

interface DropdownSelectProps {
  options: (Option | string | number)[]
  value?: string | number | null
  onChange?: (data: { option: Option | string | number; value: string | number }) => void
  placeholder?: string
  labelKey?: string
  valueKey?: string
  maxWidth?: string
  minWidth?: string
  disabled?: boolean
  size?: 'small' | 'normal'
  className?: string
}

export function DropdownSelect({
  options,
  value,
  onChange,
  placeholder = '请选择',
  labelKey = 'label',
  valueKey = 'value',
  maxWidth = '300px',
  minWidth = '200px',
  disabled = false,
  size = 'normal',
  className,
}: DropdownSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Find selected option
  const selectedOption = useMemo(() => {
    if (value === null || value === undefined) return null
    return options.find((option) => {
      if (typeof option === 'object') {
        return (option as Option)[valueKey] === value
      }
      return option === value
    })
  }, [options, value, valueKey])

  // Get display text
  const getDisplayText = useCallback(
    (option: Option | string | number | null): string => {
      if (!option) return ''
      if (typeof option === 'object') {
        return (option as Option)[labelKey] || ''
      }
      return String(option)
    },
    [labelKey]
  )

  // Get unique key for option
  const getOptionKey = useCallback(
    (option: Option | string | number): string | number => {
      if (typeof option === 'object') {
        return (option as Option)[valueKey]
      }
      return option
    },
    [valueKey]
  )

  // Check if option is selected
  const isSelected = useCallback(
    (option: Option | string | number): boolean => {
      if (value === null || value === undefined) return false
      if (typeof option === 'object') {
        return (option as Option)[valueKey] === value
      }
      return option === value
    },
    [value, valueKey]
  )

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const toggleDropdown = useCallback(() => {
    if (disabled) return
    setIsOpen((prev) => !prev)
  }, [disabled])

  const selectOption = useCallback(
    (option: Option | string | number) => {
      const optionValue =
        typeof option === 'object'
          ? (option as Option)[valueKey]
          : option
      onChange?.({ option, value: optionValue })
      setIsOpen(false)
    },
    [onChange, valueKey]
  )

  return (
    <div
      ref={dropdownRef}
      className={clsx('dropdown-selector', { small: size === 'small' }, className)}
      style={{ maxWidth, minWidth }}
    >
      <div
        className={clsx('dropdown-toggle', { active: isOpen })}
        onClick={toggleDropdown}
      >
        <div className="selected-content">
          <span className={selectedOption ? 'selected-text' : 'placeholder-text'}>
            {selectedOption ? getDisplayText(selectedOption) : placeholder}
          </span>
          <ChevronDown
            size={14}
            className={clsx('dropdown-arrow', { rotated: isOpen })}
          />
        </div>
        {isOpen && (
          <div className="dropdown-options">
            {options.map((option) => (
              <div
                key={getOptionKey(option)}
                className={clsx('dropdown-option', {
                  selected: isSelected(option),
                })}
                onClick={(e) => {
                  e.stopPropagation()
                  selectOption(option)
                }}
              >
                <span className="option-text">{getDisplayText(option)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`
        .dropdown-selector {
          position: relative;
          width: fit-content;
          user-select: none;
        }
        .dropdown-toggle {
          position: relative;
          width: 100%;
          border: 1px solid var(--border-color-primary);
          border-radius: 8px;
          background: var(--bg-color-primary);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .dropdown-toggle:hover {
          border-color: var(--border-color-secondary);
        }
        .dropdown-toggle.active {
          border-color: var(--primary-color);
        }
        .selected-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          font-size: 14px;
        }
        .dropdown-selector.small .selected-content {
          padding: 8px 12px;
        }
        .selected-text {
          color: var(--text-color-primary);
          font-weight: 500;
        }
        .placeholder-text {
          color: var(--text-color-secondary);
        }
        .dropdown-arrow {
          color: var(--text-color-secondary);
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }
        .dropdown-arrow.rotated {
          transform: rotate(180deg);
        }
        .dropdown-options {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: var(--bg-color-primary);
          border: 1px solid var(--border-color-primary);
          border-top: none;
          border-radius: 0 0 8px 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          max-height: 200px;
          overflow-y: auto;
          padding: 8px;
        }
        .dropdown-option {
          display: flex;
          align-items: center;
          padding: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          border-radius: 6px;
          margin-bottom: 4px;
        }
        .dropdown-selector.small .dropdown-option {
          padding: 8px 12px;
        }
        .dropdown-option:last-child {
          margin-bottom: 0;
        }
        .dropdown-option:hover {
          background: var(--bg-color-secondary);
        }
        .dropdown-option.selected {
          background: var(--bg-color-secondary);
          color: var(--primary-color);
          font-weight: 500;
        }
        .option-text {
          font-size: 14px;
        }
        .dropdown-options::-webkit-scrollbar {
          width: 4px;
        }
        .dropdown-options::-webkit-scrollbar-track {
          background: transparent;
        }
        .dropdown-options::-webkit-scrollbar-thumb {
          background: var(--border-color-primary);
          border-radius: 2px;
        }
        .dropdown-options::-webkit-scrollbar-thumb:hover {
          background: var(--border-color-secondary);
        }
      `}</style>
    </div>
  )
}
