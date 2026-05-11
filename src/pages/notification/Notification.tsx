import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '@/stores/user-store'
import { useAuthStore } from '@/stores/auth-store'
import { useFollowStore } from '@/stores/follow-store'
import { useNotificationStore } from '@/stores/notification-store'
import {
  getCommentNotifications,
  getLikeNotifications,
  getFollowNotifications,
  getCollectionNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/lib/api/notification'
import { getPostDetail } from '@/lib/api/posts'
import { TabContainer, type Tab } from '@/components/TabContainer'
import FollowButton from '@/components/FollowButton'
import { LikeButton } from '@/components/LikeButton'
import VerifiedBadge from '@/components/VerifiedBadge'
import SimpleSpinner from '@/components/spinner/SimpleSpinner'
import BackToTopButton from '@/components/BackToTopButton'
import DetailCard from '@/components/DetailCard'

const DEFAULT_AVATAR = '/avatar.png'
const PAGE_SIZE = 20

const TABS: Tab[] = [
  { id: 'comments', label: '评论和@' },
  { id: 'likes', label: '点赞' },
  { id: 'collections', label: '收藏' },
  { id: 'follows', label: '新增关注' },
]

interface NotificationItem {
  notificationId: number
  id: string
  autoId: number
  username: string
  avatar: string
  verified: number
  action: string
  time: string
  content?: string
  postImage?: string
  target_id?: number
  commentId?: number
  isLiked?: boolean
  likeCount?: number
  postAuthorId?: number
  isRead: boolean
  isFollowing: boolean
  isReplyComment?: boolean
  parentCommentContent?: string
  target_type?: number
  from_user_id?: string
  isMutual?: boolean
  buttonType?: string
  showReplyInput?: boolean
  replyContent?: string
}

export default function Notification() {
  const navigate = useNavigate()
  const userStore = useUserStore()
  const authStore = useAuthStore()
  const followStore = useFollowStore()
  const notificationStore = useNotificationStore()

  const [activeTab, setActiveTab] = useState('comments')
  const [isLoading, setIsLoading] = useState(true)

  // Data arrays
  const [commentsData, setCommentsData] = useState<NotificationItem[]>([])
  const [likesData, setLikesData] = useState<NotificationItem[]>([])
  const [collectionsData, setCollectionsData] = useState<NotificationItem[]>([])
  const [followsData, setFollowsData] = useState<NotificationItem[]>([])

  // Detail card
  const [showDetailCard, setShowDetailCard] = useState(false)
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [targetCommentId, setTargetCommentId] = useState<number | null>(null)

  // Pagination
  const [pagination, setPagination] = useState<Record<string, { page: number; hasMore: boolean; loading: boolean }>>({
    comments: { page: 1, hasMore: true, loading: false },
    likes: { page: 1, hasMore: true, loading: false },
    collections: { page: 1, hasMore: true, loading: false },
    follows: { page: 1, hasMore: true, loading: false },
  })

  // Track loaded tabs
  const loadedTabs = useRef(new Set<string>())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null)

  const isLoggedIn = userStore.isLoggedIn()

  // Get data for current tab
  const currentData = useMemo(() => {
    const map: Record<string, NotificationItem[]> = {
      comments: commentsData,
      likes: likesData,
      collections: collectionsData,
      follows: followsData,
    }
    return map[activeTab] || []
  }, [activeTab, commentsData, likesData, collectionsData, followsData])

  // Load notification data
  const loadCommentsData = useCallback(async (isLoadMore = false) => {
    const tabPagination = pagination.comments
    if (!isLoggedIn || tabPagination.loading) return
    if (!isLoadMore && loadedTabs.current.has('comments')) return
    if (isLoadMore && !tabPagination.hasMore) return

    setPagination((prev) => ({ ...prev, comments: { ...prev.comments, loading: true } }))
    try {
      const params = { page: isLoadMore ? tabPagination.page : 1, limit: PAGE_SIZE }
      const response = await getCommentNotifications(params)
      const notifications = response.data?.notifications || []

      const transformed = notifications.map((item: any) => ({
        notificationId: item.id,
        id: item.from_user_id,
        autoId: item.from_user_auto_id,
        username: item.from_nickname || '未知用户',
        avatar: item.from_avatar || DEFAULT_AVATAR,
        verified: item.from_verified || 0,
        action: item.title || '评论了你的笔记',
        time: formatTime(item.created_at),
        content: item.type === 8 ? '点击查看详情' : (item.comment_content || '原评论已删除'),
        postImage: item.post_image || '/default-post.png',
        target_id: item.target_id,
        commentId: item.comment_id,
        isLiked: item.comment_is_liked === 1,
        likeCount: item.comment_like_count || 0,
        postAuthorId: item.post_author_id,
        isRead: item.is_read === 1,
        isFollowing: false,
        isReplyComment: item.type === 5,
        parentCommentContent: item.parent_comment_content || (item.type === 5 ? '原评论已删除' : ''),
      }))

      if (isLoadMore) {
        setCommentsData((prev) => [...prev, ...transformed])
        setPagination((prev) => ({ ...prev, comments: { ...prev.comments, page: prev.comments.page + 1 } }))
      } else {
        setCommentsData(transformed)
        setPagination((prev) => ({ ...prev, comments: { ...prev.comments, page: 2 } }))
        loadedTabs.current.add('comments')
      }

      setPagination((prev) => ({
        ...prev,
        comments: { ...prev.comments, hasMore: transformed.length === PAGE_SIZE, loading: false },
      }))
    } catch (error) {
      console.error('加载评论通知失败:', error)
      if (!isLoadMore) setCommentsData([])
      setPagination((prev) => ({ ...prev, comments: { ...prev.comments, loading: false } }))
    }
  }, [isLoggedIn, pagination.comments])

  const loadLikesData = useCallback(async (isLoadMore = false) => {
    const tabPagination = pagination.likes
    if (!isLoggedIn || tabPagination.loading) return
    if (!isLoadMore && loadedTabs.current.has('likes')) return
    if (isLoadMore && !tabPagination.hasMore) return

    setPagination((prev) => ({ ...prev, likes: { ...prev.likes, loading: true } }))
    try {
      const params = { page: isLoadMore ? tabPagination.page : 1, limit: PAGE_SIZE }
      const response = await getLikeNotifications(params)
      const transformed = (response.data?.notifications || []).map((item: any) => ({
        notificationId: item.id,
        id: item.from_user_id,
        autoId: item.from_user_auto_id,
        username: item.from_nickname || '未知用户',
        avatar: item.from_avatar || DEFAULT_AVATAR,
        verified: item.from_verified || 0,
        action: item.title || '点赞了你的内容',
        time: formatTime(item.created_at),
        postImage: item.post_image || '/default-post.png',
        target_id: item.target_id,
        target_type: item.target_type,
        commentId: item.comment_id,
        postAuthorId: item.post_author_id,
        isRead: item.is_read === 1,
        isFollowing: false,
      }))

      if (isLoadMore) {
        setLikesData((prev) => [...prev, ...transformed])
        setPagination((prev) => ({ ...prev, likes: { ...prev.likes, page: prev.likes.page + 1 } }))
      } else {
        setLikesData(transformed)
        setPagination((prev) => ({ ...prev, likes: { ...prev.likes, page: 2 } }))
        loadedTabs.current.add('likes')
      }
      setPagination((prev) => ({
        ...prev,
        likes: { ...prev.likes, hasMore: transformed.length === PAGE_SIZE, loading: false },
      }))
    } catch (error) {
      console.error('加载点赞通知失败:', error)
      if (!isLoadMore) setLikesData([])
      setPagination((prev) => ({ ...prev, likes: { ...prev.likes, loading: false } }))
    }
  }, [isLoggedIn, pagination.likes])

  const loadCollectionsData = useCallback(async (isLoadMore = false) => {
    const tabPagination = pagination.collections
    if (!isLoggedIn || tabPagination.loading) return
    if (!isLoadMore && loadedTabs.current.has('collections')) return
    if (isLoadMore && !tabPagination.hasMore) return

    setPagination((prev) => ({ ...prev, collections: { ...prev.collections, loading: true } }))
    try {
      const params = { page: isLoadMore ? tabPagination.page : 1, limit: PAGE_SIZE }
      const response = await getCollectionNotifications(params)
      const transformed = (response.data?.notifications || []).map((item: any) => ({
        notificationId: item.id,
        id: item.from_user_id,
        autoId: item.from_user_auto_id,
        username: item.from_nickname || '未知用户',
        avatar: item.from_avatar || DEFAULT_AVATAR,
        verified: item.from_verified || 0,
        action: item.title || '收藏了你的笔记',
        time: formatTime(item.created_at),
        postImage: item.post_image || '/default-post.png',
        target_id: item.target_id,
        isRead: item.is_read === 1,
        isFollowing: false,
      }))

      if (isLoadMore) {
        setCollectionsData((prev) => [...prev, ...transformed])
        setPagination((prev) => ({ ...prev, collections: { ...prev.collections, page: prev.collections.page + 1 } }))
      } else {
        setCollectionsData(transformed)
        setPagination((prev) => ({ ...prev, collections: { ...prev.collections, page: 2 } }))
        loadedTabs.current.add('collections')
      }
      setPagination((prev) => ({
        ...prev,
        collections: { ...prev.collections, hasMore: transformed.length === PAGE_SIZE, loading: false },
      }))
    } catch (error) {
      console.error('加载收藏通知失败:', error)
      if (!isLoadMore) setCollectionsData([])
      setPagination((prev) => ({ ...prev, collections: { ...prev.collections, loading: false } }))
    }
  }, [isLoggedIn, pagination.collections])

  const loadFollowsData = useCallback(async (isLoadMore = false) => {
    const tabPagination = pagination.follows
    if (!isLoggedIn || tabPagination.loading) return
    if (!isLoadMore && loadedTabs.current.has('follows')) return
    if (isLoadMore && !tabPagination.hasMore) return

    setPagination((prev) => ({ ...prev, follows: { ...prev.follows, loading: true } }))
    try {
      const params = { page: isLoadMore ? tabPagination.page : 1, limit: PAGE_SIZE }
      const response = await getFollowNotifications(params)
      const transformed = (response.data?.notifications || []).map((item: any) => {
        let actionText = item.title || 'Ta关注了你'
        return {
          notificationId: item.id,
          id: item.from_user_id,
          from_user_id: item.from_user_id,
          autoId: item.from_user_auto_id,
          username: item.from_nickname || '未知用户',
          avatar: item.from_avatar || DEFAULT_AVATAR,
          verified: item.from_verified || 0,
          action: actionText,
          time: formatTime(item.created_at),
          followCount: item.follow_count || 0,
          fansCount: item.fans_count || 0,
          isRead: item.is_read === 1,
          isFollowing: false,
          isMutual: false,
          buttonType: 'follow',
        }
      })

      if (isLoadMore) {
        setFollowsData((prev) => [...prev, ...transformed])
        setPagination((prev) => ({ ...prev, follows: { ...prev.follows, page: prev.follows.page + 1 } }))
      } else {
        setFollowsData(transformed)
        setPagination((prev) => ({ ...prev, follows: { ...prev.follows, page: 2 } }))
        loadedTabs.current.add('follows')
      }
      setPagination((prev) => ({
        ...prev,
        follows: { ...prev.follows, hasMore: transformed.length === PAGE_SIZE, loading: false },
      }))
    } catch (error) {
      console.error('加载关注通知失败:', error)
      if (!isLoadMore) setFollowsData([])
      setPagination((prev) => ({ ...prev, follows: { ...prev.follows, loading: false } }))
    }
  }, [isLoggedIn, pagination.follows])

  // Load current tab
  const loadCurrentTabData = useCallback(async () => {
    if (!isLoggedIn) { setIsLoading(false); return }
    if (loadedTabs.current.has(activeTab)) { setIsLoading(false); return }

    setIsLoading(true)
    window.scrollTo(0, 0)

    switch (activeTab) {
      case 'comments': await loadCommentsData(); break
      case 'likes': await loadLikesData(); break
      case 'collections': await loadCollectionsData(); break
      case 'follows': await loadFollowsData(); break
    }
    loadedTabs.current.add(activeTab)
    setIsLoading(false)
  }, [activeTab, isLoggedIn, loadCommentsData, loadLikesData, loadCollectionsData, loadFollowsData])

  // Setup IntersectionObserver for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }
    const trigger = loadMoreTriggerRef.current
    if (!trigger) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pagination[activeTab].hasMore && !pagination[activeTab].loading) {
          loadMoreData()
        }
      },
      { rootMargin: '100px', threshold: 0.1 },
    )
    observerRef.current.observe(trigger)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [activeTab, pagination])

  async function loadMoreData() {
    switch (activeTab) {
      case 'comments': await loadCommentsData(true); break
      case 'likes': await loadLikesData(true); break
      case 'collections': await loadCollectionsData(true); break
      case 'follows': await loadFollowsData(true); break
    }
  }

  const handleTabChange = useCallback((item: Tab) => {
    setActiveTab(item.id as string)
  }, [])

  // Load when tab changes
  useEffect(() => {
    loadCurrentTabData()
  }, [activeTab, loadCurrentTabData])

  // Mark as read
  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      await markNotificationAsRead(notificationId)
      // Update local state
      const updater = (data: NotificationItem[]) =>
        data.map((item) => (item.notificationId === notificationId ? { ...item, isRead: true } : item))
      setCommentsData(updater)
      setLikesData(updater)
      setCollectionsData(updater)
      setFollowsData(updater)
    } catch (error) {
      console.error('标记通知已读失败:', error)
    }
  }, [])

  const handleNotificationHover = useCallback((item: NotificationItem) => {
    if (!item.isRead) markAsRead(item.notificationId)
  }, [markAsRead])

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead()
      const updater = (data: NotificationItem[]) => data.map((item) => ({ ...item, isRead: true }))
      setCommentsData(updater)
      setLikesData(updater)
      setCollectionsData(updater)
      setFollowsData(updater)
      notificationStore.clearUnreadCount()
    } catch (error) {
      console.error('标记所有通知已读失败:', error)
    }
  }, [notificationStore])

  // Click delegation
  const onUserClick = useCallback((userId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(`${window.location.origin}/user/${userId}`, '_blank')
  }, [])

  const onImageClick = useCallback(async (notification: NotificationItem) => {
    if (!notification.target_id) return
    try {
      const postDetail = await getPostDetail(notification.target_id)
      if (postDetail) {
        setSelectedPost(postDetail)
        setTargetCommentId(notification.commentId || null)
        setShowDetailCard(true)
        document.title = postDetail.title || '笔记详情'
      }
    } catch (error) {
      console.error('获取笔记详情失败:', error)
    }
  }, [])

  const closeDetailCard = useCallback(() => {
    setShowDetailCard(false)
    setSelectedPost(null)
    setTargetCommentId(null)
  }, [])

  // Mount
  useEffect(() => {
    window.scrollTo(0, 0)
    if (isLoggedIn) {
      notificationStore.fetchUnreadCountByType()
    }
    loadCurrentTabData()
    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  if (!isLoggedIn) {
    return (
      <div className="content-container">
        <div className="login-prompt">
          <h3>请先登录</h3>
          <p>登录后即可查看评论、点赞和关注通知</p>
        </div>
        <style>{`
          .content-container { background-color: var(--bg-color-primary); padding-top: 144px; min-height: 100vh; }
          .login-prompt { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; text-align: center; }
          .login-prompt h3 { color: var(--text-color-primary); font-size: 18px; font-weight: 600; margin: 0 0 8px 0; }
          .login-prompt p { color: var(--text-color-secondary); font-size: 14px; margin: 0; line-height: 1.5; }
        `}</style>
      </div>
    )
  }

  return (
    <div className="content-container">
      <div className="notification-main">
        <div className="notification-tabs">
          <TabContainer tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />
        </div>
        <BackToTopButton />

        {/* Mark all as read button */}
        <div className="floating-mark-read-btn-wrapper" onClick={markAllAsRead}>
          <div className="floating-mark-read-btn">
            <span className="mark-read-icon">✓</span>
          </div>
          <div className="tooltip">一键已读</div>
        </div>

        {isLoading ? (
          <div className="loading-container">
            <SimpleSpinner size={32} />
            <span className="loading-text">加载中...</span>
          </div>
        ) : (
          <div className={`content-wrapper${isLoading ? ' with-loading' : ''}`}>
            <div className="main-content">
              {currentData.length === 0 ? (
                <div className="empty-state">
                  <h3>暂无通知</h3>
                  <p>当有新的通知时，会显示在这里</p>
                </div>
              ) : (
                <>
                  {currentData.map((item: NotificationItem) => (
                    <div
                      key={item.notificationId}
                      className={`notification-item${!item.isRead ? ' unread' : ''}`}
                      onMouseEnter={() => handleNotificationHover(item)}
                    >
                      <div className="left-section">
                        <a className="user-avatar" onClick={(e) => onUserClick(item.id, e)}>
                          <img src={item.avatar} alt={item.username} onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR }} />
                        </a>
                        {!item.isRead && <div className="unread-dot" />}
                      </div>
                      <div className="right-section">
                        <div className="notification-content">
                          <div className="username-container">
                            <a className="username" onClick={(e) => onUserClick(item.id, e)}>
                              {item.username}
                            </a>
                            <VerifiedBadge verified={item.verified || 0} />
                            {item.postAuthorId && item.autoId && item.postAuthorId === item.autoId && (
                              <div className="author-badge">作者</div>
                            )}
                          </div>
                          <div className="interaction-hint">
                            <span className="action">{item.action}</span>
                            <span className="time">{item.time}</span>
                          </div>
                          {item.content && (
                            <div className="notification-text" onClick={() => onImageClick(item)}>
                              {item.content}
                              {item.isReplyComment && item.parentCommentContent && (
                                <div className="replied-comment">{item.parentCommentContent}</div>
                              )}
                            </div>
                          )}
                        </div>
                        {activeTab === 'follows' ? (
                          <div className="follow-button-col">
                            <FollowButton
                              userId={Number(item.from_user_id || item.id)}
                              isFollowing={item.isFollowing}
                            />
                          </div>
                        ) : (
                          <div className="post-thumbnail" onClick={() => onImageClick(item)}>
                            <img src={item.postImage || '/default-post.png'} alt="缩略图" onError={(e) => { e.currentTarget.src = '/default-post.png' }} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {/* Load more trigger */}
                  {pagination[activeTab].hasMore && (
                    <div ref={loadMoreTriggerRef} className="load-more-trigger" />
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Detail Card */}
      {showDetailCard && selectedPost && (
        <DetailCard
          item={selectedPost}
          targetCommentId={targetCommentId ? String(targetCommentId) : null}
          onClose={closeDetailCard}
        />
      )}

      <style>{`
        .content-container { background-color: var(--bg-color-primary); padding-top: 72px; transition: background 0.3s ease; }
        .loading-container { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 20px 16px; flex-direction: row; position: fixed; top: 72px; left: 50%; transform: translateX(-50%); width: calc(100% - 32px); max-width: 700px; z-index: 100; background-color: var(--bg-color-primary); }
        .loading-text { color: var(--text-color-secondary); font-size: 14px; }
        .notification-main { max-width: 700px; margin: 0 auto; padding: 0 16px; background-color: var(--bg-color-primary); }
        .notification-tabs { position: sticky; top: 72px; z-index: 99; background-color: var(--bg-color-primary); padding: 8px 0; margin: 0 -16px; padding-left: 16px; padding-right: 16px; }
        .floating-mark-read-btn-wrapper { position: fixed; bottom: 60px; right: 12px; z-index: 999; cursor: pointer; display: inline-block; }
        .floating-mark-read-btn { display: flex; justify-content: center; align-items: center; width: 38px; height: 38px; border-radius: 50%; background-color: var(--bg-color-primary); border: 1px solid var(--border-color-primary); transition: all 0.3s ease; }
        .floating-mark-read-btn:hover { background-color: var(--bg-color-secondary); }
        .mark-read-icon { color: var(--text-color-secondary); font-size: 14px; font-weight: bold; }
        .floating-mark-read-btn-wrapper .tooltip { position: absolute; right: 50px; top: 50%; transform: translateY(-50%); background: var(--bg-color-primary); color: var(--text-color-primary); padding: 4px 8px; border-radius: 6px; font-size: 12px; white-space: nowrap; opacity: 0; visibility: hidden; transition: opacity 0.3s ease, visibility 0.3s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.15); border: 1px solid var(--border-color-primary); z-index: 10; pointer-events: none; }
        .floating-mark-read-btn-wrapper:hover .tooltip { opacity: 1; visibility: visible; }
        .content-wrapper { transition: margin-top 0.3s ease; }
        .content-wrapper.with-loading { margin-top: 40px; }
        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; text-align: center; }
        .empty-state h3 { color: var(--text-color-primary); font-size: 18px; font-weight: 600; margin: 0 0 8px 0; }
        .empty-state p { color: var(--text-color-secondary); font-size: 14px; margin: 0; line-height: 1.5; }
        .notification-item { display: flex; align-items: flex-start; padding-top: 20px; }
        .notification-item.unread { background: var(--bg-color-secondary); border-radius: 8px; margin: 0 -8px; padding-left: 8px; padding-right: 8px; margin-bottom: 5px; }
        .unread-dot { width: 8px; height: 8px; background: var(--danger-color); border-radius: 50%; position: absolute; top: 0; right: 0; transform: translate(50%, -50%); }
        .left-section { flex-shrink: 0; margin-right: 24px; position: relative; }
        .user-avatar { width: 48px; height: 48px; border-radius: 50%; overflow: hidden; flex-shrink: 0; cursor: pointer; display: block; }
        .user-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .right-section { flex: 1; min-width: 0; display: flex; align-items: flex-start; padding-bottom: 20px; border-bottom: 1px solid var(--bg-color-secondary); }
        .notification-content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
        .username-container { display: flex; align-items: center; gap: 6px; }
        .username { font-weight: bold; color: var(--text-color-primary); font-size: 16px; cursor: pointer; text-decoration: none; }
        .author-badge { display: inline-flex; background-color: var(--bg-color-primary); color: var(--text-color-tertiary); font-weight: 600; border-radius: 999px; border: 1px solid var(--border-color-primary); font-size: 9px; padding: 2px 4px; opacity: 0.9; flex-shrink: 0; }
        .interaction-hint { display: flex; gap: 8px; }
        .action, .time { color: var(--text-color-tertiary); font-size: 14px; }
        .notification-text { color: var(--text-color-primary); font-size: 14px; line-height: 1.4; cursor: pointer; }
        .replied-comment { margin-top: 7px; padding: 1px 12px; font-size: 12px; color: var(--text-color-tertiary); border-left: 3px solid var(--bg-color-tertiary); line-height: 1.3; max-width: 100%; word-break: break-word; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; }
        .post-thumbnail { width: 60px; height: 60px; border-radius: 8px; overflow: hidden; margin-left: 12px; flex-shrink: 0; cursor: pointer; }
        .post-thumbnail img { width: 100%; height: 100%; object-fit: cover; }
        .follow-button-col { flex-shrink: 0; display: flex; align-items: center; margin-left: 12px; }
        .load-more-trigger { height: 1px; width: 100%; }
        @media (min-width: 901px) {
          .notification-main { max-width: 700px; margin: 0 auto; padding: 0; }
          .notification-tabs { margin: 0; padding-left: 0; padding-right: 0; }
          .loading-container { left: calc(50% + 114px); }
        }
        @media (max-width: 900px) {
          .interaction-hint .action, .interaction-hint .time { font-size: 12px; }
        }
      `}</style>
    </div>
  )
}

// Time formatting utility
function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHour = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return '刚刚'
    if (diffMin < 60) return `${diffMin}分钟前`
    if (diffHour < 24) return `${diffHour}小时前`
    if (diffDay < 7) return `${diffDay}天前`

    const month = date.getMonth() + 1
    const day = date.getDate()
    if (date.getFullYear() === now.getFullYear()) {
      return `${month}月${day}日`
    }
    return `${date.getFullYear()}年${month}月${day}日`
  } catch {
    return dateStr
  }
}
