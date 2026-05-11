import { useEffect, useCallback, useRef, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import {
  Home,
  PenSquare,
  Bell,
  Menu,
  LogIn,
  LogOut,
  Keyboard,
  ShieldCheck,
  Info,
} from 'lucide-react'
import { useUserStore } from '@/stores/user-store'
import { useNotificationStore } from '@/stores/notification-store'
import { useAuthStore } from '@/stores/auth-store'
import { useNavigationStore } from '@/stores/navigation-store'
import { useEventStore } from '@/stores/event-store'

import { useAboutStore } from '@/stores/about-store'
import { useAccountSecurityStore } from '@/stores/account-security-store'
import { useKeyboardShortcutsStore } from '@/stores/keyboard-shortcuts-store'
import { ColorPickerMenuItem } from '@/components/menu/ColorPickerMenuItem'
import { ThemeSwitcherMenuItem } from '@/components/menu/ThemeSwitcherMenuItem'

const defaultAvatar = 'data:image/svg+xml;base64,' + btoa(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23ccc"/><circle cx="50" cy="38" r="16" fill="%23fff"/><ellipse cx="50" cy="82" rx="32" ry="22" fill="%23fff"/></svg>'
)

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const userStore = useUserStore()
  const notificationStore = useNotificationStore()
  const authStore = useAuthStore()
  const navigationStore = useNavigationStore()
  const eventStore = useEventStore()

  const aboutStore = useAboutStore()
  const accountSecurityStore = useAccountSecurityStore()
  const keyboardShortcutsStore = useKeyboardShortcutsStore()

  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  const isLoggedIn = userStore.isLoggedIn()
  const unreadCount = notificationStore.unreadCount

  // Init user info and fetch unread count on mount
  useEffect(() => {
    userStore.initUserInfo()
    if (userStore.isLoggedIn()) {
      notificationStore.fetchUnreadCount()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Watch login state changes
  useEffect(() => {
    if (isLoggedIn) {
      notificationStore.fetchUnreadCount()
    } else {
      notificationStore.clearUnreadCount()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userStore.token])

  // Watch route changes - refresh unread count when leaving notification page
  const prevPathRef = useRef(location.pathname)
  useEffect(() => {
    const prevPath = prevPathRef.current
    if (prevPath === '/notification' && location.pathname !== '/notification' && isLoggedIn) {
      const timer = setTimeout(() => {
        notificationStore.fetchUnreadCount()
      }, 500)
      return () => clearTimeout(timer)
    }
    prevPathRef.current = location.pathname
  }, [location.pathname, isLoggedIn, notificationStore])

  // Close more dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const handleExploreClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      if (location.pathname.startsWith('/explore')) {
        navigationStore.scrollToTop()
        eventStore.triggerFloatingBtnReloadRequest()
      } else {
        navigate('/explore')
        navigationStore.scrollToTop()
      }
    },
    [location.pathname, navigate, navigationStore, eventStore]
  )

  const handleLoginClick = useCallback(() => {
    authStore.openLoginModal()
  }, [authStore])

  const handleLogout = useCallback(async () => {
    try {
      await userStore.logout()
      window.location.reload()
    } catch (error) {
      console.error('退出登录失败:', error)
    }
    setMoreOpen(false)
  }, [userStore])

  const handleMenuAction = useCallback(
    (action: string) => {
      setMoreOpen(false)
      if (action === 'about') {
        aboutStore.openAboutModal()
      } else if (action === 'keyboardShortcuts') {
        keyboardShortcutsStore.openKeyboardShortcutsModal()
      } else if (action === 'accountSecurity') {
        accountSecurityStore.openAccountSecurityModal()
      } else if (action === 'logout') {
        handleLogout()
      } else if (action === 'login') {
        authStore.openLoginModal()
      }
    },
    [aboutStore, keyboardShortcutsStore, accountSecurityStore, authStore, handleLogout]
  )

  const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = defaultAvatar
  }

  return (
    <nav className="sidebar">
      <ul className="sidebar-menu">
        {/* 发现 */}
        <li>
          <div
            className={`sidebar-link${location.pathname.startsWith('/explore') ? ' active-link' : ''}`}
            onClick={handleExploreClick}
          >
            <span className="sidebar-icon">
              <Home
                size={24}
                className={location.pathname.startsWith('/explore') ? 'icon-active' : 'icon-default'}
              />
            </span>
            <span className="sidebar-label">发现</span>
          </div>
        </li>

        {/* 发布 */}
        <li>
          <Link
            to="/publish"
            className={`sidebar-link${location.pathname === '/publish' ? ' active-link' : ''}`}
          >
            <span className="sidebar-icon">
              <PenSquare
                size={24}
                className={location.pathname === '/publish' ? 'icon-active' : 'icon-default'}
              />
            </span>
            <span className="sidebar-label">发布</span>
          </Link>
        </li>

        {/* 通知 */}
        <li className="notification-item">
          <Link
            to="/notification"
            className={`sidebar-link${location.pathname === '/notification' ? ' active-link' : ''}`}
          >
            <span className="sidebar-icon">
              <Bell
                size={24}
                className={location.pathname === '/notification' ? 'icon-active' : 'icon-default'}
              />
            </span>
            <span className="sidebar-label">通知</span>
            {unreadCount > 0 && (
              <div className="count">{unreadCount > 99 ? '···' : unreadCount}</div>
            )}
          </Link>
        </li>

        {/* 我 (logged in) or 登录 (not logged in) */}
        {isLoggedIn ? (
          <li>
            <Link
              to="/user"
              className={`sidebar-link${location.pathname === '/user' ? ' active-link' : ''}`}
            >
              <span className="sidebar-icon">
                <img
                  src={userStore.userInfo?.avatar || defaultAvatar}
                  alt={userStore.userInfo?.nickname || '用户头像'}
                  className="avatar-icon"
                  onError={handleAvatarError}
                />
              </span>
              <span className="sidebar-label">我</span>
            </Link>
          </li>
        ) : (
          <li>
            <button className="login-btn" onClick={handleLoginClick}>
              登录
            </button>
          </li>
        )}
      </ul>

      {/* 更多 dropdown */}
      <div className="sidebar-footer" ref={moreRef}>
        <div
          className="sidebar-footer-item"
          onClick={() => setMoreOpen(!moreOpen)}
        >
          <div className="sidebar-link">
            <span className="sidebar-icon">
              <Menu size={24} className="icon-default" />
            </span>
            <span className="sidebar-label">更多</span>
          </div>
        </div>

        {moreOpen && (
          <div className="more-dropdown">
            <div className="dropdown-item" onClick={() => handleMenuAction('about')}>
              <Info size={18} style={{ marginRight: 12 }} />
              关于知舟
            </div>
            <div className="dropdown-item" onClick={() => handleMenuAction('keyboardShortcuts')}>
              <Keyboard size={18} style={{ marginRight: 12 }} />
              键盘快捷键
            </div>
            {isLoggedIn && (
              <div className="dropdown-item" onClick={() => handleMenuAction('accountSecurity')}>
                <ShieldCheck size={18} style={{ marginRight: 12 }} />
                账号与安全
              </div>
            )}
            <div className="dropdown-divider" />

            <ColorPickerMenuItem />
            <ThemeSwitcherMenuItem />

            <div className="dropdown-divider" />

            {isLoggedIn ? (
              <div className="dropdown-item" onClick={() => handleMenuAction('logout')}>
                <LogOut size={18} style={{ marginRight: 12 }} />
                退出登录
              </div>
            ) : (
              <div className="dropdown-item" onClick={() => handleMenuAction('login')}>
                <LogIn size={18} style={{ marginRight: 12 }} />
                登录/注册
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .sidebar {
          display: flex;
          flex-direction: column;
          width: 228px;
          background: var(--bg-color-primary);
          position: fixed;
          z-index: 100;
          left: max(calc(50% - 750px), 0px);
          top: 72px;
          height: calc(100vh - 72px);
          overflow-y: auto;
          padding: 12px;
          justify-content: space-between;
          transition: border-color 0.3s ease, background-color 0.3s ease;
        }

        .sidebar-menu {
          flex: 1;
          list-style: none;
          padding: 0;
          margin: 0;
          left: 16px;
        }

        .sidebar-menu li {
          display: flex;
          align-items: center;
          font-size: 16px;
          font-weight: 700;
          height: 48px;
          margin-bottom: 8px;
        }

        .sidebar-footer-item {
          display: flex;
          align-items: center;
          font-size: 16px;
          font-weight: 700;
          height: 48px;
          margin-bottom: 8px;
          border-radius: 999px;
          list-style: none;
          cursor: pointer;
        }

        .sidebar-footer-item:hover {
          background: var(--bg-color-secondary);
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          width: 100%;
          height: 100%;
          padding: 0px 16px;
          color: var(--text-color-primary);
          text-decoration: none;
          border-radius: 999px;
          cursor: pointer;
        }

        .sidebar-link:hover {
          background: var(--bg-color-secondary);
        }

        .sidebar-link.active-link {
          background: var(--bg-color-secondary);
          transition: border-color 0.3s ease, background-color 0.3s ease;
        }

        .sidebar-footer-item .sidebar-link:hover {
          background: transparent;
        }

        .icon-default {
          color: var(--text-color-tertiary);
        }

        .icon-active {
          color: var(--text-color-primary);
        }

        .sidebar-icon {
          margin-right: 16px;
          display: flex;
          align-items: center;
        }

        .avatar-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          object-fit: cover;
        }

        .sidebar-footer {
          margin-top: auto;
          margin-bottom: 20px;
          position: relative;
        }

        .login-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          padding: 0px 16px;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 999px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
        }

        .notification-item {
          position: relative;
        }

        .notification-item .count {
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: var(--danger-color);
          color: white;
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          top: 15px;
          left: 100px;
        }

        /* More dropdown */
        .more-dropdown {
          position: absolute;
          bottom: calc(100% + 4px);
          right: 0;
          min-width: 200px;
          background: var(--bg-color-primary);
          border: 1px solid var(--border-color-primary);
          border-radius: 8px;
          box-shadow: 0 4px 12px var(--shadow-color);
          padding: 2px 0;
          backdrop-filter: blur(10px);
          z-index: 1001;
          animation: dropdownUp 0.2s ease;
        }

        @keyframes dropdownUp {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .dropdown-item {
          cursor: pointer;
          transition: background-color 0.3s ease;
          border-radius: 8px;
          margin: 2px 4px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          padding: 12px 16px;
          color: var(--text-color-primary);
          font-size: 16px;
          line-height: 1;
        }

        .dropdown-item:hover {
          background: var(--bg-color-secondary);
        }

        .dropdown-divider {
          height: 1px;
          background: var(--border-color-primary);
          margin: 4px 16px;
        }

        @media (max-width: 960px) {
          .sidebar {
            display: none;
          }
        }
      `}</style>
    </nav>
  )
}
