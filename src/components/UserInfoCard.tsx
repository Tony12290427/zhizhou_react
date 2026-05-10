import { useCallback, useMemo, useEffect } from 'react'
import { useFollowStore } from '@/stores/follow-store'
import { useUserStore } from '@/stores/user-store'
import { FollowButton } from './FollowButton'
import { ContentRenderer } from './ContentRenderer'
import VerifiedBadge from './VerifiedBadge'
import clsx from 'clsx'

interface UserInfoCardProps {
  visible: boolean
  userInfo: {
    id?: string | number
    user_id?: string | number
    userId?: string | number
    avatar?: string
    nickname?: string
    bio?: string
    followCount?: number
    fansCount?: number
    likeAndCollectCount?: number
    isFollowing?: boolean
    isMutual?: boolean
    buttonType?: string
    images?: string[]
    verified?: number
    verified_title?: string
    [key: string]: any
  }
  position?: 'top' | 'bottom' | 'left' | 'right'
  onFollow?: (userId: number | string) => void
  onUnfollow?: (userId: number | string) => void
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
}

export function UserInfoCard({
  visible,
  userInfo,
  position = 'bottom',
  onFollow,
  onUnfollow,
  onClick,
  className,
  style,
}: UserInfoCardProps) {
  const followStore = useFollowStore()
  const userStore = useUserStore()

  const userId = userInfo.user_id || userInfo.userId || userInfo.id

  // Get real-time follow state from store
  const currentFollowState = useMemo(() => {
    return followStore.getUserFollowState(userId || '')
  }, [followStore, userId])

  // Merge userInfo with live follow state
  const mergedUserInfo = useMemo(() => {
    const followState = currentFollowState
    return {
      ...userInfo,
      isFollowing: followState?.followed ?? userInfo.isFollowing,
      isMutual: followState?.isMutual ?? userInfo.isMutual,
      buttonType: followState?.buttonType ?? userInfo.buttonType,
    }
  }, [userInfo, currentFollowState])

  const isCurrentUser = useMemo(() => {
    if (!userStore.isLoggedIn() || !userStore.userInfo) return false
    const currentUserId = userStore.userInfo.user_id
    return currentUserId === userInfo.id
  }, [userStore, userInfo.id])

  // Display at most 3 images
  const displayImages = useMemo(() => {
    return userInfo.images ? userInfo.images.slice(0, 3) : []
  }, [userInfo.images])

  // Determine follow button texts
  const getFollowText = useCallback(
    (user: typeof mergedUserInfo) => {
      if (user.buttonType === 'back') return '回关'
      return '关注'
    },
    []
  )

  const getFollowingText = useCallback(
    (user: typeof mergedUserInfo) => {
      if (user.buttonType === 'mutual') return '互相关注'
      return '已关注'
    },
    []
  )

  // Initialize follow state when userInfo changes
  useEffect(() => {
    if (userId) {
      const isFollowing = userInfo.isFollowing || false
      const isMutual = userInfo.isMutual || false
      let buttonType: any = userInfo.buttonType
      if (!buttonType) {
        if (isFollowing) {
          buttonType = isMutual ? 'mutual' : 'unfollow'
        } else {
          buttonType = 'follow'
        }
      }
      followStore.initUserFollowState(userId, isFollowing, isMutual, buttonType)
    }
  }, [userId, userInfo.isFollowing, userInfo.isMutual, userInfo.buttonType, followStore])

  const defaultAvatar =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHJ4PSI0IiBmaWxsPSIjZTVlN2ViIi8+PHBhdGggZD0iTTIwIDIxYzIuNzUgMCA1LTIuMjUgNS01cy0yLjI1LTUtNS01LTUgMi4yNS01IDUgMi4yNSA1IDUgNXptLTEwIDhoMjBjMCAzLjMzMy02LjY2NyA2LTEwIDZzLTEwLTIuNjY3LTEwLTZ6IiBmaWxsPSIjOWNhM2FmIi8+PC9zdmc+'

  const handleCardClick = useCallback(() => {
    onClick?.()
    if (userInfo.id) {
      try {
        const targetPath = `/user/${userInfo.id}`
        const url = window.location.origin + targetPath
        window.open(url, '_blank')
      } catch (error) {
        console.error('打开用户页面失败:', error)
      }
    }
  }, [onClick, userInfo.id])

  const handleFollow = useCallback(
    async (userId: number) => {
      if (onFollow) {
        await onFollow(userId)
      } else if (userStore.isLoggedIn()) {
        try {
          await followStore.toggleUserFollow(userId)
        } catch (error) {
          console.error('关注操作失败:', error)
        }
      }
    },
    [onFollow, userStore, followStore]
  )

  const handleUnfollow = useCallback(
    async (userId: number) => {
      if (onUnfollow) {
        await onUnfollow(userId)
      } else if (userStore.isLoggedIn()) {
        try {
          await followStore.toggleUserFollow(userId)
        } catch (error) {
          console.error('取消关注操作失败:', error)
        }
      }
    },
    [onUnfollow, userStore, followStore]
  )

  const handleAvatarError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      e.currentTarget.src = defaultAvatar
    },
    []
  )

  if (!visible) return null

  return (
    <div
      className={clsx('user-info-card', className)}
      onClick={handleCardClick}
      style={style}
    >
      {/* Header: avatar + nickname + follow button */}
      <div className="card-header">
        <div className="avatar-info">
          <img
            src={userInfo.avatar || defaultAvatar}
            alt={userInfo.nickname || '用户'}
            className="avatar"
            onError={handleAvatarError}
          />
          <div className="nickname-container">
            <span className="nickname">{userInfo.nickname}</span>
            <VerifiedBadge verified={userInfo.verified} />
          </div>
        </div>
        {!isCurrentUser && userId && (
          <FollowButton
            userId={Number(userId)}
            isFollowing={mergedUserInfo.isFollowing as boolean}
            followText={getFollowText(mergedUserInfo)}
            followingText={getFollowingText(mergedUserInfo)}
            size="small"
            onFollow={handleFollow}
            onUnfollow={handleUnfollow}
          />
        )}
      </div>

      {/* Content: bio + stats */}
      <div className="card-content">
        <div className="bio">
          {userInfo.bio ? (
            <ContentRenderer text={userInfo.bio} />
          ) : (
            '还没有简介'
          )}
        </div>
        <div className="stats">
          <span className="stat-item">
            <span className="stat-number">{userInfo.followCount ?? 0}</span>
            <span className="stat-label"> 关注</span>
          </span>
          <span className="stat-item">
            <span className="stat-number">{userInfo.fansCount ?? 0}</span>
            <span className="stat-label"> 粉丝</span>
          </span>
          <span className="stat-item">
            <span className="stat-number">{userInfo.likeAndCollectCount ?? 0}</span>
            <span className="stat-label"> 获赞与收藏</span>
          </span>
        </div>
      </div>

      {/* Images */}
      {displayImages.length > 0 && (
        <div className="card-images">
          {displayImages.map((image, index) => (
            <div key={index} className="image-item">
              <img src={image} alt={`用户图片${index + 1}`} />
            </div>
          ))}
        </div>
      )}

      <style>{`
        .user-info-card {
          width: 360px;
          background: var(--bg-color-primary);
          border: 1px solid var(--border-color-primary);
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          padding: 16px;
          position: absolute;
          z-index: 1000;
          box-sizing: border-box;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .avatar-info {
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 0;
          height: 40px;
          margin-right: 12px;
        }
        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          margin-right: 12px;
          flex-shrink: 0;
          background: transparent;
          border: 1px solid var(--border-color-secondary);
          transition: all 0.3s ease;
        }
        .avatar:not([src]),
        .avatar[src=""] {
          background: transparent;
          border: 1px solid var(--border-color-secondary);
        }
        .nickname-container {
          display: flex;
          align-items: center;
          min-width: 0;
        }
        .nickname {
          font-size: 16px;
          font-weight: bold;
          color: var(--text-color-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          margin-right: 6px;
        }
        .card-content {
          margin-bottom: 16px;
        }
        .bio {
          font-size: 14px;
          color: var(--text-color-secondary);
          line-height: 1.4;
          margin-bottom: 12px;
          word-wrap: break-word;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .stats {
          display: flex;
          gap: 16px;
        }
        .stat-item {
          font-size: 13px;
          color: var(--text-color-tertiary);
          white-space: nowrap;
        }
        .stat-number {
          font-weight: bold;
          color: var(--text-color-primary);
        }
        .stat-label {
          font-weight: normal;
          color: var(--text-color-tertiary);
        }
        .card-images {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }
        .image-item {
          width: 100px;
          height: 100px;
          border-radius: 8px;
          flex-shrink: 0;
        }
        .image-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          background: transparent;
          border: 1px solid var(--border-color-secondary);
          border-radius: 8px;
          transition: all 0.3s ease;
        }
        @media (max-width: 480px) {
          .user-info-card {
            width: 320px;
            padding: 12px;
          }
          .avatar-info {
            width: 200px;
          }
          .avatar {
            width: 36px;
            height: 36px;
          }
          .nickname {
            font-size: 15px;
          }
          .bio {
            font-size: 13px;
          }
          .stat-item {
            font-size: 12px;
          }
          .image-item {
            width: 88px;
            height: 88px;
          }
        }
      `}</style>
    </div>
  )
}
