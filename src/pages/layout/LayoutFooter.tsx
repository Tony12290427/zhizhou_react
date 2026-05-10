import { useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { Home, PenSquare, Bell, User } from 'lucide-react'
import { useUserStore } from '@/stores/user-store'
import { useNotificationStore } from '@/stores/notification-store'
import { useNavigationStore } from '@/stores/navigation-store'
import { useEventStore } from '@/stores/event-store'

export default function LayoutFooter() {
  const location = useLocation()
  const navigate = useNavigate()
  const userStore = useUserStore()
  const notificationStore = useNotificationStore()
  const navigationStore = useNavigationStore()
  const eventStore = useEventStore()

  const isLoggedIn = userStore.isLoggedIn()
  const unreadCount = notificationStore.unreadCount

  // Fetch unread count on mount
  useEffect(() => {
    if (isLoggedIn) {
      notificationStore.fetchUnreadCount()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Watch login state
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

  return (
    <div className="footer">
      <div className="footer-container">
        <div className="footer-list">
          <ul>
            {/* 发现 */}
            <li>
              <a href="#" onClick={handleExploreClick} className="footer-link">
                <Home
                  size={24}
                  className={location.pathname.startsWith('/explore') ? 'icon active' : 'icon'}
                />
              </a>
            </li>

            {/* 发布 */}
            <li>
              <Link to="/publish" className="footer-link">
                <PenSquare
                  size={24}
                  className={location.pathname === '/publish' ? 'icon active' : 'icon'}
                />
              </Link>
            </li>

            {/* 通知 */}
            <li className="notification-item">
              <Link to="/notification" className="footer-link">
                <Bell
                  size={24}
                  className={location.pathname === '/notification' ? 'icon active' : 'icon'}
                />
              </Link>
              {unreadCount > 0 && (
                <div className="count">{unreadCount > 99 ? '···' : unreadCount}</div>
              )}
            </li>

            {/* 我 */}
            <li>
              <Link to="/user" className="footer-link">
                <User
                  size={24}
                  className={location.pathname === '/user' ? 'icon active' : 'icon'}
                />
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <style>{`
        .footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 48px;
          background-color: var(--bg-color-primary);
          z-index: 999;
          max-width: 1440px;
          margin: 0 auto;
          width: 100%;
          padding-bottom: constant(safe-area-inset-bottom);
          padding-bottom: env(safe-area-inset-bottom);
        }

        .footer-container {
          max-width: 1200px;
          margin: 0 auto;
          height: 100%;
          padding: 0 20px;
          box-sizing: border-box;
          width: 100%;
        }

        @media (max-width: 960px) {
          .footer-container {
            padding: 0 16px;
          }
        }

        @media (max-width: 768px) {
          .footer-container {
            padding: 0 12px;
          }
        }

        @media (max-width: 480px) {
          .footer-container {
            padding: 0 8px;
          }
        }

        .footer-list {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .footer-list ul {
          display: flex;
          align-items: center;
          justify-content: space-around;
          height: 100%;
          width: 100%;
          padding: 0;
          margin: 0;
        }

        .footer-list ul li {
          flex: 1;
          list-style: none;
          height: 100%;
          padding: 0;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .footer-list ul li a {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-decoration: none;
        }

        .footer-link {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-decoration: none;
        }

        .icon {
          color: var(--text-color-tertiary);
        }

        .icon.active {
          color: var(--text-color-primary);
        }

        .notification-item .count {
          position: absolute;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background-color: var(--danger-color);
          color: white;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          top: 3px;
          right: 25%;
        }
      `}</style>
    </div>
  )
}
