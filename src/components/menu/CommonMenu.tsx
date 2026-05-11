import React, { useCallback } from 'react'
import { useUserStore } from '@/stores/user-store'
import { useAuthStore } from '@/stores/auth-store'
import { useAboutStore } from '@/stores/about-store'
import { useKeyboardShortcutsStore } from '@/stores/keyboard-shortcuts-store'
import { useAccountSecurityStore } from '@/stores/account-security-store'
import ColorPickerMenuItem from './ColorPickerMenuItem'
import ThemeSwitcherMenuItem from './ThemeSwitcherMenuItem'
import type { MenuItemType } from './DropdownMenu'
import { Info, Keyboard, Lock, LogOut, LogIn } from 'lucide-react'

interface CommonMenuProps {
  asItems?: boolean
  onClose?: () => void
}

export function CommonMenu({ asItems = true, onClose }: CommonMenuProps) {
  const isLoggedIn = useUserStore((s) => s.isLoggedIn())
  const logout = useUserStore((s) => s.logout)
  const openLoginModal = useAuthStore((s) => s.openLoginModal)
  const openAboutModal = useAboutStore((s) => s.open)
  const openKeyboardShortcutsModal = useKeyboardShortcutsStore(
    (s) => s.openKeyboardShortcutsModal
  )
  const openAccountSecurityModal = useAccountSecurityStore(
    (s) => s.openAccountSecurityModal
  )

  const handleLogout = useCallback(async () => {
    try {
      await logout()
      window.location.reload()
    } catch (error) {
      console.error('退出登录失败:', error)
    }
  }, [logout])

  const wrapClose = useCallback(
    (fn: () => void) => () => {
      onClose?.()
      fn()
    },
    [onClose]
  )

  const items: MenuItemType[] = [
    {
      type: 'item',
      key: 'about',
      label: '关于知舟',
      icon: <Info size={18} />,
      onClick: onClose ? wrapClose(openAboutModal) : openAboutModal,
    },
    {
      type: 'item',
      key: 'keyboard-shortcuts',
      label: '键盘快捷键',
      icon: <Keyboard size={18} />,
      onClick: onClose
        ? wrapClose(openKeyboardShortcutsModal)
        : openKeyboardShortcutsModal,
    },
    ...(isLoggedIn
      ? [
          {
            type: 'item' as const,
            key: 'account-security',
            label: '账号与安全',
            icon: <Lock size={18} />,
            onClick: onClose
              ? wrapClose(openAccountSecurityModal)
              : openAccountSecurityModal,
          },
        ]
      : []),
    { type: 'divider' as const, key: 'divider-1' },
    {
      type: 'custom',
      key: 'color-picker',
      content: <ColorPickerMenuItem />,
    },
    {
      type: 'custom',
      key: 'theme-switcher',
      content: <ThemeSwitcherMenuItem />,
    },
    ...(isLoggedIn
      ? [
          {
            type: 'item' as const,
            key: 'logout',
            label: '退出登录',
            icon: <LogOut size={18} />,
            danger: true,
            onClick: onClose ? wrapClose(handleLogout) : handleLogout,
          },
        ]
      : [
          {
            type: 'item' as const,
            key: 'login',
            label: '登录/注册',
            icon: <LogIn size={18} />,
            onClick: onClose
              ? wrapClose(openLoginModal)
              : openLoginModal,
          },
        ]),
  ]

  if (!asItems) {
    return (
      <>
        {items.map((item, idx) => {
          switch (item.type) {
            case 'item':
              return (
                <div
                  key={item.key || idx}
                  className={`dropdown-item ${item.danger ? 'dropdown-item--danger' : ''}`}
                  onClick={item.onClick}
                  role="menuitem"
                >
                  <div className="dropdown-item-content">
                    {item.icon && <span className="dropdown-item-icon">{item.icon}</span>}
                    <span>{item.label}</span>
                  </div>
                </div>
              )
            case 'divider':
              return <div key={item.key || idx} className="dropdown-divider" />
            case 'custom':
              return <React.Fragment key={item.key || idx}>{item.content}</React.Fragment>
            default:
              return null
          }
        })}
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
          .dropdown-item-content {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            color: var(--text-color-primary);
            font-size: 16px;
            line-height: 1;
          }
          .dropdown-item--danger .dropdown-item-content {
            color: var(--primary-color);
          }
          .dropdown-item-icon {
            display: flex;
            align-items: center;
            margin-right: 12px;
            flex-shrink: 0;
          }
          .dropdown-divider {
            height: 1px;
            background: var(--border-color-primary);
            margin: 4px 16px;
          }
        `}</style>
      </>
    )
  }

  return null
}

export function useCommonMenuItems(): MenuItemType[] {
  const CommonMenuComponent = function CommonMenuFn() {
    return <CommonMenu />
  }
  // This is a hook approach — return the items directly
  const isLoggedIn = useUserStore((s) => s.isLoggedIn())

  const items: MenuItemType[] = [
    {
      type: 'item',
      key: 'about',
      label: '关于知舟',
      icon: <Info size={18} />,
      onClick: () => useAboutStore.getState().open(),
    },
    {
      type: 'item',
      key: 'keyboard-shortcuts',
      label: '键盘快捷键',
      icon: <Keyboard size={18} />,
      onClick: () => useKeyboardShortcutsStore.getState().openKeyboardShortcutsModal(),
    },
    ...(isLoggedIn
      ? [
          {
            type: 'item' as const,
            key: 'account-security',
            label: '账号与安全',
            icon: <Lock size={18} />,
            onClick: () => useAccountSecurityStore.getState().openAccountSecurityModal(),
          },
        ]
      : []),
    { type: 'divider' as const, key: 'divider-1' },
    {
      type: 'custom',
      key: 'color-picker',
      content: <ColorPickerMenuItem />,
    },
    {
      type: 'custom',
      key: 'theme-switcher',
      content: <ThemeSwitcherMenuItem />,
    },
    ...(isLoggedIn
      ? [
          {
            type: 'item' as const,
            key: 'logout',
            label: '退出登录',
            icon: <LogOut size={18} />,
            danger: true,
            onClick: async () => {
              try {
                await useUserStore.getState().logout()
                window.location.reload()
              } catch (error) {
                console.error('退出登录失败:', error)
              }
            },
          },
        ]
      : [
          {
            type: 'item' as const,
            key: 'login',
            label: '登录/注册',
            icon: <LogIn size={18} />,
            onClick: () => useAuthStore.getState().openLoginModal(),
          },
        ]),
  ]

  return items
}

export default CommonMenu
