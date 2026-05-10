import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import LayoutHeader from './LayoutHeader'
import LayoutFooter from './LayoutFooter'
import { AuthModal } from '@/components/modals/AuthModal'
import { useAuthStore } from '@/stores/auth-store'

export default function Layout() {
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 960)
  const showAuthModal = useAuthStore((s) => s.showAuthModal)

  useEffect(() => {
    const handleResize = () => {
      setShowSidebar(window.innerWidth > 960)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div className="layout-container">
      {showSidebar && <Sidebar />}
      <div className={`main-content${showSidebar ? ' with-sidebar' : ''}`}>
        <LayoutHeader />
        <div className="content-wrapper">
          <Outlet />
        </div>
        {!showSidebar && <LayoutFooter />}
      </div>

      <style>{`
        .layout-container {
          display: flex;
          min-height: 100vh;
          background-color: var(--bg-color-primary);
          min-width: 320px;
          margin: 0;
          width: 100%;
          overflow-x: hidden;
          position: relative;
          box-sizing: border-box;
          transition: background-color 0.2s ease;
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          min-height: 100vh;
          transition: margin-left 0.3s;
          width: 100%;
          overflow-x: hidden;
        }

        .main-content.with-sidebar {
          margin-left: 228px;
          width: calc(100% - 228px);
        }

        .content-wrapper {
          flex: 1;
          margin: 0 auto;
          width: 100%;
          max-width: 1200px;
          padding: 0;
          box-sizing: border-box;
          padding-bottom: 48px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          background-color: var(--bg-color-primary);
          transition: background-color 0.2s ease;
        }

        @media (max-width: 960px) {
          .main-content {
            margin-left: 0;
          }

          .content-wrapper {
            padding-bottom: 48px;
          }
        }

        @media (max-width: 768px) {
          .content-wrapper {
            padding-bottom: 48px;
          }
        }

        @media (max-width: 480px) {
          .content-wrapper {
            padding-bottom: 48px;
          }
        }

        @media (min-width: 961px) {
          .content-wrapper {
            padding-bottom: 0;
          }
        }
      `}</style>

      {showAuthModal && <AuthModal />}
    </div>
  )
}
