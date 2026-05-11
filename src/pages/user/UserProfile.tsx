import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserStore } from '@/stores/user-store'
import { useFollowStore } from '@/stores/follow-store'
import { useNavigationStore } from '@/stores/navigation-store'
import { userApi } from '@/lib/api'
import WaterfallFlow from '@/components/WaterfallFlow'
import FollowButton from '@/components/FollowButton'
import VerifiedBadge from '@/components/VerifiedBadge'
import ContentRenderer from '@/components/ContentRenderer'
import BackToTopButton from '@/components/BackToTopButton'

const DEFAULT_AVATAR = '/avatar.png'

const TABS = [
  { name: 'posts', label: '笔记' },
  { name: 'collections', label: '收藏' },
]

export default function UserProfile() {
  const { userId: userIdParam } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const userStore = useUserStore()
  const followStore = useFollowStore()
  const navigationStore = useNavigationStore()

  const [userId] = useState(userIdParam || '')
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState<any>({})
  const [userStats, setUserStats] = useState<any>({})
  const [followStatus, setFollowStatus] = useState(false)
  const [activeTab, setActiveTab] = useState('posts')
  const [scrollY, setScrollY] = useState(0)
  const [showImageViewer, setShowImageViewer] = useState(false)
  const [currentImageUrl, setCurrentImageUrl] = useState('')

  const fixedTabVisible = scrollY >= 300
  const windowWidthRef = useRef(window.innerWidth)
  const isLargeScreen = windowWidthRef.current > 900

  // Current user check
  const isCurrentUser = useMemo(() => {
    return userStore.isLoggedIn() && userStore.userInfo?.user_id === userId
  }, [userStore, userId])

  // Slider position
  const sliderStyle = useMemo(() => {
    const index = TABS.findIndex((t) => t.name === activeTab)
    if (isLargeScreen) {
      return { left: `calc(50% - 64px + ${index * 64}px)` }
    }
    return { left: `calc(50% - 56px + ${index * 64}px)` }
  }, [activeTab, isLargeScreen])

  const fixedSliderStyle = useMemo(() => {
    const index = TABS.findIndex((t) => t.name === activeTab)
    if (isLargeScreen) {
      return { left: `calc(220px + (100vw - 220px - 128px) / 2 + ${index * 64}px)` }
    }
    return { left: `calc(50% - 56px + ${index * 64}px)` }
  }, [activeTab, isLargeScreen])

  // Fetch user info
  const getUserInfo = useCallback(async () => {
    setLoading(true)
    try {
      const response = await userApi.getUserInfo(userId)
      // Backend returns ProfileResponse directly (id, nickname, avatar...)
      // without { success, data } wrapper
      if (response && (response as any).nickname) {
        setUserInfo(response)
        await getFollowStatus()
      } else if ((response as any).success) {
        setUserInfo((response as any).data)
        await getFollowStatus()
      } else {
        setUserInfo({})
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
      setUserInfo({})
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Fetch user stats
  const getUserStats = useCallback(async () => {
    try {
      const response = await userApi.getUserStats(userId)
      if ((response as any).success) {
        setUserStats((response as any).data)
      }
    } catch (error) {
      console.error('获取用户统计信息失败:', error)
    }
  }, [userId])

  // Fetch follow status
  const getFollowStatus = async () => {
    if (isCurrentUser || !(userInfo.id || userInfo.user_id)) return
    try {
      const result = await followStore.fetchFollowStatus(userInfo.id || userInfo.user_id)
      if (result.success && result.data) {
        setFollowStatus(result.data.followed)
        followStore.initUserFollowState(
          userInfo.id || userInfo.user_id,
          result.data.followed,
          result.data.isMutual || false,
          result.data.buttonType || 'follow',
        )
      } else {
        setFollowStatus(false)
      }
    } catch (error) {
      console.error('获取关注状态失败:', error)
      setFollowStatus(false)
    }
  }

  const onTabClick = useCallback((tabName: string) => {
    const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop
    if (currentScrollTop > 500) {
      navigationStore.scrollToTop('instant')
    }
    setActiveTab(tabName)
    if (currentScrollTop <= 500) {
      setTimeout(() => navigationStore.scrollToTop('smooth'), 300)
    }
  }, [navigationStore])

  const previewAvatar = useCallback(() => {
    setCurrentImageUrl(userInfo.avatar || DEFAULT_AVATAR)
    setShowImageViewer(true)
  }, [userInfo.avatar])

  const handleAvatarError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = DEFAULT_AVATAR
  }, [])

  // Scroll listener
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Mount
  useEffect(() => {
    if (isCurrentUser) {
      navigate('/user', { replace: true })
      return
    }
    getUserInfo()
    getUserStats()
    navigationStore.scrollToTop('instant')
  }, [userId, isCurrentUser])

  return (
    <div className="content-container">
      {userInfo.nickname ? (
        <>
          <div className="user-info">
            <div className="basic-info">
              <img
                src={userInfo.avatar || DEFAULT_AVATAR}
                alt={userInfo.nickname}
                className="avatar"
                onClick={previewAvatar}
                onError={handleAvatarError}
              />
              <div className="user-basic">
                <div className="user-nickname">
                  <span>{userInfo.nickname}</span>
                  <VerifiedBadge verified={userInfo.verified} size="large" />
                </div>
                <div className="user-content">
                  <div className="user-id text-ellipsis">知舟号：{userInfo.id || userInfo.user_id || ''}</div>
                  <div className="user-ip text-ellipsis">IP属地：{userInfo.location || '未知'}</div>
                </div>
              </div>
              {!isCurrentUser && (
                <div className="follow-button-wrapper">
                  <FollowButton userId={userInfo.id || userInfo.user_id} isFollowing={followStatus} />
                </div>
              )}
            </div>
            <div className="user-desc">
              {userInfo.bio ? <ContentRenderer text={userInfo.bio} /> : <span>用户没有任何简介</span>}
            </div>
            <div className="user-interactions">
              <div className="interaction-item">
                <span className="count">{userStats.follow_count || 0}</span>
                <span className="shows">关注</span>
              </div>
              <div className="interaction-item">
                <span className="count">{userStats.fans_count || 0}</span>
                <span className="shows">粉丝</span>
              </div>
              <div className="interaction-item">
                <span className="count">{userStats.likes_and_collects || 0}</span>
                <span className="shows">获赞与收藏</span>
              </div>
            </div>
          </div>

          {/* Tab */}
          <div className="tab">
            {TABS.map((t) => (
              <div
                key={t.name}
                className={`tab-item${activeTab === t.name ? ' active' : ''}`}
                onClick={() => onTabClick(t.name)}
              >
                {t.label}
              </div>
            ))}
            <div className="tab-slider" style={sliderStyle} />
          </div>

          {/* Fixed Tab */}
          <div className={`fixedTab${fixedTabVisible ? '' : ' hidden'}`}>
            {TABS.map((t) => (
              <div
                key={t.name}
                className={`tab-item${activeTab === t.name ? ' active' : ''}`}
                onClick={() => onTabClick(t.name)}
              >
                {t.label}
              </div>
            ))}
            <div className="tab-slider" style={fixedSliderStyle} />
          </div>

          {/* Content */}
          <div className="content-switch-container">
            <div
              className={`content-item${activeTab === 'posts' ? ' active' : ''}`}
              style={{ transform: activeTab === 'posts' ? 'translateX(0%)' : 'translateX(-100%)' }}
            >
              <div className="waterfall-container">
                <WaterfallFlow userId={userId} type="posts" key={`posts-${userId}`} />
              </div>
            </div>
            <div
              className={`content-item${activeTab === 'collections' ? ' active' : ''}`}
              style={{ transform: activeTab === 'collections' ? 'translateX(0%)' : 'translateX(100%)' }}
            >
              <div className="waterfall-container">
                <WaterfallFlow userId={userId} type="collections" key={`collections-${userId}`} />
              </div>
            </div>
          </div>
        </>
      ) : loading ? (
        <div className="loading-state">
          <div className="loading-content">
            <p>加载用户信息中...</p>
          </div>
        </div>
      ) : (
        <div className="error-state">
          <div className="error-content">
            <h3>用户不存在</h3>
            <p>该用户可能已被删除或不存在</p>
          </div>
        </div>
      )}

      <BackToTopButton />

      {/* Image Viewer */}
      {showImageViewer && (
        <div className="image-viewer-overlay" onClick={() => setShowImageViewer(false)}>
          <img src={currentImageUrl} alt="头像预览" className="preview-image" />
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        .content-container {
          padding-top: 72px;
          margin: 0 auto;
          width: 100%;
          max-width: 1200px;
          background: var(--bg-color-primary);
          min-height: 100vh;
          transition: background-color 0.3s ease;
          height: auto;
          min-height: 196px;
          padding: 16px 0;
          width: 100%;
          max-width: 1200px;
          overflow-x: hidden;
          background: var(--bg-color-primary);
        }
        .basic-info {
          display: flex;
          flex-direction: row;
          align-items: center;
          height: 72px;
          width: 100%;
          padding: 0 16px;
          position: relative;
        }
        .avatar {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          border: 1px solid var(--border-color-primary);
          cursor: pointer;
        }
        .user-basic {
          display: flex;
          flex-direction: column;
          flex: 1;
          margin-left: 16px;
          gap: 6px;
        }
        .user-nickname {
          color: var(--text-color-primary);
          font-size: 18px;
          font-weight: bold;
          gap: 6px;
          align-items: center;
          display: flex;
        }
        .user-content {
          display: flex;
          flex-direction: column;
          color: var(--text-color-quaternary);
          font-size: 12px;
          gap: 4px;
          max-width: 100%;
        }
        @media (min-width: 901px) {
          .user-content { flex-direction: row; align-items: center; gap: 8px; flex-wrap: wrap; overflow: hidden; text-overflow: ellipsis; }
        }
        .user-id, .user-ip { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        @media (min-width: 901px) { .user-id { max-width: 60%; } }
        .user-desc { margin: 17px 0px 0px; color: var(--text-color-primary); font-size: 14px; padding: 0 16px; }
        .user-interactions { display: flex; padding: 0 16px; flex-wrap: wrap; width: 100%; }
        .user-interactions div { display: flex; flex-direction: column; margin-right: 16px; margin-top: 20px; }
        .interaction-item { cursor: pointer; padding: 4px 8px; border-radius: 8px; transition: background-color 0.2s ease; }
        .interaction-item:hover { background-color: var(--bg-color-secondary); }
        .interaction-item:last-child { cursor: default; }
        .interaction-item:last-child:hover { background-color: transparent; }
        .count { color: var(--text-color-primary); margin-right: 4px; font-size: 14px; text-align: center; }
        .shows { color: var(--text-color-quaternary); margin: 4px 0 0; font-size: 14px; text-align: center; }
        .follow-button-wrapper { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); }
        .loading-state, .error-state { display: flex; justify-content: center; align-items: center; min-height: 300px; padding: 40px 16px; background: var(--bg-color-primary); }
        .error-content h3 { color: var(--text-color-primary); font-size: 18px; font-weight: 600; margin: 0 0 8px 0; }
        .error-content p { color: var(--text-color-secondary); font-size: 14px; margin: 0; line-height: 1.5; }
        .tab { position: relative; display: flex; justify-content: center; padding-left: 16px; padding-top: 16px; padding-bottom: 16px; background: var(--bg-color-primary); }
        .fixedTab { position: fixed; top: 72px; z-index: 99; transform: none; background: var(--bg-color-primary); display: flex; justify-content: center; left: 0; right: 0; padding-left: 16px; padding-top: 16px; padding-bottom: 16px; }
        .tab-item { width: 64px; height: 40px; font-size: 16px; color: var(--text-color-secondary); cursor: pointer; background: transparent; border-radius: 999px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; user-select: none; position: relative; z-index: 1; }
        .tab-item:hover { color: var(--text-color-primary); }
        .tab-item.active { color: var(--text-color-primary); font-weight: bold; background: transparent; }
        .tab-slider { position: absolute; top: 16px; width: 64px; height: 40px; border-radius: 999px; background: var(--bg-color-secondary); transition: left 0.3s cubic-bezier(.4, 0, .2, 1); z-index: 0; }
        .fixedTab .tab-slider { top: 16px; width: 64px; height: 40px; border-radius: 999px; background: var(--bg-color-secondary); transition: left 0.3s cubic-bezier(.4, 0, .2, 1); z-index: 0; }
        .hidden { display: none; }
        .content-switch-container { width: 100%; max-width: 1200px; background: var(--bg-color-primary); margin: 0 auto; position: relative; overflow: hidden; }
        .content-item { position: absolute; top: 0; left: 0; width: 100%; background: var(--bg-color-primary); transition: transform 0.3s ease; opacity: 0; pointer-events: none; display: flex; justify-content: center; }
        .content-item.active { position: relative; opacity: 1; pointer-events: auto; }
        .waterfall-container { width: 100%; max-width: 700px; padding: 0 8px; margin: 0 auto; background: var(--bg-color-primary); }
        @media (min-width: 960px) { .waterfall-container { max-width: 1000px; padding: 0 16px; } }
        @media (min-width: 901px) {
          .user-info { max-width: 650px; margin: 0 auto; padding: 16px 0px; }
          .basic-info, .user-desc, .user-interactions { padding: 0; }
          .follow-button-wrapper { right: 0; }
          .tab { max-width: 700px; margin: 0 auto; padding-left: 0; }
          .fixedTab { padding-left: 220px; }
          .content-item { padding-left: 0; }
        }
        .image-viewer-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000; cursor: pointer; }
        .preview-image { max-width: 90vw; max-height: 90vh; border-radius: 8px; }
        .text-ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
      `}</style>
    </div>
  )
}
