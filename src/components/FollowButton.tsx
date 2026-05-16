import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { toast } from '@/utils/toastManager'
import { useFollowStore } from '@/stores/follow-store'
import { useAuthStore } from '@/stores/auth-store'
import { useUserStore } from '@/stores/user-store'
import clsx from 'clsx'

interface FollowButtonProps {
  userId: number
  isFollowing: boolean
  size?: 'small' | 'normal'
  followText?: string
  followingText?: string
  debounceTime?: number
  onFollow?: (userId: number) => void
  onUnfollow?: (userId: number) => void
  className?: string
}

export function FollowButton({
  userId,
  isFollowing,
  size = 'normal',
  followText = '关注',
  followingText = '已关注',
  debounceTime = 2000,
  onFollow,
  onUnfollow,
  className,
}: FollowButtonProps) {
  const [isDisabled, setIsDisabled] = useState(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const followStore = useFollowStore()
  const authStore = useAuthStore()
  const userStore = useUserStore()

  // Subscribe reactively to follow state from store
  const followState = useFollowStore(
    useCallback(
      (state) => {
        const key = String(userId)
        return state.userFollowStates.get(key)
      },
      [userId]
    )
  ) || { followed: false, isMutual: false, buttonType: 'follow' as const }

  const currentFollowState = followState.followed
  const currentButtonType = followState.buttonType

  // Sync external isFollowing prop to store — but only when store has no state yet.
  // If store already has state (e.g. from fetchFollowStatus), trust the store over the prop.
  useEffect(() => {
    const key = String(userId)
    const storeState = followStore.getUserFollowState(key)
    if (!storeState.hasState) {
      followStore.initUserFollowState(key, isFollowing)
    }
  }, [userId, isFollowing, followStore])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Compute display text based on button type
  const displayText = useMemo(() => {
    if (currentFollowState) {
      if (currentButtonType === 'mutual') return '互相关注'
      return followingText
    }
    if (currentButtonType === 'back') return '回关'
    return followText
  }, [currentFollowState, currentButtonType, followingText, followText])

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (isDisabled) return
      handleFollow()
    },
    [isDisabled]
  )

  async function handleFollow() {
    if (isDisabled) return

    if (!userStore.isLoggedIn()) {
      toast.error('请登录')
      authStore.openLoginModal()
      return
    }

    setIsDisabled(true)

    try {
      const result = await followStore.toggleUserFollow(userId)

      if (result.success) {
        const newState = followStore.getUserFollowState(userId)
        if (newState.followed) {
          onFollow?.(userId)
          toast.success('关注成功')
        } else {
          onUnfollow?.(userId)
          toast.success('取消关注成功')
        }
      } else {
        const errorMessage = result.error || '操作失败，请重试'
        if (
          errorMessage.includes('访问令牌缺失') ||
          errorMessage.includes('未授权') ||
          errorMessage.includes('401')
        ) {
          toast.error('请登录')
          authStore.openLoginModal()
        } else {
          toast.error(errorMessage)
        }
      }
    } catch (error: any) {
      console.error('关注操作失败:', error)
      const errorMessage = error?.message || '操作失败，请重试'
      if (
        errorMessage.includes('访问令牌缺失') ||
        errorMessage.includes('未授权') ||
        errorMessage.includes('401')
      ) {
        toast.error('请登录')
        authStore.openLoginModal()
      } else {
        toast.error('操作失败，请重试')
      }
    }

    // Debounce: re-enable after specified time
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      setIsDisabled(false)
    }, debounceTime)
  }

  return (
    <button
      className={clsx(
        'follow-btn',
        { following: currentFollowState },
        { small: size === 'small' },
        { disabled: isDisabled },
        className
      )}
      onClick={handleClick}
      disabled={false}
    >
      {displayText}
      <style>{`
        .follow-btn {
          padding: 8px 8px;
          border: 1px solid transparent;
          border-radius: 20px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          flex-shrink: 0;
          margin-left: 12px;
          width: 96px;
          height: 40px;
          text-align: center;
          transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
          user-select: none;
          outline: none;
          box-sizing: border-box;
        }
        .follow-btn:not(.following) {
          background: var(--primary-color);
          color: white;
        }
        .follow-btn:not(.following):hover {
          background: var(--primary-color-dark);
        }
        .follow-btn.following {
          background: transparent;
          color: var(--text-color-secondary);
          border-color: var(--border-color-secondary);
        }
        .follow-btn.following:hover {
          background: var(--bg-color-secondary);
          color: var(--text-color-primary);
        }
        .follow-btn.small {
          width: 88px;
          height: 32px;
          font-size: 14px;
          padding: 6px 8px;
          min-width: 88px;
        }
        @media (max-width: 480px) {
          .follow-btn {
            padding: 6px 8px;
            font-size: 12px;
            width: 72px;
            height: 32px;
            min-width: 72px;
          }
          .follow-btn.small {
            width: 68px;
            height: 28px;
            font-size: 11px;
            padding: 5px 6px;
            min-width: 68px;
          }
        }
      `}</style>
    </button>
  )
}

export default FollowButton
