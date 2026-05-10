import { useState, useEffect, useCallback, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import ChannelContainer from './ChannelContainer'
import LoadingSpinner from '@/components/spinner/LoadingSpinner'
import { useEventStore } from '@/stores/event-store'

export default function Explore() {
  const [isChannelLoading, setIsChannelLoading] = useState(false)
  const addEventListener = useEventStore((s) => s.addEventListener)
  const removeEventListener = useEventStore((s) => s.removeEventListener)
  const triggerFloatingBtnReload = useEventStore((s) => s.triggerFloatingBtnReload)
  const listenerKeyRef = useRef<string | null>(null)

  const handleChannelReload = useCallback(() => {
    setIsChannelLoading(true)
    setTimeout(() => {
      setIsChannelLoading(false)
    }, 700)
  }, [])

  const handleFloatingBtnReload = useCallback(() => {
    setIsChannelLoading(true)
    triggerFloatingBtnReload()
    setTimeout(() => {
      setIsChannelLoading(false)
    }, 700)
  }, [triggerFloatingBtnReload])

  useEffect(() => {
    listenerKeyRef.current = addEventListener(
      'floating-btn-reload-request',
      handleFloatingBtnReload,
    )
    return () => {
      if (listenerKeyRef.current) {
        removeEventListener(listenerKeyRef.current)
      }
    }
  }, [addEventListener, removeEventListener, handleFloatingBtnReload])

  return (
    <div className="explore-container">
      <ChannelContainer onChannelReload={handleChannelReload} />
      {isChannelLoading && <LoadingSpinner />}
      <div className={`explore-main${isChannelLoading ? ' with-loading' : ''}`}>
        <Outlet />
      </div>
      <style>{`
        .explore-container {
          padding-top: 72px;
          min-height: 100vh;
          background: var(--bg-color-primary);
          transition: background-color 0.2s ease;
        }
        .explore-main {
          padding: 0px 10px calc(48px + env(safe-area-inset-bottom, 0px)) 10px;
          width: 100%;
          box-sizing: border-box;
          overflow-x: hidden;
          background: var(--bg-color-primary);
          transition: margin-top 0.3s ease, border-color 0.2s ease, background-color 0.2s ease;
        }
        .explore-main.with-loading {
          margin-top: 40px;
        }
      `}</style>
    </div>
  )
}
