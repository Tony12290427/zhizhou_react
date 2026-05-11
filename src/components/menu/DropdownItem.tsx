import React, { useCallback } from 'react'

interface DropdownItemProps {
  children: React.ReactNode
  onClick?: () => void
  onSelect?: () => void
  className?: string
  disabled?: boolean
}

export function DropdownItem({
  children,
  onClick,
  onSelect,
  className = '',
  disabled = false,
}: DropdownItemProps) {
  const handleClick = useCallback(() => {
    if (disabled) return
    onClick?.()
    onSelect?.()
  }, [onClick, onSelect, disabled])

  return (
    <div
      className={`dropdown-item ${className}`}
      onClick={handleClick}
      role="menuitem"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      <div className="dropdown-item-content">{children}</div>
      <style>{`
        .dropdown-item {
          cursor: pointer;
          transition: background-color 0.3s ease;
          border-radius: 8px;
          margin: 2px 4px;
          box-sizing: border-box;
        }
        .dropdown-item:hover {
          background: var(--bg-color-secondary);
        }
        .dropdown-item[tabindex='-1'] {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .dropdown-item-content {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          color: var(--text-color-primary);
          font-size: 16px;
          line-height: 1;
        }
      `}</style>
    </div>
  )
}

export default DropdownItem
