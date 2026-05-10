import React, {
  useRef,
  useCallback,
  useState,
  useEffect,
  useMemo,
} from 'react'
import { createPortal } from 'react-dom'
import { UserInfoCard } from '@/components/UserInfoCard'
import { userApi } from '@/lib/api'

function isMobileDevice(): boolean {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) ||
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0)
  )
}

interface UserHoverCardProps {
  userId: number
  delay?: number
  onFollow?: (userId: number) => void
  onUnfollow?: (userId: number) => void
  children: React.ReactNode
}

export function UserHoverCard({
  userId,
  delay = 500,
  onFollow,
  onUnfollow,
  children,
}: UserHoverCardProps) {
  const triggerRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [userInfo, setUserInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ left: 0, top: 0 })

  const disabled = useMemo(() => isMobileDevice(), [])

  const fetchUserInfo = useCallback(async () => {
    try {
      setLoading(true)
      const response: any = await userApi.getUserInfo(userId)
      if (response.success && response.data) {
        setUserInfo(response.data)
        return response.data
      }
      return null
    } catch (error) {
      console.error('获取用户信息失败:', error)
      return null
    } finally {
      setLoading(false)
    }
  }, [userId])

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return { left: 0, top: 0 }

    const rect = triggerRef.current.getBoundingClientRect()
    const cardWidth = 360
    const cardHeight = 300
    const gap = 12
    const padding = 16

    let left = rect.right + gap
    let top = rect.top + rect.height / 2 - cardHeight / 2

    // Correct vertical overflow
    if (top < padding) top = padding
    if (top + cardHeight > window.innerHeight - padding) {
      top = window.innerHeight - cardHeight - padding
    }

    return { left, top }
  }, [])

  const showCard = useCallback(async () => {
    setPosition(calculatePosition())

    try {
      const info = await fetchUserInfo()
      if (info) {
        setVisible(true)
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  }, [calculatePosition, fetchUserInfo])

  const hideCard = useCallback(() => {
    setVisible(false)
    setUserInfo(null)
  }, [])

  // Mouse enter on trigger
  const handleMouseEnter = useCallback(() => {
    if (disabled) return

    // Clear leave timer
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = null
    }

    // Delay before showing
    hoverTimerRef.current = setTimeout(() => {
      showCard()
    }, delay)
  }, [disabled, delay, showCard])

  // Mouse leave from trigger
  const handleMouseLeave = useCallback(() => {
    if (disabled) return

    // Clear hover timer
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }

    // Delay before hiding
    leaveTimerRef.current = setTimeout(() => {
      hideCard()
    }, 200)
  }, [disabled, hideCard])

  // Mouse enter on card
  const handleCardMouseEnter = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = null
    }
  }, [])

  // Mouse leave from card
  const handleCardMouseLeave = useCallback(() => {
    leaveTimerRef.current = setTimeout(() => {
      hideCard()
    }, 200)
  }, [hideCard])

  // Handle card click
  const handleCardClick = useCallback(() => {
    hideCard()
  }, [hideCard])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    }
  }, [])

  // Bail out on mobile
  if (disabled) {
    return <>{children}</>
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ display: 'contents' }}
      >
        {children}
      </div>

      {visible &&
        userInfo &&
        createPortal(
          <div
            ref={cardRef}
            style={{
              position: 'fixed',
              left: `${position.left}px`,
              top: `${position.top}px`,
              zIndex: 1000,
            }}
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}
          >
            <UserInfoCard
              visible={true}
              userInfo={userInfo}
              position="right"
              onFollow={onFollow}
              onUnfollow={onUnfollow}
              onClick={handleCardClick}
            />
          </div>,
          document.body
        )}
    </>
  )
}

export default UserHoverCard
