import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '@/stores/user-store'
import { useAuthStore } from '@/stores/auth-store'
import { useNavigationStore } from '@/stores/navigation-store'
import { userApi } from '@/lib/api'
import WaterfallFlow from '@/components/WaterfallFlow'
import VerifiedBadge from '@/components/VerifiedBadge'
import ContentRenderer from '@/components/ContentRenderer'
import BackToTopButton from '@/components/BackToTopButton'
import EditProfileModal from '@/components/modals/EditProfileModal'

const DEFAULT_AVATAR = '/avatar.png'

const TABS = [
  { name: 'posts', label: '笔记' },
  { name: 'collections', label: '收藏' },
  { name: 'likes', label: '点赞' },
]

export default function User() {
  const navigate = useNavigate()
  const userStore = useUserStore()
  const authStore = useAuthStore()
  const navigationStore = useNavigationStore()

  const [userStats, setUserStats] = useState<any>({})
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)
  const [showImageViewer, setShowImageViewer] = useState(false)
  const [currentImageUrl, setCurrentImageUrl] = useState('')
  const [activeTab, setActiveTab] = useState('posts')
  const [scrollY, setScrollY] = useState(0)
  const [refreshKeys, setRefreshKeys] = useState({ posts: 0, collections: 0, likes: 0 })

  const hasLoadedStatsOnce = useRef(false)
  const windowWidthRef = useRef(window.innerWidth)
  const isLargeScreen = windowWidthRef.current > 900

  const isLoggedIn = userStore.isLoggedIn()

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/', { replace: true })
    }
  }, [isLoggedIn, navigate])

  // Slider position
  const sliderStyle = useMemo(() => {
    const index = TABS.findIndex((t) => t.name === activeTab)
    if (isLargeScreen) {
      return { left: `calc(50% - 96px + ${index * 64}px)` }
    }
    return { left: `calc(50% - 88px + ${index * 64}px)` }
  }, [activeTab, isLargeScreen])

  const fixedSliderStyle = useMemo(() => {
    const index = TABS.findIndex((t) => t.name === activeTab)
    if (isLargeScreen) {
      return { left: `calc(220px + (100vw - 220px - 192px) / 2 + ${index * 64}px)` }
    }
    return { left: `calc(50% - 88px + ${index * 64}px)` }
  }, [activeTab, isLargeScreen])

  // Load user stats
  const loadUserStats = useCallback(async () => {
    if (userStore.userInfo?.user_id) {
      const stats = await userStore.getUserStats(userStore.userInfo.user_id)
      if (stats) setUserStats(stats)
    }
  }, [userStore])

  // Watch user info
  useEffect(() => {
    if (!userStore.userInfo?.user_id) return
    if (hasLoadedStatsOnce.current) return
    hasLoadedStatsOnce.current = true
    loadUserStats()
  }, [userStore.userInfo?.user_id, loadUserStats])

  // Mount
  useEffect(() => {
    userStore.initUserInfo()
    navigationStore.scrollToTop('instant')
  }, [])

  // Scroll listener
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Global like/collect events
  useEffect(() => {
    const handleLikeEvent = () => {
      setRefreshKeys((prev) => ({ ...prev, likes: prev.likes + 1 }))
      setTimeout(() => loadUserStats(), 500)
    }
    const handleCollectEvent = () => {
      setRefreshKeys((prev) => ({ ...prev, collections: prev.collections + 1 }))
      setTimeout(() => loadUserStats(), 500)
    }

    window.addEventListener('user-liked-post', handleLikeEvent)
    window.addEventListener('user-unliked-post', handleLikeEvent)
    window.addEventListener('user-collected-post', handleCollectEvent)
    window.addEventListener('user-uncollected-post', handleCollectEvent)

    return () => {
      window.removeEventListener('user-liked-post', handleLikeEvent)
      window.removeEventListener('user-unliked-post', handleLikeEvent)
      window.removeEventListener('user-collected-post', handleCollectEvent)
      window.removeEventListener('user-uncollected-post', handleCollectEvent)
    }
  }, [loadUserStats])

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

  const goToFollowList = useCallback((type: string) => {
    navigate(`/follow/${type}`)
  }, [navigate])

  const previewAvatar = useCallback(() => {
    setCurrentImageUrl(userStore.userInfo?.avatar || DEFAULT_AVATAR)
    setShowImageViewer(true)
  }, [userStore.userInfo])

  const handleAvatarError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = DEFAULT_AVATAR
  }, [])

  const handleProfileSaved = useCallback(async (formData: any) => {
    try {
      const response = await userApi.updateUserInfo(userStore.userInfo?.user_id, formData)
      if ((response as any).success) {
        userStore.updateUserInfo(formData)
        console.log('用户资料更新成功')
        setShowEditProfileModal(false)
        loadUserStats()
      }
    } catch (error) {
      console.error('用户资料更新API调用失败:', error)
    }
  }, [userStore, loadUserStats])

  const formatNumber = (num: number | null | undefined) => {
    if (num == null || isNaN(num)) return '0'
    const n = Number(num)
    if (n >= 10000) return (n / 10000).toFixed(1) + '万'
    return n.toString()
  }

  if (!isLoggedIn) {
    return (
      <div className="content-container">
        <div className="login-prompt">
          <div className="prompt-content">
            <h3>请先登录</h3>
            <p>登录后即可查看个人信息和管理内容</p>
          </div>
        </div>
        <style>{`
          .content-container { padding-top: 72px; margin: 0 auto; width: 100%; max-width: 1200px; background: var(--bg-color-primary); min-height: 100vh; }
          .login-prompt { display: flex; justify-content: center; align-items: center; min-height: 300px; padding: 40px 16px; background: var(--bg-color-primary); }
          .prompt-content { text-align: center; max-width: 300px; }
          .prompt-content h3 { color: var(--text-color-primary); font-size: 18px; font-weight: 600; margin: 0 0 8px 0; }
          .prompt-content p { color: var(--text-color-secondary); font-size: 14px; margin: 0; line-height: 1.5; }
        `}</style>
      </div>
    )
  }

  return (
    <div className="content-container">
      <div className="user-info">
        <div className="basic-info">
          <img
            src={userStore.userInfo?.avatar || DEFAULT_AVATAR}
            alt={userStore.userInfo?.nickname || '用户头像'}
            className="avatar"
            onClick={previewAvatar}
            onError={handleAvatarError}
          />
          <div className="user-basic">
            <div className="user-nickname">
              <span>{userStore.userInfo?.nickname || '用户'}</span>
              {userStore.userInfo?.verified && (
                <VerifiedBadge verified={userStore.userInfo.verified} size="large" />
              )}
            </div>
            <div className="user-content">
              <div className="user-id text-ellipsis">知舟号：{userStore.userInfo?.user_id || ''}</div>
              <div className="user-ip text-ellipsis">IP属地：{userStore.userInfo?.location || '未知'}</div>
            </div>
          </div>
          <div className="edit-profile-button-wrapper">
            <button className="edit-profile-btn" onClick={() => setShowEditProfileModal(true)}>
              编辑资料
            </button>
          </div>
        </div>
        <div className="user-desc">
          {userStore.userInfo?.bio ? (
            <ContentRenderer text={userStore.userInfo.bio} />
          ) : (
            <span>用户没有任何简介</span>
          )}
        </div>
        <div className="user-interactions">
          <div className="interaction-item" onClick={() => goToFollowList('following')}>
            <span className="count">{formatNumber(userStats.follow_count)}</span>
            <span className="shows">关注</span>
          </div>
          <div className="interaction-item" onClick={() => goToFollowList('followers')}>
            <span className="count">{formatNumber(userStats.fans_count)}</span>
            <span className="shows">粉丝</span>
          </div>
          <div className="interaction-item">
            <span className="count">{formatNumber(userStats.likes_and_collects)}</span>
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
      <div className={`fixedTab${scrollY < 300 ? ' hidden' : ''}`}>
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
            <WaterfallFlow
              userId={userStore.userInfo?.user_id}
              type="posts"
              refreshKey={refreshKeys.posts}
            />
          </div>
        </div>
        <div
          className={`content-item${activeTab === 'collections' ? ' active' : ''}`}
          style={{
            transform:
              activeTab === 'collections'
                ? 'translateX(0%)'
                : activeTab === 'posts'
                  ? 'translateX(100%)'
                  : 'translateX(-100%)',
          }}
        >
          <div className="waterfall-container">
            <WaterfallFlow
              userId={userStore.userInfo?.user_id}
              type="collections"
              refreshKey={refreshKeys.collections}
            />
          </div>
        </div>
        <div
          className={`content-item${activeTab === 'likes' ? ' active' : ''}`}
          style={{ transform: activeTab === 'likes' ? 'translateX(0%)' : 'translateX(100%)' }}
        >
          <div className="waterfall-container">
            <WaterfallFlow
              userId={userStore.userInfo?.user_id}
              type="likes"
              refreshKey={refreshKeys.likes}
            />
          </div>
        </div>
      </div>

      <BackToTopButton />

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <EditProfileModal
          visible={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          onSaved={handleProfileSaved}
        />
      )}

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
          width: 100%;
          max-width: 1200px;
          background: var(--bg-color-primary);
          margin: 0 auto;
          position: relative;
          overflow: hidden;
          padding-bottom: calc(48px + env(safe-area-inset-bottom, 0px));
        }
        .content-item { position: absolute; top: 0; left: 0; width: 100%; background: var(--bg-color-primary); transition: transform 0.3s ease; opacity: 0; pointer-events: none; }
        .content-item.active { position: relative; opacity: 1; pointer-events: auto; }
        .waterfall-container { width: 100%; max-width: 700px; padding: 0 8px; margin: 0 auto; background: var(--bg-color-primary); }
        @media (min-width: 960px) { .waterfall-container { max-width: 1000px; padding: 0 16px; } }
        .user-info { height: auto; min-height: 196px; padding: 16px 0; width: 100%; max-width: 1200px; overflow-x: hidden; background: var(--bg-color-primary); }
        .basic-info { display: flex; flex-direction: row; align-items: center; height: 72px; width: 100%; padding: 0 16px; position: relative; }
        .avatar { width: 72px; height: 72px; border-radius: 50%; border: 1px solid var(--border-color-primary); cursor: pointer; }
        .user-basic { display: flex; flex-direction: column; flex: 1; margin-left: 16px; gap: 6px; }
        .user-nickname { display: flex; align-items: center; gap: 6px; color: var(--text-color-primary); font-size: 18px; font-weight: bold; }
        .user-content { display: flex; flex-direction: column; color: var(--text-color-quaternary); font-size: 12px; gap: 4px; max-width: 100%; }
        @media (min-width: 901px) { .user-content { flex-direction: row; align-items: center; gap: 8px; flex-wrap: wrap; overflow: hidden; text-overflow: ellipsis; } }
        .user-id, .user-ip { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        @media (min-width: 901px) { .user-id { max-width: 60%; } }
        .user-desc { margin: 17px 0px 0px; color: var(--text-color-primary); font-size: 14px; padding: 0 16px; }
        .user-interactions { display: flex; padding: 0 16px; flex-wrap: wrap; width: 100%; }
        .user-interactions div { display: flex; flex-direction: column; margin-right: 16px; margin-top: 20px; }
        .interaction-item { cursor: pointer; padding: 4px 8px; border-radius: 8px; transition: background-color 0.3s ease; }
        .interaction-item:hover { background-color: var(--bg-color-secondary); }
        .interaction-item:last-child { cursor: default; }
        .interaction-item:last-child:hover { background-color: transparent; }
        .count { color: var(--text-color-primary); margin-right: 4px; font-size: 14px; text-align: center; }
        .shows { color: var(--text-color-quaternary); margin: 4px 0 0; font-size: 14px; text-align: center; }
        .tab { position: relative; display: flex; justify-content: center; padding-left: 16px; padding-top: 16px; padding-bottom: 16px; background: var(--bg-color-primary); }
        .fixedTab { position: fixed; top: 72px; z-index: 99; transform: none; background: var(--bg-color-primary); display: flex; justify-content: center; left: 0; right: 0; padding-left: 16px; padding-top: 16px; padding-bottom: 16px; }
        .tab-item { width: 64px; height: 40px; font-size: 16px; color: var(--text-color-secondary); cursor: pointer; background: transparent; border-radius: 999px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; user-select: none; position: relative; z-index: 1; }
        .tab-item:hover { color: var(--text-color-primary); }
        .tab-item.active { color: var(--text-color-primary); font-weight: bold; background: transparent; }
        .tab-slider { position: absolute; top: 16px; width: 64px; height: 40px; border-radius: 999px; background: var(--bg-color-secondary); transition: left 0.3s cubic-bezier(.4, 0, .2, 1); z-index: 0; }
        .fixedTab .tab-slider { top: 16px; width: 64px; height: 40px; border-radius: 999px; background: var(--bg-color-secondary); transition: left 0.3s cubic-bezier(.4, 0, .2, 1); z-index: 0; }
        .hidden { display: none; }
        .edit-profile-button-wrapper { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); }
        .edit-profile-btn { padding: 3px 16px; border: 1px solid var(--text-color-quaternary); border-radius: 20px; font-size: 14px; font-weight: bold; cursor: pointer; width: 90px; height: 40px; text-align: center; transition: all 0.3s ease; user-select: none; background: #aeadad0d; color: var(--text-color-tertiary); }
        .edit-profile-btn:hover { background: #6e6e6e2c; color: var(--text-color-secondary); border-color: var(--text-color-tertiary); }
        @media (min-width: 901px) {
          .user-info { max-width: 650px; margin: 0 auto; padding: 16px 0px; }
          .basic-info, .user-desc, .user-interactions { padding: 0; }
          .tab { max-width: 700px; margin: 0 auto; padding-left: 0; }
          .fixedTab { padding-left: 220px; }
          .edit-profile-button-wrapper { right: 0; }
        }
        .image-viewer-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000; cursor: pointer; }
        .preview-image { max-width: 90vw; max-height: 90vh; border-radius: 8px; }
        .text-ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
      `}</style>
    </div>
  )
}
