import React, { useCallback } from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { ChevronRight } from 'lucide-react'
import { DropdownItem } from './DropdownItem'
import { DropdownDivider } from './DropdownDivider'

export type MenuItemType =
  | {
      type: 'item'
      key?: string
      label: string
      icon?: React.ReactNode
      rightText?: string
      onClick?: () => void
      disabled?: boolean
      danger?: boolean
    }
  | {
      type: 'divider'
      key?: string
    }
  | {
      type: 'submenu'
      key?: string
      label: string
      icon?: React.ReactNode
      items: MenuItemType[]
      disabled?: boolean
    }
  | {
      type: 'custom'
      key?: string
      content: React.ReactNode
    }

interface DropdownMenuProps {
  trigger: React.ReactNode
  items?: MenuItemType[]
  children?: React.ReactNode
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'bottom'
  sideOffset?: number
  alignOffset?: number
  className?: string
  onOpenChange?: (open: boolean) => void
}

function renderMenuItem(item: MenuItemType, index: number): React.ReactNode {
  const key = item.key || `menu-item-${index}`

  switch (item.type) {
    case 'item':
      return (
        <DropdownMenuPrimitive.Item
          key={key}
          disabled={item.disabled}
          onSelect={item.onClick}
          className={`dropdown-radix-item ${item.danger ? 'dropdown-radix-item--danger' : ''}`}
        >
          {item.icon && <span className="dropdown-item-icon">{item.icon}</span>}
          <span className="dropdown-item-label">{item.label}</span>
          {item.rightText && (
            <span className="dropdown-item-right-text">{item.rightText}</span>
          )}
        </DropdownMenuPrimitive.Item>
      )

    case 'divider':
      return <DropdownMenuPrimitive.Separator key={key} className="dropdown-radix-separator" />

    case 'submenu':
      return (
        <DropdownMenuPrimitive.Sub key={key}>
          <DropdownMenuPrimitive.SubTrigger
            className="dropdown-radix-subtrigger"
            disabled={item.disabled}
          >
            {item.icon && <span className="dropdown-item-icon">{item.icon}</span>}
            <span className="dropdown-item-label">{item.label}</span>
            <ChevronRight size={16} className="dropdown-submenu-arrow" />
          </DropdownMenuPrimitive.SubTrigger>
          <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.SubContent className="dropdown-radix-content dropdown-radix-subcontent">
              {item.items.map((subItem, subIndex) =>
                renderMenuItem(subItem, subIndex)
              )}
            </DropdownMenuPrimitive.SubContent>
          </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Sub>
      )

    case 'custom':
      return <React.Fragment key={key}>{item.content}</React.Fragment>

    default:
      return null
  }
}

export function DropdownMenu({
  trigger,
  items,
  children,
  align = 'end',
  side = 'bottom',
  sideOffset = 4,
  alignOffset = 0,
  className = '',
  onOpenChange,
}: DropdownMenuProps) {
  return (
    <DropdownMenuPrimitive.Root onOpenChange={onOpenChange}>
      <DropdownMenuPrimitive.Trigger asChild>
        {trigger}
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          className={`dropdown-radix-content ${className}`}
          align={align}
          side={side}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          collisionPadding={8}
        >
          {children}
          {items?.map((item, index) => renderMenuItem(item, index))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>

      <style>{`
        .dropdown-radix-content {
          min-width: 200px;
          background: var(--bg-color-primary);
          border: 1px solid var(--border-color-primary);
          border-radius: 8px;
          box-shadow: 0 4px 12px var(--shadow-color);
          padding: 2px 0;
          backdrop-filter: blur(10px);
          z-index: 1000;
          animation: dropdownFadeIn 0.2s ease;
          transform-origin: var(--radix-dropdown-menu-content-transform-origin);
        }

        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .dropdown-radix-item {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          color: var(--text-color-primary);
          font-size: 16px;
          line-height: 1;
          cursor: pointer;
          transition: background-color 0.2s ease;
          border-radius: 8px;
          margin: 2px 4px;
          box-sizing: border-box;
          outline: none;
        }

        .dropdown-radix-item[data-highlighted] {
          background: var(--bg-color-secondary);
          outline: none;
        }

        .dropdown-radix-item[data-disabled] {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .dropdown-radix-item--danger {
          color: var(--primary-color);
        }

        .dropdown-radix-item--danger[data-highlighted] {
          background: rgba(239, 68, 68, 0.1);
        }

        .dropdown-item-icon {
          display: flex;
          align-items: center;
          margin-right: 12px;
          flex-shrink: 0;
        }

        .dropdown-item-label {
          flex: 1;
        }

        .dropdown-item-right-text {
          margin-left: 12px;
          color: var(--text-color-secondary);
          font-size: 14px;
          flex-shrink: 0;
        }

        .dropdown-radix-separator {
          height: 1px;
          background: var(--border-color-primary);
          margin: 4px 16px;
        }

        .dropdown-radix-subtrigger {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          color: var(--text-color-primary);
          font-size: 16px;
          line-height: 1;
          cursor: pointer;
          transition: background-color 0.2s ease;
          border-radius: 8px;
          margin: 2px 4px;
          box-sizing: border-box;
          outline: none;
        }

        .dropdown-radix-subtrigger[data-highlighted],
        .dropdown-radix-subtrigger[data-state="open"] {
          background: var(--bg-color-secondary);
          outline: none;
        }

        .dropdown-submenu-arrow {
          margin-left: 12px;
          color: var(--text-color-secondary);
          flex-shrink: 0;
        }

        .dropdown-radix-subcontent {
          animation: dropdownFadeIn 0.2s ease;
        }
      `}</style>
    </DropdownMenuPrimitive.Root>
  )
}

export default DropdownMenu
