import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { X, ChevronLeft, ChevronRight, MessageCircle, Share2, Bookmark, Image as ImageIcon, Smile, AtSign, Video, Check, ChevronDown } from 'lucide-react'
import { toast } from '@/utils/toastManager'

// Stores
import { useUserStore } from '@/stores/user-store'
import { useAuthStore } from '@/stores/auth-store'
import { useLikeStore } from '@/stores/like-store'
import { useCollectStore } from '@/stores/collect-store'
import { useFollowStore } from '@/stores/follow-store'
import { useCommentStore } from '@/stores/comment-store'
import { useCommentLikeStore } from '@/stores/comment-like-store'

// Hooks
import { useScrollLock } from '@/hooks/use-scroll-lock'
import { useClickOutside } from '@/hooks/use-click-outside'
import { useEscapeKey } from '@/hooks/use-escape-key'

// Components
import { FollowButton } from '@/components/FollowButton'
import { LikeButton } from '@/components/LikeButton'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { ContentRenderer } from '@/components/ContentRenderer'
import { EmojiPicker } from '@/components/EmojiPicker'
import ContentEditableInput from '@/components/ContentEditableInput'
import MentionModal from '@/components/mention/MentionModal'
import ImageViewer from '@/components/ImageViewer'

// Styles
import './DetailCard.css'

// API
import { commentApi } from '@/lib/api/comment'
import { userApi } from '@/lib/api/user'
import { postApi } from '@/lib/api/post'
import { getPostDetail, getUserPosts } from '@/lib/api/posts'
import { imageUploadApi } from '@/lib/api/upload'

// Utils & Types
import { formatTime } from '@/utils/timeFormat'
import type { TransformedPost } from '@/types/post'

// ============================================================
// Types
// ============================================================

interface DetailCardProps {
  item: TransformedPost
  pageMode?: boolean
  clickPosition?: { x: number; y: number }
  targetCommentId?: string | null
  disableAutoFetch?: boolean
}

interface DetailCardCallbacks {
  onClose: () => void
  onFollow?: (userId: number) => void
  onUnfollow?: (userId: number) => void
  onLike?: (data: { postId: number; liked: boolean }) => void
  onCollect?: (data: { postId: number; collected: boolean }) => void
}

type DetailCardFullProps = DetailCardProps & DetailCardCallbacks

interface CommentUser {
  id: number
  user_id: number | string
  user_auto_id: number
  username: string
  avatar: string
  verified: number
  content: string
  time: string
  location: string
  likeCount: number
  isLiked: boolean
  parent_id: number | null
  replies: CommentUser[]
  reply_count: number
  isReply: boolean
  replyTo?: string
}

interface UploadedImage {
  file?: File
  preview?: string
  url?: string | null
  uploaded: boolean
}

interface ReplyingTo {
  id: number
  username: string
  content: string
  commentId: number
  [key: string]: any
}

// ============================================================
// Default avatar & placeholder
// ============================================================
const DEFAULT_AVATAR = '/avatar.png'

// ============================================================
// Helpers
// ============================================================

function getStorageKeys(url: string) {
  const safeKey = url ? encodeURIComponent(url) : 'unknown'
  return {
    timeKey: `video_progress_${safeKey}`,
    volumeKey: 'video_volume_global',
  }
}

function restoreMediaState(el: HTMLVideoElement, url: string) {
  const { timeKey, volumeKey } = getStorageKeys(url)
  try {
    const savedVolume = localStorage.getItem(volumeKey)
    const volume = savedVolume !== null ? Number(savedVolume) : 0.5
    el.volume = Math.max(0, Math.min(1, isNaN(volume) ? 0.5 : volume))

    const savedTime = localStorage.getItem(timeKey)
    if (savedTime !== null) {
      const targetTime = Number(savedTime)
      const seekOnMetadata = () => {
        el.currentTime = isNaN(targetTime) ? 0 : targetTime
        el.removeEventListener('loadedmetadata', seekOnMetadata)
      }
      if (el.readyState >= 1) {
        el.currentTime = isNaN(targetTime) ? 0 : targetTime
      } else {
        el.addEventListener('loadedmetadata', seekOnMetadata)
      }
    }
  } catch (_) {}
}

function bindMediaListeners(el: HTMLVideoElement, url: string) {
  const { timeKey, volumeKey } = getStorageKeys(url)
  const onTimeUpdate = () => {
    try { localStorage.setItem(timeKey, String(el.currentTime || 0)) } catch (_) {}
  }
  const onVolumeChange = () => {
    try { localStorage.setItem(volumeKey, String(el.volume)) } catch (_) {}
  }
  el.addEventListener('timeupdate', onTimeUpdate)
  el.addEventListener('volumechange', onVolumeChange)
  return { onTimeUpdate, onVolumeChange }
}

function unbindMediaListeners(
  el: HTMLVideoElement,
  handlers: { onTimeUpdate: () => void; onVolumeChange: () => void } | null
) {
  if (!el || !handlers) return
  el.removeEventListener('timeupdate', handlers.onTimeUpdate)
  el.removeEventListener('volumechange', handlers.onVolumeChange)
}

// ============================================================
// DetailCard Component
// ============================================================

const DetailCard: React.FC<DetailCardFullProps> = memo(({
  item,
  pageMode = false,
  clickPosition,
  targetCommentId,
  disableAutoFetch = false,
  onClose,
  onFollow,
  onUnfollow,
  onLike,
  onCollect,
}) => {
  // ============================================================
  // Stores
  // ============================================================
  const userStore = useUserStore()
  const authStore = useAuthStore()
  const likeStore = useLikeStore()
  const collectStore = useCollectStore()
  const followStore = useFollowStore()
  const commentStore = useCommentStore()
  const commentLikeStore = useCommentLikeStore()

  const isLoggedIn = userStore.isLoggedIn()

  // ============================================================
  // Scroll Lock
  // ============================================================
  const { lock, unlock } = useScrollLock()

  // ============================================================
  // Core State
  // ============================================================
  const [isAnimating, setIsAnimating] = useState(true)
  const [isClosing, setIsClosing] = useState(false)
  const [showContent, setShowContent] = useState(false)

  // Window dimensions
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth)
  const isMobile = windowWidth <= 768

  // Image section
  const [imageSectionWidth, setImageSectionWidth] = useState(400)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showImageControls, setShowImageControls] = useState(false)
  const [showImageViewer, setShowImageViewer] = useState(false)

  // Comment image viewer
  const [showCommentImageViewer, setShowCommentImageViewer] = useState(false)
  const [commentImages, setCommentImages] = useState<string[]>([])
  const [currentCommentImageIndex, setCurrentCommentImageIndex] = useState(0)

  // Video
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const videoPlayerRef = useRef<HTMLVideoElement>(null)
  const mobileVideoPlayerRef = useRef<HTMLVideoElement>(null)
  const mediaHandlersRef = useRef<{
    desktop: { onTimeUpdate: () => void; onVolumeChange: () => void } | null
    mobile: { onTimeUpdate: () => void; onVolumeChange: () => void } | null
  }>({ desktop: null, mobile: null })

  // Tooltip
  const [showTooltip, setShowTooltip] = useState(false)

  // Toast
  // Share
  const [isShared, setIsShared] = useState(false)

  // Comment input
  const [commentInput, setCommentInput] = useState('')
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [replyingTo, setReplyingTo] = useState<ReplyingTo | null>(null)

  // Sort menu
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [commentSortOrder, setCommentSortOrder] = useState<'asc' | 'desc'>('desc')

  // Emoji / Mention / Image upload
  const [showEmojiPanel, setShowEmojiPanel] = useState(false)
  const [showMentionPanel, setShowMentionPanel] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])

  // Replies expand
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set())

  // Scroll / pagination
  const [hasTriggeredBottom, setHasTriggeredBottom] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const lastScrollTopRef = useRef(0)

  // Touch swipe
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchEndX = useRef(0)
  const touchEndY = useRef(0)
  const isTouching = useRef(false)

  // Preloaded images
  const preloadedImages = useRef<Set<string>>(new Set())

  // Refs
  const cardRef = useRef<HTMLDivElement>(null)
  const scrollableContentRef = useRef<HTMLDivElement>(null)
  const contentSectionRef = useRef<HTMLDivElement>(null)
  const authorWrapperRef = useRef<HTMLDivElement>(null)
  const focusedInputRef = useRef<HTMLDivElement>(null)

  // ============================================================
  // Helpers
  // ============================================================

  const showMessage = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (type === 'error') toast.error(message)
    else if (type === 'info') toast.info(message)
    else toast.success(message)
  }, [])

  const handleAvatarError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.src = DEFAULT_AVATAR
  }, [])

  const preloadImage = useCallback((imageUrl: string) => {
    if (!imageUrl || preloadedImages.current.has(imageUrl)) return
    const img = new Image()
    img.onload = () => {
      preloadedImages.current.add(imageUrl)
    }
    img.onerror = () => {
      console.warn('预加载图片失败')
    }
    img.src = imageUrl
  }, [])

  // ============================================================
  // Derived Computed Values
  // ============================================================

  const likeData = useMemo(
    () => likeStore.getPostLikeState(item.id),
    [item.id, likeStore]
  )
  const isLiked = likeData.liked ?? false
  const likeCount = likeData.likeCount ?? item.likeCount ?? item.like_count ?? 0

  const collectData = useMemo(
    () => collectStore.getPostCollectState(item.id),
    [item.id, collectStore]
  )
  const isCollected = collectData.collected ?? false
  const collectCount = collectData.collectCount ?? item.collectCount ?? item.collect_count ?? 0

  const contentSectionWidth = useMemo(() => {
    if (isMobile) return windowWidth
    const maxTotalWidth = windowWidth * 0.95
    const remainingWidth = maxTotalWidth - imageSectionWidth
    return Math.max(350, Math.min(400, remainingWidth))
  }, [isMobile, windowWidth, imageSectionWidth])

  const cardWidth = useMemo(() => {
    return imageSectionWidth + contentSectionWidth
  }, [imageSectionWidth, contentSectionWidth])

  const animationStyle = useMemo(() => {
    if (!isAnimating) return {}
    if (!clickPosition) return {}
    const { x, y } = clickPosition
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2
    const translateX = (x - centerX) * 0.3
    const translateY = (y - centerY) * 0.3
    return {
      '--start-x': `${translateX}px`,
      '--start-y': `${translateY}px`,
    } as React.CSSProperties
  }, [isAnimating, clickPosition])

  const authorId = item.user_id || item.originalData?.userId || item.author_account

  // Subscribe reactively to author's follow state from store
  const authorFollowState = useFollowStore(
    useCallback(
      (state) => {
        const key = authorId ? String(authorId) : null
        return key ? state.userFollowStates.get(key) : undefined
      },
      [authorId]
    )
  )

  const authorData = useMemo(() => {
    const followState = authorFollowState || { followed: false, isMutual: false, buttonType: 'follow' as const }
    return {
      id: authorId,
      name: item.author || '匿名用户',
      avatar: item.avatar || '',
      verified: item.verified || item.author_verified || 0,
      isFollowing: followState.followed,
      buttonType: followState.buttonType,
    }
  }, [item, authorId, authorFollowState])

  const isCurrentUserPost = useMemo(() => {
    if (!isLoggedIn || !userStore.userInfo) return false
    const currentUserId = userStore.userInfo.id
    const authorId = item.author_auto_id
    return currentUserId === authorId
  }, [isLoggedIn, userStore.userInfo, item.author_auto_id])

  const postData = useMemo(() => ({
    title: item.title || '无标题',
    content: item.originalData?.content || item.content || '暂无内容',
    tags: item.originalData?.tags
      ? (Array.isArray(item.originalData.tags) ? item.originalData.tags.map(tag => typeof tag === 'object' ? (tag as any).name : tag) : [])
      : (item.tags
          ? (Array.isArray(item.tags) ? item.tags.map(tag => typeof tag === 'object' ? (tag as any).name : tag) : [])
          : []),
    time: formatTime(item.originalData?.createdAt || item.created_at || ''),
    location: item.location || '',
  }), [item])

  const imageList = useMemo(() => {
    if (item.originalData?.images && Array.isArray(item.originalData.images) && item.originalData.images.length > 0) {
      return item.originalData.images
    }
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      return item.images
    }
    if (item.image) {
      return [item.image]
    }
    return ['/zhizhou-placeholder.jpg']
  }, [item])

  const hasMultipleImages = imageList.length > 1

  const commentData = commentStore.getComments(item.id)
  const comments = commentData.comments
  const loadingComments = commentData.loading
  const commentCount = commentData.total || 0
  const hasMoreCommentsToShow = commentData.hasMore || false

  const enhancedComments = useMemo(() => {
    return comments.map(comment => {
      const commentLikeState = commentLikeStore.getCommentLikeState(comment.id)
      const enhancedReplies = comment.replies ? comment.replies.map(reply => {
        const replyLikeState = commentLikeStore.getCommentLikeState(reply.id)
        return {
          ...reply,
          isLiked: replyLikeState.liked,
          likeCount: replyLikeState.likeCount,
        }
      }) : []
      return {
        ...comment,
        isLiked: commentLikeState.liked,
        likeCount: commentLikeState.likeCount,
        replies: enhancedReplies,
      }
    })
  }, [comments, commentLikeStore])

  const allImagesUploaded = useMemo(() => {
    if (uploadedImages.length === 0) return true
    return uploadedImages.every(img => img.uploaded && img.url)
  }, [uploadedImages])

  // ============================================================
  // Video Persistence
  // ============================================================

  const setupMediaPersistence = useCallback(() => {
    const url = item?.video_url
    if (!url) return
    if (videoPlayerRef.current) {
      restoreMediaState(videoPlayerRef.current, url)
      mediaHandlersRef.current.desktop = bindMediaListeners(videoPlayerRef.current, url)
    }
    if (mobileVideoPlayerRef.current) {
      restoreMediaState(mobileVideoPlayerRef.current, url)
      mediaHandlersRef.current.mobile = bindMediaListeners(mobileVideoPlayerRef.current, url)
    }
  }, [item?.video_url])

  const teardownMediaPersistence = useCallback(() => {
    if (videoPlayerRef.current) unbindMediaListeners(videoPlayerRef.current, mediaHandlersRef.current.desktop)
    if (mobileVideoPlayerRef.current) unbindMediaListeners(mobileVideoPlayerRef.current, mediaHandlersRef.current.mobile)
    mediaHandlersRef.current.desktop = null
    mediaHandlersRef.current.mobile = null
  }, [])

  // ============================================================
  // Fetch Functions
  // ============================================================

  const fetchComments = useCallback(async () => {
    try {
      const result = await commentStore.fetchComments(item.id, {
        page: 1,
        limit: 5,
        sort: commentSortOrder,
      })
      if (result && result.length > 0) {
        commentLikeStore.initCommentsLikeStates(result)
      }
    } catch (error) {
      console.error(`获取笔记[${item.id}]评论失败:`, error)
      if (error instanceof Error && !error.message.includes('401') && !error.message.includes('未授权')) {
        showMessage('获取评论失败，请稍后重试', 'error')
      }
    }
  }, [item.id, commentSortOrder, commentStore, commentLikeStore, showMessage])

  const loadMoreComments = useCallback(async () => {
    if (!isLoggedIn) {
      authStore.openLoginModal()
      return
    }
    if (!hasMoreCommentsToShow || isLoadingMore) return

    setIsLoadingMore(true)

    const scrollContainer = isMobile && contentSectionRef.current
      ? contentSectionRef.current
      : scrollableContentRef.current
    if (scrollContainer) {
      lastScrollTopRef.current = scrollContainer.scrollTop
    }

    try {
      const cd = commentStore.getComments(item.id)
      const nextPage = (cd.currentPage || 0) + 1
      await commentStore.fetchComments(item.id, {
        page: nextPage,
        limit: 5,
        loadMore: true,
        silentLoad: true,
        sort: commentSortOrder,
      })

      // Restore scroll position after DOM update
      requestAnimationFrame(() => {
        const sc = isMobile && contentSectionRef.current
          ? contentSectionRef.current
          : scrollableContentRef.current
        if (sc) {
          sc.scrollTop = lastScrollTopRef.current
        }
      })
    } catch (error) {
      console.error('加载更多评论失败:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoggedIn, isMobile, hasMoreCommentsToShow, isLoadingMore, commentSortOrder, item.id, commentStore, authStore])

  const fetchPostDetail = useCallback(async () => {
    try {
      const postDetail = await getPostDetail(item.id)
      if (postDetail) {
        Object.assign(item, postDetail)
        likeStore.initPostLikeState(
          postDetail.id,
          postDetail.liked || false,
          postDetail.likeCount || postDetail.like_count || 0
        )
        collectStore.initPostCollectState(
          postDetail.id,
          postDetail.collected || false,
          postDetail.collectCount || postDetail.collect_count || 0
        )
        const authorId = postDetail.user_id || postDetail.author_account
        if (authorId && isLoggedIn) {
          try {
            const followResponse = await followStore.fetchFollowStatus(authorId as string)
            if (followResponse.success) {
              followStore.initUserFollowState(
                authorId as string,
                followResponse.data!.followed,
                followResponse.data!.isMutual,
                followResponse.data!.buttonType
              )
            }
          } catch (error) {
            console.error('获取作者关注状态失败:', error)
          }
        }
      }
    } catch (error) {
      console.error(`获取笔记${item.id}详情失败:`, error)
      likeStore.initPostLikeState(
        item.id,
        item.liked || false,
        item.likeCount || item.like_count || 0
      )
      collectStore.initPostCollectState(
        item.id,
        item.collected || false,
        item.collectCount || item.collect_count || 0
      )
    }
  }, [item, isLoggedIn, likeStore, collectStore, followStore])

  // ============================================================
  // Comment Scroll / Locate
  // ============================================================

  const locateNewComment = useCallback(async (commentId: number, replyingToInfo: ReplyingTo | null) => {
    if (!commentId) return
    try {
      if (replyingToInfo && replyingToInfo.commentId) {
        let topLevelParentId: number | null = null
        const directParent = comments.find(c => c.id === replyingToInfo.commentId)
        if (directParent) {
          topLevelParentId = replyingToInfo.commentId
        } else {
          for (const comment of comments) {
            if (comment.replies && comment.replies.some(reply => reply.id === replyingToInfo.id)) {
              topLevelParentId = comment.id
              break
            }
          }
        }
        if (topLevelParentId) {
          setExpandedReplies(prev => new Set(prev).add(topLevelParentId!))
        }
      }

      // Wait for render
      await new Promise(resolve => setTimeout(resolve, 100))

      const targetId = String(commentId)
      const commentElement = document.querySelector(`[data-comment-id="${targetId}"]`)
      if (commentElement) {
        commentElement.classList.add('comment-highlight')
        commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => {
          commentElement.classList.remove('comment-highlight')
        }, 3000)
      }
    } catch (error) {
      console.error('定位新评论失败:', error)
    }
  }, [comments])

  const locateTargetComment = useCallback(async () => {
    if (!targetCommentId) return

    const localIsMobile = window.innerWidth <= 768
    if (localIsMobile) lock()

    try {
      const findCommentInCurrent = () => {
        const searchComments = (commentList: CommentUser[], parentCommentId: number | null = null): CommentUser | null => {
          for (const comment of commentList) {
            if (comment.id == Number(targetCommentId)) {
              if (parentCommentId && comment.replies && comment.replies.length > 2) {
                setExpandedReplies(prev => new Set(prev).add(parentCommentId!))
              }
              return comment
            }
            if (comment.replies && comment.replies.length > 0) {
              const foundInReplies = searchComments(comment.replies, comment.id)
              if (foundInReplies) {
                if (comment.replies.length > 2) {
                  setExpandedReplies(prev => new Set(prev).add(comment.id))
                }
                return foundInReplies
              }
            }
          }
          return null
        }
        return searchComments(comments as CommentUser[])
      }

      let targetComment = findCommentInCurrent()

      if (!targetComment && hasMoreCommentsToShow) {
        let maxAttempts = 10
        let attempts = 0
        while (!targetComment && hasMoreCommentsToShow && attempts < maxAttempts) {
          await loadMoreComments()
          await new Promise(resolve => setTimeout(resolve, 100))
          targetComment = findCommentInCurrent()
          attempts++
        }
      }

      if (targetComment) {
        await new Promise(resolve => setTimeout(resolve, 100))
        const targetId = String(targetCommentId)
        const commentElement = document.querySelector(`[data-comment-id="${targetId}"]`)
        if (commentElement) {
          commentElement.classList.add('comment-highlight')
          commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          setTimeout(() => {
            commentElement.classList.remove('comment-highlight')
          }, 3000)
        }
      }
    } finally {
      if (localIsMobile) {
        setTimeout(() => unlock(), 1000)
      }
    }
  }, [targetCommentId, comments, hasMoreCommentsToShow, loadMoreComments, lock, unlock])

  // ============================================================
  // Handlers - Modal
  // ============================================================

  const closeModal = useCallback(() => {
    if (isClosing) return
    setIsClosing(true)
    setShowContent(false)
  }, [isClosing])

  const handleAnimationEnd = useCallback((event: React.AnimationEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && event.target.classList.contains('detail-card')) {
      if (isClosing) {
        unlock()
        onClose()
      } else {
        setIsAnimating(false)
        setShowContent(true)
      }
    }
  }, [isClosing, unlock, onClose])

  const handleDetailCardClick = useCallback((event: React.MouseEvent) => {
    if (showSortMenu && !(event.target as Element).closest('.comments-header') && !(event.target as Element).closest('.sort-menu')) {
      setShowSortMenu(false)
    }
  }, [showSortMenu])

  // Click outside (on overlay) to close
  const overlayRef = useRef<HTMLDivElement>(null)
  useClickOutside(cardRef, pageMode ? () => {} : closeModal)
  useEscapeKey(pageMode ? () => {} : closeModal, !pageMode)

  // ============================================================
  // Handlers - Video
  // ============================================================

  const handleVideoLoad = useCallback((event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget
    const aspectRatio = video.videoWidth / video.videoHeight

    if (window.innerWidth > 768) {
      const minWidth = 300
      const maxWidth = pageMode ? 500 : 750
      const containerHeight = Math.min(window.innerHeight * 0.9, 1020)
      const idealWidth = containerHeight * aspectRatio
      let optimalWidth = Math.max(minWidth, Math.min(maxWidth, idealWidth))
      if (aspectRatio <= 0.6) optimalWidth = Math.min(optimalWidth, 500)
      else if (aspectRatio <= 0.8) optimalWidth = Math.min(optimalWidth, 600)
      else if (aspectRatio >= 2.0) optimalWidth = Math.max(optimalWidth, 600)
      else if (aspectRatio >= 1.5) optimalWidth = Math.max(optimalWidth, 550)
      setImageSectionWidth(optimalWidth)
    }

    setIsVideoLoaded(true)
    setTimeout(() => {
      autoPlayVideo()
    }, 100)
  }, [pageMode])

  const autoPlayVideo = useCallback(() => {
    try {
      const currentPlayer = isMobile ? mobileVideoPlayerRef.current : videoPlayerRef.current
      if (currentPlayer) {
        const playPromise = currentPlayer.play()
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log('视频自动播放失败，需要用户交互:', error.message)
          })
        }
      }
    } catch (error: any) {
      console.log('视频自动播放异常:', error.message)
    }
  }, [isMobile])

  // ============================================================
  // Handlers - Follow
  // ============================================================

  const handleFollow = useCallback((userId: number) => {
    onFollow?.(userId)
  }, [onFollow])

  const handleUnfollow = useCallback((userId: number) => {
    onUnfollow?.(userId)
  }, [onUnfollow])

  // ============================================================
  // Handlers - Like / Collect
  // ============================================================

  const toggleLike = useCallback(async (willBeLiked: boolean) => {
    if (!isLoggedIn) {
      authStore.openLoginModal()
      return
    }
    try {
      const currentState = likeStore.getPostLikeState(item.id)
      const result = await likeStore.togglePostLike(
        item.id,
        currentState.liked,
        currentState.likeCount
      )
      if (result.success) {
        showMessage(result.liked ? '点赞成功' : '取消点赞成功', 'success')
        onLike?.({ postId: item.id, liked: result.liked! })
      } else {
        showMessage('操作失败，请重试', 'error')
      }
    } catch (error) {
      console.error('点赞操作失败:', error)
      showMessage('操作失败，请重试', 'error')
    }
  }, [isLoggedIn, item.id, likeStore, authStore, onLike, showMessage])

  const toggleCommentLike = useCallback(async (comment: CommentUser, willBeLiked: boolean) => {
    if (!isLoggedIn) {
      authStore.openLoginModal()
      return
    }
    try {
      const currentState = commentLikeStore.getCommentLikeState(comment.id)
      const result = await commentLikeStore.toggleCommentLike(
        comment.id,
        currentState.liked,
        currentState.likeCount
      )
      if (result.success) {
        showMessage(result.liked ? '点赞成功' : '取消点赞成功', 'success')
      } else {
        showMessage('操作失败，请重试', 'error')
      }
    } catch (error) {
      console.error('评论点赞操作失败:', error)
      showMessage('操作失败，请重试', 'error')
    }
  }, [isLoggedIn, commentLikeStore, authStore, showMessage])

  const toggleCollect = useCallback(async () => {
    if (!isLoggedIn) {
      authStore.openLoginModal()
      return
    }
    try {
      const currentState = collectStore.getPostCollectState(item.id)
      const result = await collectStore.togglePostCollect(
        item.id,
        currentState.collected,
        currentState.collectCount
      )
      if (result.success) {
        showMessage(result.collected ? '收藏成功' : '取消收藏成功', 'success')
        onCollect?.({ postId: item.id, collected: result.collected! })
      } else {
        showMessage('操作失败，请重试', 'error')
      }
    } catch (error) {
      console.error('收藏操作失败:', error)
      showMessage('操作失败，请重试', 'error')
    }
  }, [isLoggedIn, item.id, collectStore, authStore, onCollect, showMessage])

  // ============================================================
  // Handlers - Share
  // ============================================================

  const handleShare = useCallback(async () => {
    try {
      const shareUrl = `【${item.title}-${item.author}| 知舟 - 你的校园图文部落】${window.location.origin}/post?id=${item.id}`
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = shareUrl
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      showMessage('复制成功，快去分享给好友吧', 'success')
      setIsShared(true)
    } catch (error) {
      console.error('复制失败:', error)
      showMessage('复制失败，请重试', 'error')
    }
  }, [item, showMessage])

  const handleShareMouseLeave = useCallback(() => {
    setIsShared(false)
  }, [])

  // ============================================================
  // Handlers - Tag
  // ============================================================

  const handleTagClick = useCallback((tag: string) => {
    const searchUrl = `${window.location.origin}/search_result/all?tag=${encodeURIComponent(tag)}`
    window.open(searchUrl, '_blank')
  }, [])

  // ============================================================
  // Handlers - Image Navigation
  // ============================================================

  const prevImage = useCallback(() => {
    if (currentImageIndex > 0) setCurrentImageIndex(prev => prev - 1)
  }, [currentImageIndex])

  const nextImage = useCallback(() => {
    if (currentImageIndex < imageList.length - 1) setCurrentImageIndex(prev => prev + 1)
  }, [currentImageIndex, imageList.length])

  const goToImage = useCallback((index: number) => {
    if (index >= 0 && index < imageList.length) setCurrentImageIndex(index)
  }, [imageList.length])

  const handleImageLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>, index: number) => {
    if (index === 0) {
      const img = event.currentTarget
      const aspectRatio = img.naturalWidth / img.naturalHeight
      const minWidth = 300
      const maxWidth = pageMode ? 500 : 750
      const containerHeight = Math.min(window.innerHeight * 0.9, 1020)
      const idealWidth = containerHeight * aspectRatio
      let optimalWidth = Math.max(minWidth, Math.min(maxWidth, idealWidth))
      if (aspectRatio <= 0.6) optimalWidth = Math.min(optimalWidth, 500)
      else if (aspectRatio <= 0.8) optimalWidth = Math.min(optimalWidth, 600)
      else if (aspectRatio >= 2.0) optimalWidth = Math.max(optimalWidth, 600)
      else if (aspectRatio >= 1.5) optimalWidth = Math.max(optimalWidth, 550)
      setImageSectionWidth(optimalWidth)
    }

    // Mobile-specific image sizing
    if (window.innerWidth <= 768) {
      if (index === 0) {
        const img = event.currentTarget
        const container = (event.target as HTMLElement).closest('.mobile-image-container') as HTMLElement
        if (container) {
          const maxHeight = 565
          const minHeight = 200
          const containerWidth = window.innerWidth
          const calculatedHeight = containerWidth * (img.naturalHeight / img.naturalWidth)
          let finalHeight = calculatedHeight
          if (calculatedHeight > maxHeight) finalHeight = maxHeight
          else if (calculatedHeight < minHeight) finalHeight = minHeight

          container.style.width = '100vw'
          container.style.height = finalHeight + 'px'
          container.style.minHeight = 'unset'
          container.style.margin = '0 0 16px 0'
          container.style.maxWidth = 'none'
          container.style.left = '0'
          container.style.position = 'relative'

          const allImages = container.querySelectorAll<HTMLElement>('.mobile-slider-image')
          allImages.forEach(image => {
            image.style.objectFit = 'contain'
          })
        }
      } else {
        const container = (event.target as HTMLElement).closest('.mobile-image-container') as HTMLElement
        if (container) {
          const firstImage = container.querySelector<HTMLElement>('.mobile-slider-image')
          if (firstImage && firstImage.style.objectFit) {
            (event.currentTarget as HTMLElement).style.objectFit = firstImage.style.objectFit
          }
        }
      }
    }

    // Preload next image
    if (index === currentImageIndex && imageList.length > 1) {
      const nextIndex = index + 1
      if (nextIndex < imageList.length && imageList[nextIndex]) {
        preloadImage(imageList[nextIndex])
      }
    }
  }, [currentImageIndex, imageList, pageMode, preloadImage])

  // ============================================================
  // Image Viewer
  // ============================================================

  const openImageViewer = useCallback(() => {
    setShowImageViewer(true)
  }, [])

  const closeImageViewer = useCallback(() => {
    setShowImageViewer(false)
  }, [])

  const handleImageIndexChange = useCallback((index: number) => {
    setCurrentImageIndex(index)
  }, [])

  const handleCommentImageClick = useCallback(({ images, index }: { images: string[]; index: number }) => {
    setCommentImages(images)
    setCurrentCommentImageIndex(index)
    setShowCommentImageViewer(true)
  }, [])

  const closeCommentImageViewer = useCallback(() => {
    setShowCommentImageViewer(false)
    setCommentImages([])
    setCurrentCommentImageIndex(0)
  }, [])

  const handleCommentImageIndexChange = useCallback((index: number) => {
    setCurrentCommentImageIndex(index)
  }, [])

  // ============================================================
  // Handlers - User Click
  // ============================================================

  const onUserClick = useCallback((userId: number | string) => {
    if (userId) {
      const userUrl = `${window.location.origin}/user/${userId}`
      window.open(userUrl, '_blank')
    }
  }, [])

  // ============================================================
  // Handlers - Comments
  // ============================================================

  const isCurrentUserComment = useCallback((comment: CommentUser) => {
    if (!isLoggedIn) return false
    let currentUser = userStore.userInfo
    if (!currentUser) {
      const savedUserInfo = localStorage.getItem('userInfo')
      if (savedUserInfo) {
        try {
          currentUser = JSON.parse(savedUserInfo)
        } catch (error) {
          return false
        }
      } else {
        return false
      }
    }
    return String(comment.user_auto_id) === String(currentUser?.id)
  }, [isLoggedIn, userStore.userInfo])

  const isPostAuthorComment = useCallback((comment: CommentUser) => {
    if (!comment || !item) return false
    const postAuthorId = item.author_auto_id
    const commentUserId = comment.user_auto_id
    return !!(postAuthorId && commentUserId && String(postAuthorId) === String(commentUserId))
  }, [item])

  const handleDeleteComment = useCallback(async (comment: CommentUser) => {
    if (!isCurrentUserComment(comment)) {
      showMessage('只能删除自己发布的评论', 'error')
      return
    }
    try {
      const response = await commentApi.deleteComment(comment.id)
      const currentComments = commentStore.getComments(item.id)
      if (currentComments && currentComments.comments) {
        const updatedComments = currentComments.comments.filter(c => c.id !== comment.id)
        const deletedCount = (response as any)?.data?.deletedCount || 1
        commentStore.updateComments(item.id, {
          comments: updatedComments,
          total: currentComments.total - deletedCount,
        })
      }
      showMessage('评论已删除', 'success')
    } catch (error) {
      console.error('删除评论失败:', error)
      showMessage('删除评论失败，请重试', 'error')
    }
  }, [isCurrentUserComment, item.id, commentStore, showMessage])

  const handleDeleteReply = useCallback(async (reply: CommentUser, commentId: number) => {
    if (!isCurrentUserComment(reply)) {
      showMessage('只能删除自己发布的回复', 'error')
      return
    }
    try {
      const response = await commentApi.deleteComment(reply.id)
      const currentComments = commentStore.getComments(item.id)
      if (currentComments && currentComments.comments) {
        const deletedCount = (response as any)?.data?.deletedCount || 1
        const newComments = currentComments.comments.map(c => {
          if (c.id === commentId) {
            return {
              ...c,
              replies: c.replies.filter(r => r.id !== reply.id),
              reply_count: (c.reply_count || 0) - deletedCount,
            }
          }
          return c
        })
        commentStore.updateComments(item.id, {
          comments: newComments,
          total: currentComments.total - deletedCount,
        })
        showMessage('回复已删除', 'success')
      }
    } catch (error) {
      console.error('删除回复失败:', error)
      showMessage('删除回复失败，请重试', 'error')
    }
  }, [isCurrentUserComment, item.id, commentStore, showMessage])

  const handleReplyComment = useCallback((target: CommentUser, parentId: number | null = null) => {
    setReplyingTo({
      ...target,
      commentId: parentId ?? target.id,
    })
    setIsInputFocused(true)
    setTimeout(() => {
      if (focusedInputRef.current) {
        focusedInputRef.current.focus()
      }
    }, 100)
  }, [])

  const toggleRepliesExpanded = useCallback((commentId: number) => {
    setExpandedReplies(prev => {
      const next = new Set(prev)
      if (next.has(commentId)) next.delete(commentId)
      else next.add(commentId)
      return next
    })
  }, [])

  const isRepliesExpanded = useCallback((commentId: number) => {
    return expandedReplies.has(commentId)
  }, [expandedReplies])

  const getDisplayedReplies = useCallback((replies: CommentUser[], commentId: number) => {
    if (!replies || replies.length === 0) return []
    if (replies.length <= 2) return replies
    return isRepliesExpanded(commentId) ? replies : replies.slice(0, 2)
  }, [isRepliesExpanded])

  const getHiddenRepliesCount = useCallback((replies: CommentUser[], commentId: number) => {
    if (!replies || replies.length <= 2) return 0
    return isRepliesExpanded(commentId) ? 0 : replies.length - 2
  }, [isRepliesExpanded])

  // ============================================================
  // Comment Sort
  // ============================================================

  const toggleSortMenu = useCallback(() => {
    setShowSortMenu(prev => !prev)
  }, [])

  const setCommentSort = useCallback(async (order: 'asc' | 'desc') => {
    if (!isLoggedIn) {
      authStore.openLoginModal()
      setShowSortMenu(false)
      return
    }
    setCommentSortOrder(order)
    setShowSortMenu(false)

    try {
      const result = await commentStore.fetchComments(item.id, {
        page: 1,
        limit: 5,
        sort: order,
        loadMore: false,
      })
      if (result && result.length > 0) {
        commentLikeStore.initCommentsLikeStates(result)
      }
    } catch (error) {
      console.error('重新排序评论失败:', error)
      showMessage('排序失败，请重试', 'error')
    }
  }, [isLoggedIn, item.id, commentStore, commentLikeStore, authStore, showMessage])

  // ============================================================
  // Handlers - Input
  // ============================================================

  const handleInputFocus = useCallback(() => {
    if (!isLoggedIn) {
      authStore.openLoginModal()
      return
    }
    setIsInputFocused(true)
    // On mobile, scroll so the expanding footer stays in viewport
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        const fa = document.querySelector('.footer-actions')
        if (fa) fa.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }, 350) // wait for CSS transition to start
    }
  }, [isLoggedIn, authStore])

  const handleCommentButtonClick = useCallback(() => {
    if (focusedInputRef.current) {
      focusedInputRef.current.focus()
    }
  }, [])

  const handleCancelInput = useCallback(() => {
    setCommentInput('')
    setReplyingTo(null)
    setUploadedImages([])
    setIsInputFocused(false)
    setShowEmojiPanel(false)
    setShowMentionPanel(false)
    setShowImageUpload(false)
    // Clear DOM content + blur
    if (focusedInputRef.current) {
      focusedInputRef.current.innerHTML = ''
      focusedInputRef.current.blur()
    }
  }, [])

  const handleSendComment = useCallback(async () => {
    if (!isLoggedIn) {
      showMessage('请先登录', 'error')
      return
    }

    const rawContent = commentInput || ''
    const textContent = rawContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
    if (!textContent && uploadedImages.length === 0) {
      showMessage('请输入评论内容或上传图片', 'error')
      return
    }

    if (uploadedImages.length > 0 && !allImagesUploaded) {
      showMessage('图片上传中，请稍候', 'error')
      return
    }

    setIsInputFocused(false)

    const savedInput = commentInput
    const savedReplyingTo = replyingTo
    const savedUploadedImages = [...uploadedImages]

    setCommentInput('')
    setReplyingTo(null)
    setUploadedImages([])
    setShowEmojiPanel(false)
    setShowMentionPanel(false)
    setShowImageUpload(false)
    if (focusedInputRef.current) {
      focusedInputRef.current.innerHTML = ''
    }

    try {
      const imageUrls = savedUploadedImages
        .filter(img => img.uploaded && img.url)
        .map(img => img.url!)

      let finalContent = savedInput.trim()
      if (imageUrls.length > 0) {
        const imageHtml = imageUrls.map(url => `<img src="${url}" alt="评论图片" class="comment-image" />`).join('')
        finalContent = finalContent ? `${finalContent}${imageHtml}` : imageHtml
      }

      const commentPayload = {
        post_id: item.id,
        content: finalContent,
        parent_id: savedReplyingTo ? savedReplyingTo.commentId : undefined,
      }

      const response = await commentApi.createComment(commentPayload)

      if ((response as any).success) {
        showMessage(savedReplyingTo ? '回复成功' : '评论成功', 'success')
        const responseData = (response as any).data

        savedUploadedImages.forEach(img => {
          if (img.url && img.url.startsWith('blob:')) URL.revokeObjectURL(img.url)
        })

        if (responseData?.id) {
          const newComment: CommentUser = {
            id: responseData.id,
            user_id: responseData.user_display_id || responseData.user_id,
            user_auto_id: responseData.user_auto_id || responseData.user_id,
            username: responseData.nickname || '匿名用户',
            avatar: responseData.user_avatar || '/avatar.png',
            verified: responseData.verified || 0,
            content: responseData.content,
            time: formatTime(responseData.created_at) || '刚刚',
            location: responseData.user_location || responseData.location || '',
            likeCount: responseData.like_count || 0,
            isLiked: responseData.liked || false,
            parent_id: responseData.parent_id,
            replies: [],
            reply_count: responseData.reply_count || 0,
            isReply: !!savedReplyingTo,
            replyTo: savedReplyingTo?.username,
          }

          if (savedReplyingTo) {
            const currentComments = commentStore.getComments(item.id)
            const parentCommentId = savedReplyingTo.commentId
            const newComments = currentComments.comments.map(c => {
              if (c.id === parentCommentId) {
                return {
                  ...c,
                  replies: [...c.replies, newComment],
                  reply_count: (c.reply_count || 0) + 1,
                }
              }
              return c
            })
            commentStore.updateComments(item.id, {
              comments: newComments,
              total: (currentComments.total || 0) + 1,
            })
          } else {
            commentStore.addComment(item.id, newComment)
          }

          setTimeout(async () => {
            await locateNewComment(newComment.id, savedReplyingTo)
          }, 100)
        } else {
          await fetchComments()
        }
      } else {
        savedUploadedImages.forEach(img => {
          if (img.url && img.url.startsWith('blob:')) URL.revokeObjectURL(img.url)
        })
        setCommentInput(savedInput)
        setReplyingTo(savedReplyingTo)
        setUploadedImages(savedUploadedImages)
        setIsInputFocused(true)
        showMessage((response as any).message || '发送失败，请重试', 'error')
      }
    } catch (error) {
      console.error('发送评论失败:', error)
      savedUploadedImages.forEach(img => {
        if (img.url && img.url.startsWith('blob:')) URL.revokeObjectURL(img.url)
      })
      setCommentInput(savedInput)
      setReplyingTo(savedReplyingTo)
      setUploadedImages(savedUploadedImages)
      setIsInputFocused(true)
      showMessage('发送失败，请重试', 'error')
    }
  }, [isLoggedIn, commentInput, uploadedImages, allImagesUploaded, item.id, replyingTo, commentStore, locateNewComment, fetchComments, showMessage])

  // ============================================================
  // Handlers - Emoji / Mention
  // ============================================================

  const toggleEmojiPanel = useCallback(() => {
    setShowEmojiPanel(prev => !prev)
  }, [])

  const closeEmojiPanel = useCallback(() => {
    setShowEmojiPanel(false)
  }, [])

  const handleEmojiSelect = useCallback((emoji: { i: string }) => {
    const emojiChar = emoji.i
    setCommentInput(prev => prev + emojiChar)
    closeEmojiPanel()
    // Focus the editor after inserting emoji
    setTimeout(() => {
      const editor = document.querySelector('.comment-input[contenteditable]') as HTMLDivElement
      if (editor) editor.focus()
    }, 50)
  }, [closeEmojiPanel])

  const handleMentionSelect = useCallback((friend: { nickname: string; id: number | string; user_id?: string }) => {
    // Insert mention HTML at @ position
    const mentionHtml = `@${friend.nickname} `
    setCommentInput(prev => {
      // Replace trailing @query with mention
      const atIndex = prev.lastIndexOf('@')
      if (atIndex >= 0) {
        return prev.slice(0, atIndex) + mentionHtml
      }
      return prev + mentionHtml
    })
    setShowMentionPanel(false)
    setMentionQuery('')
    // Focus the editor
    setTimeout(() => {
      const editor = document.querySelector('.comment-input[contenteditable]') as HTMLDivElement
      if (editor) editor.focus()
    }, 50)
  }, [])

  const handleMentionInput = useCallback((query: string) => {
    setMentionQuery(query)
    if (!showMentionPanel) setShowMentionPanel(true)
  }, [showMentionPanel])

  const toggleMentionPanel = useCallback(() => {
    if (!showMentionPanel) {
      setMentionQuery('')
    }
    setShowMentionPanel(prev => !prev)
  }, [showMentionPanel])

  const closeMentionPanel = useCallback(() => {
    setShowMentionPanel(false)
  }, [])

  // ============================================================
  // Handlers - Image Upload
  // ============================================================

  const toggleImageUpload = useCallback(() => {
    if (!isLoggedIn) {
      authStore.openLoginModal()
      return
    }
    setShowImageUpload(prev => !prev)
  }, [isLoggedIn, authStore])

  const closeImageUpload = useCallback(() => {
    setShowImageUpload(false)
  }, [])

  const handleImageUploadConfirm = useCallback(async (images: UploadedImage[]) => {
    setUploadedImages(images)
    setShowImageUpload(false)

    const newImages = images.filter(img => !img.uploaded)
    if (newImages.length > 0) {
      try {
        const files = newImages.map(img => img.file!)
        const uploadResult = await imageUploadApi.uploadImages(files)

        if ((uploadResult as any).success && (uploadResult as any).data?.uploaded) {
          let uploadIndex = 0
          setUploadedImages(prev => prev.map((img) => {
            if (!img.uploaded && uploadIndex < (uploadResult as any).data.uploaded.length) {
              const updated = {
                ...img,
                uploaded: true,
                url: (uploadResult as any).data.uploaded[uploadIndex].url,
              }
              uploadIndex++
              return updated
            }
            return img
          }))
          showMessage('图片上传成功', 'success')
        } else {
          throw new Error('图片上传失败')
        }
      } catch (error) {
        console.error('图片上传失败:', error)
        showMessage('图片上传失败，请重试', 'error')
        setUploadedImages(prev => prev.filter(img => img.uploaded))
      }
    }
  }, [showMessage])

  const handleImageUploadChange = useCallback((images: UploadedImage[]) => {
    setUploadedImages(images)
  }, [])

  const handlePasteImage = useCallback(async (file: File) => {
    try {
      const validation = imageUploadApi.validateImageFile(file)
      if (!(validation as any).valid) {
        showMessage((validation as any).error, 'error')
        return
      }
      const preview = await imageUploadApi.createImagePreview(file)
      const newImage: UploadedImage = { file, preview, uploaded: false, url: null }
      setUploadedImages(prev => [...prev, newImage])
      showMessage('正在上传图片...', 'info')

      const uploadResult = await imageUploadApi.uploadImage(file)
      if ((uploadResult as any).success) {
        setUploadedImages(prev => prev.map((img, i) =>
          i === prev.length - 1 ? { ...img, uploaded: true, url: (uploadResult as any).data.url } : img
        ))
        showMessage('图片上传成功', 'success')
      } else {
        setUploadedImages(prev => prev.slice(0, -1))
        showMessage((uploadResult as any).message || '图片上传失败', 'error')
      }
    } catch (error) {
      console.error('处理粘贴图片失败:', error)
      if (uploadedImages.length > 0) {
        setUploadedImages(prev => prev.slice(0, -1))
      }
      showMessage('处理图片失败，请重试', 'error')
    }
  }, [showMessage, uploadedImages.length])

  const removeUploadedImage = useCallback((index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }, [])

  // ============================================================
  // Touch Handlers
  // ============================================================

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    isTouching.current = true
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchEndX.current = touchStartX.current
    touchEndY.current = touchStartY.current
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isTouching.current || e.touches.length !== 1) return
    const touchMoveX = e.touches[0].clientX
    const touchMoveY = e.touches[0].clientY
    const deltaX = Math.abs(touchMoveX - touchStartX.current)
    const deltaY = Math.abs(touchMoveY - touchStartY.current)
    const SWIPE_THRESHOLD = 10
    if (deltaX > deltaY && deltaX > SWIPE_THRESHOLD) {
      e.preventDefault()
      e.stopPropagation()
    }
    touchEndX.current = touchMoveX
    touchEndY.current = touchMoveY
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isTouching.current) return
    if (e.changedTouches.length > 0) {
      touchEndX.current = e.changedTouches[0].clientX
      touchEndY.current = e.changedTouches[0].clientY
    }
    const deltaX = touchEndX.current - touchStartX.current
    const deltaY = touchEndY.current - touchStartY.current
    const MIN_SWIPE_DISTANCE = 50
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > MIN_SWIPE_DISTANCE) {
      e.preventDefault()
      e.stopPropagation()
      if (deltaX > 0) prevImage()
      else nextImage()
    }
    isTouching.current = false
    setTimeout(() => {
      if (!isTouching.current) {
        touchStartX.current = 0
        touchStartY.current = 0
        touchEndX.current = 0
        touchEndY.current = 0
      }
    }, 100)
  }, [prevImage, nextImage])

  // ============================================================
  // Keyboard Handlers
  // ============================================================

  const handleKeydown = useCallback((event: KeyboardEvent) => {
    if (isInputFocused) return
    if (authStore.showAuthModal) return
    if (showImageViewer) return

    const activeElement = document.activeElement
    if (activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      (activeElement as HTMLElement).contentEditable === 'true'
    )) return

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        prevImage()
        break
      case 'ArrowRight':
        event.preventDefault()
        nextImage()
        break
      case 's':
      case 'S':
        event.preventDefault()
        toggleCollect()
        break
      case 'd':
      case 'D':
        event.preventDefault()
        toggleLike(!isLiked)
        break
    }
  }, [isInputFocused, authStore.showAuthModal, showImageViewer, prevImage, nextImage, toggleCollect, toggleLike, isLiked])

  // ============================================================
  // Adjust Mobile Padding (no-op in React, kept for compatibility)
  // ============================================================
  const adjustMobilePadding = useCallback(() => {
    return
  }, [])

  // ============================================================
  // Resize Handler
  // ============================================================

  const handleResize = useCallback(() => {
    setWindowWidth(window.innerWidth)
    adjustMobilePadding()
  }, [adjustMobilePadding])

  // ============================================================
  // Effects & Lifecycle
  // ============================================================

  // Initial mount: lock scroll, set animation timeout
  useEffect(() => {
    lock()

    const timer = setTimeout(() => {
      setIsAnimating(false)
    }, 400)

    return () => clearTimeout(timer)
  }, [lock])

  // Show content after animation delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!showContent) {
        setShowContent(true)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Window resize
  useEffect(() => {
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [handleResize])

  // Keyboard shortcuts
  useEffect(() => {
    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [handleKeydown])

  // Auto focus/blur effect when isInputFocused changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (focusedInputRef.current) {
        if (isInputFocused) {
          focusedInputRef.current.focus()
        } else {
          focusedInputRef.current.blur()
        }
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [isInputFocused])

  // Scroll to load more comments
  useEffect(() => {
    const scrollContainer = scrollableContentRef.current
    if (!scrollContainer) return

    const handleScroll = () => {
      if (isLoadingMore || !hasMoreCommentsToShow) return
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer
      if (scrollHeight - scrollTop <= clientHeight + 100) {
        if (!hasTriggeredBottom) {
          setHasTriggeredBottom(true)
          loadMoreComments()
        }
      } else {
        setHasTriggeredBottom(false)
      }
    }

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [isLoadingMore, hasMoreCommentsToShow, hasTriggeredBottom, loadMoreComments])

  // Fetch data on mount
  useEffect(() => {
    if (isLoggedIn && !userStore.userInfo) {
      userStore.initUserInfo()
    }

    if (!disableAutoFetch) {
      fetchPostDetail()
    }

    const existingComments = commentStore.getComments(item.id)
    const hasPreloadedComments = existingComments && existingComments.comments && existingComments.comments.length > 0
    if (!hasPreloadedComments) {
      fetchComments()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Locate target comment
  useEffect(() => {
    if (targetCommentId && showContent) {
      setTimeout(() => {
        locateTargetComment()
      }, 200)
    }
  }, [targetCommentId, showContent, locateTargetComment])

  // Auto-play video
  useEffect(() => {
    if (item.type === 2 && item.video_url && showContent) {
      setTimeout(() => {
        autoPlayVideo()
      }, 200)
    }
  }, [item.type, item.video_url, showContent, autoPlayVideo])

  // Preload next image when index changes
  useEffect(() => {
    if (imageList.length > 1) {
      const nextIndex = currentImageIndex + 1
      if (nextIndex < imageList.length && imageList[nextIndex]) {
        preloadImage(imageList[nextIndex])
      }
    }
  }, [currentImageIndex, imageList, preloadImage])

  // Reset image index on post change
  useEffect(() => {
    setCurrentImageIndex(0)
  }, [item.id])

  // Video persistence
  useEffect(() => {
    if (isVideoLoaded) {
      teardownMediaPersistence()
      setupMediaPersistence()
    }
  }, [isVideoLoaded, setupMediaPersistence, teardownMediaPersistence])

  useEffect(() => {
    teardownMediaPersistence()
    const timer = setTimeout(() => setupMediaPersistence(), 100)
    return () => {
      clearTimeout(timer)
      teardownMediaPersistence()
    }
  }, [item?.video_url]) // eslint-disable-line react-hooks/exhaustive-deps

  // Set default volume
  useEffect(() => {
    const url = item?.video_url || ''
    try {
      const { volumeKey } = getStorageKeys(url)
      const savedVolume = localStorage.getItem(volumeKey)
      if (savedVolume === null) {
        if (videoPlayerRef.current) videoPlayerRef.current.volume = 0.5
        if (mobileVideoPlayerRef.current) mobileVideoPlayerRef.current.volume = 0.5
      }
    } catch (_) {}
  }, [item?.video_url])

  // Sync comment count
  useEffect(() => {
    if (item.commentCount !== commentCount) {
      item.commentCount = commentCount
    }
  }, [commentCount, item]) // eslint-disable-line react-hooks/exhaustive-deps

  // Adjust padding when content shows
  useEffect(() => {
    if (showContent) {
      setTimeout(() => adjustMobilePadding(), 100)
    }
  }, [showContent, adjustMobilePadding])

  // Cleanup
  useEffect(() => {
    return () => {
      teardownMediaPersistence()
    }
  }, [teardownMediaPersistence])

  // ============================================================
  // Render Helpers
  // ============================================================

  const renderComment = useCallback((comment: CommentUser, isReply = false) => {
    const avatarSize = isReply ? 24 : 32
    const avatarClass = isReply ? 'reply-avatar' : 'comment-avatar'
    const containerClass = isReply ? 'reply-item' : 'comment-item'
    const verifiedSize = isReply ? 'mini' as const : 'small' as const

    const onLikeToggle = (willBeLiked: boolean) => toggleCommentLike(comment, willBeLiked)

    const isDeleted = !!(comment.deletedAt || comment.deleted_at)

    if (isDeleted) {
      return (
        <div key={comment.id} className={containerClass} data-comment-id={String(comment.id)}>
          <div className={isReply ? 'reply-avatar-container' : 'comment-avatar-container'}>
            <img src={comment.avatar || DEFAULT_AVATAR} alt={comment.username}
              className={avatarClass} onError={handleAvatarError} />
          </div>
          <div className={isReply ? 'reply-content' : 'comment-content'}>
            <div className={isReply ? 'reply-header' : 'comment-header'}>
              <span className={isReply ? 'reply-username' : 'comment-username'}>
                {comment.username}
              </span>
            </div>
            <div className="comment-text" style={{ color: 'var(--text-color-quaternary)', fontStyle: 'italic' }}>
              原评论已删除
            </div>
          </div>
          {!isReply && comment.replies && comment.replies.length > 0 && (
            <div className="comment-replies">
              {comment.replies.map((reply: CommentUser) => renderComment(reply, true))}
              {comment.reply_count && comment.reply_count > comment.replies.length && (
                <button className="load-more-replies-btn" onClick={() => loadMoreReplies(comment)}>
                  加载更多回复
                </button>
              )}
            </div>
          )}
        </div>
      )
    }

    return (
      <div
        key={comment.id}
        className={containerClass}
        data-comment-id={String(comment.id)}
      >
        <div className={isReply ? 'reply-avatar-container' : 'comment-avatar-container'}>
          <img
            src={comment.avatar || DEFAULT_AVATAR}
            alt={comment.username}
            className={`${avatarClass} clickable-avatar`}
            onClick={() => onUserClick(comment.user_id)}
            onError={handleAvatarError}
          />
          <VerifiedBadge
            verified={comment.verified || 0}
            size={verifiedSize}
            className={isReply ? 'reply-verified-badge' : 'comment-verified-badge'}
          />
        </div>
        <div className={isReply ? 'reply-content' : 'comment-content'}>
          <div className={isReply ? 'reply-header' : 'comment-header'}>
            <div className={isReply ? 'reply-user-info' : 'comment-user-info'}>
              <span
                className={isReply ? 'reply-username' : 'comment-username'}
                onClick={() => onUserClick(comment.user_id)}
              >
                {isCurrentUserComment(comment) ? '我' : comment.username}
              </span>
              {isPostAuthorComment(comment) && (
                <div className={`author-badge ${isReply ? 'author-badge--reply' : 'author-badge--parent'}`}>
                  作者
                </div>
              )}
            </div>
            {isCurrentUserComment(comment) && (
              <button
                className="comment-delete-btn"
                onClick={() => isReply
                  ? handleDeleteReply(comment, comment.parent_id!)
                  : handleDeleteComment(comment)
                }
              >
                删除
              </button>
            )}
          </div>
          <div className="comment-text">
            {isReply && comment.replyTo && (
              <>回复 <span className="reply-to">{comment.replyTo}</span>：</>
            )}
            <ContentRenderer
              content={comment.content}
              onImageClick={handleCommentImageClick}
            />
          </div>
          <span className="comment-time">{comment.time} {comment.location}</span>
          <div className={isReply ? 'reply-actions' : 'comment-actions'}>
            <div className="comment-like-container">
              <LikeButton
                isLiked={comment.isLiked}
                size="small"
                onClick={(willBeLiked) => onLikeToggle(willBeLiked)}
              />
              <span className="like-count">{comment.likeCount}</span>
            </div>
            <div className="comment-replay-container">
              <MessageCircle
                size={16}
                className="comment-replay-icon"
                onClick={() => handleReplyComment(comment, isReply ? comment.parent_id : null)}
              />
              <button
                className="comment-reply"
                onClick={() => handleReplyComment(comment, isReply ? comment.parent_id : null)}
              >
                回复
              </button>
            </div>
          </div>

          {!isReply && comment.replies && comment.replies.length > 0 && (
            <div className="replies-list">
              {getDisplayedReplies(comment.replies, comment.id).map(reply =>
                renderComment(reply, true)
              )}
              {comment.replies.length > 2 && (
                <div className="replies-toggle">
                  <button
                    className="toggle-replies-btn"
                    onClick={() => toggleRepliesExpanded(comment.id)}
                  >
                    {isRepliesExpanded(comment.id)
                      ? '收起回复'
                      : `展开 ${getHiddenRepliesCount(comment.replies, comment.id)} 条回复`
                    }
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }, [
    toggleCommentLike, onUserClick, handleAvatarError,
    isCurrentUserComment, isPostAuthorComment,
    handleDeleteComment, handleDeleteReply,
    handleCommentImageClick, handleReplyComment,
    getDisplayedReplies, toggleRepliesExpanded,
    isRepliesExpanded, getHiddenRepliesCount,
  ])

  // Don't render if no item
  if (!item) return null

  // Page mode wrapper
  const cardElement = (
    <div
      className={clsx(
        pageMode ? 'detail-card-page' : 'detail-card-overlay',
        { 'animating': isAnimating && !pageMode }
      )}
      ref={pageMode ? undefined : overlayRef}
    >
      <div
        ref={cardRef}
        className={clsx('detail-card', {
          'scale-in': isAnimating && !pageMode && !isMobile,
          'scale-out': isClosing && !pageMode && !isMobile,
          'slide-in': isAnimating && !pageMode && isMobile,
          'slide-out': isClosing && !pageMode && isMobile,
          'page-mode': pageMode,
        })}
        style={pageMode ? undefined : {
          width: cardWidth,
          ...(isClosing ? {} : animationStyle),
        } as React.CSSProperties}
        onClick={handleDetailCardClick}
        onAnimationEnd={handleAnimationEnd}
      >
        {/* Close Button */}
        {!pageMode && (
          <button
            className="close-btn"
            onClick={closeModal}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <X size={18} />
            {showTooltip && (
              <div className="tooltip">
                关闭 <span className="key-hint">Esc</span>
              </div>
            )}
          </button>
        )}

        <div className="detail-content">
          {/* Desktop: Image Section */}
          <div
            className="image-section"
            style={{ width: isMobile ? undefined : imageSectionWidth }}
            onMouseEnter={() => setShowImageControls(true)}
            onMouseLeave={() => setShowImageControls(false)}
          >
            {item.type === 2 ? (
              /* Video Player (Desktop) */
              <div className="video-container">
                {!isVideoLoaded && (
                  <div className="video-placeholder">
                    <img
                      src={item.cover_url || (item.images && item.images[0]) || ''}
                      alt={item.title || '视频封面'}
                      className="video-cover-placeholder"
                    />
                  </div>
                )}
                <video
                  ref={videoPlayerRef}
                  src={item.video_url}
                  poster={item.cover_url || (item.images && item.images[0])}
                  controls
                  preload="metadata"
                  playsInline
                  webkit-playsinline="true"
                  loop
                  className="video-player"
                  style={{ display: isVideoLoaded ? undefined : 'none' }}
                  onLoadedMetadata={handleVideoLoad}
                >
                  您的浏览器不支持视频播放
                </video>
              </div>
            ) : (
              /* Image Carousel (Desktop) */
              <div className="image-container">
                <div
                  className="image-slider"
                  style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
                >
                  {imageList.map((image, index) => (
                    <img
                      key={index}
                      src={showContent ? image : (index === 0 ? item.image : '')}
                      alt={item.title || '图片'}
                      style={{ objectFit: 'contain' }}
                      className="slider-image image-zoomable"
                      onClick={openImageViewer}
                      onLoad={(e) => handleImageLoad(e, index)}
                    />
                  ))}
                </div>
                {hasMultipleImages && showContent && (
                  <div className={clsx('image-controls', { 'visible': showImageControls })}>
                    <div className="nav-btn-container prev-btn-container" onClick={e => e.stopPropagation()}>
                      {currentImageIndex > 0 && (
                        <button className="nav-btn prev-btn" onClick={prevImage} disabled={currentImageIndex === 0}>
                          <ChevronLeft size={18} />
                        </button>
                      )}
                    </div>
                    <div className="nav-btn-container next-btn-container" onClick={e => e.stopPropagation()}>
                      {currentImageIndex < imageList.length - 1 && (
                        <button className="nav-btn next-btn" onClick={nextImage} disabled={currentImageIndex === imageList.length - 1}>
                          <ChevronRight size={18} />
                        </button>
                      )}
                    </div>
                    <div className="image-counter">
                      {currentImageIndex + 1}/{imageList.length}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Content Section */}
          <div
            ref={contentSectionRef}
            className="content-section"
            style={!isMobile ? { width: contentSectionWidth } : undefined}
          >
            {/* Author Section */}
            <div ref={authorWrapperRef} className="author-wrapper">
              <div className="author-info">
                <div className="author-avatar-container">
                  <img
                    src={authorData.avatar || DEFAULT_AVATAR}
                    alt={authorData.name}
                    className="author-avatar"
                    onClick={() => onUserClick(authorData.id as number)}
                    onError={handleAvatarError}
                  />
                  <VerifiedBadge
                    verified={authorData.verified}
                    size="medium"
                    className="author-verified-badge"
                  />
                </div>
                <div className="author-name-container">
                  <span
                    className="author-name"
                    onClick={() => onUserClick(authorData.id as number)}
                  >
                    {authorData.name}
                  </span>
                </div>
              </div>
              {!isCurrentUserPost && (
                <FollowButton
                  userId={Number(authorData.id)}
                  isFollowing={authorData.isFollowing}
                  onFollow={(uid) => handleFollow(uid)}
                  onUnfollow={(uid) => handleUnfollow(uid)}
                />
              )}
            </div>

            {/* Scrollable Content */}
            <div ref={scrollableContentRef} className="scrollable-content">
              {/* Mobile Video Player */}
              {item.type === 2 && (
                <div className="mobile-video-container">
                  {!isVideoLoaded && (
                    <div className="video-placeholder">
                      {(item.cover_url || (item.images && item.images[0])) ? (
                        <img
                          src={item.cover_url || item.images![0]}
                          alt={item.title || '视频封面'}
                          className="video-cover-placeholder"
                        />
                      ) : (
                        <div className="placeholder-content">
                          <Video size={48} />
                          <p>视频加载中...</p>
                        </div>
                      )}
                    </div>
                  )}
                  <video
                    ref={mobileVideoPlayerRef}
                    src={item.video_url}
                    poster={item.cover_url || (item.images && item.images[0])}
                    controls
                    preload="metadata"
                    playsInline
                    webkit-playsinline="true"
                    className="mobile-video-player"
                    style={{ display: isVideoLoaded ? undefined : 'none' }}
                    onLoadedMetadata={handleVideoLoad}
                  >
                    您的浏览器不支持视频播放
                  </video>
                </div>
              )}

              {/* Mobile Image Carousel */}
              {item.type !== 2 && imageList.length > 0 && (
                <div
                  className="mobile-image-container"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <div
                    className="mobile-image-slider"
                    style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
                  >
                    {imageList.map((image, index) => (
                      <img
                        key={index}
                        src={showContent ? image : (index === 0 ? item.image : '')}
                        alt={`图片 ${index + 1}`}
                        className="mobile-slider-image"
                        onClick={openImageViewer}
                        onLoad={(e) => handleImageLoad(e, index)}
                      />
                    ))}
                  </div>

                  {hasMultipleImages && (
                    <div className="mobile-image-controls">
                      <button className="mobile-nav-btn mobile-prev-btn" onClick={prevImage} disabled={currentImageIndex === 0}>
                        <ChevronLeft size={18} />
                      </button>
                      <button className="mobile-nav-btn mobile-next-btn" onClick={nextImage} disabled={currentImageIndex === imageList.length - 1}>
                        <ChevronRight size={18} />
                      </button>
                      <div className="mobile-image-counter">
                        {currentImageIndex + 1}/{imageList.length}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mobile Dots Indicator */}
              {imageList.length > 1 && (
                <div className="mobile-dots-indicator">
                  <div className="mobile-dots">
                    {imageList.map((_, index) => (
                      <span
                        key={index}
                        className={clsx('mobile-dot', { active: index === currentImageIndex })}
                        onClick={() => goToImage(index)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Post Content */}
              <div className="post-content">
                <h2 className="post-title">{postData.title}</h2>
                <div className="post-text">
                  <ContentRenderer
                    content={postData.content}
                    onImageClick={handleCommentImageClick}
                  />
                </div>
                <div className="post-tags">
                  {postData.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="tag clickable-tag"
                      onClick={() => handleTagClick(tag)}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="post-meta">
                  <span className="time">{postData.time}</span>
                  {postData.location && (
                    <span className="location">{postData.location}</span>
                  )}
                </div>
              </div>

              <div className="divider" />

              {/* Comments Section */}
              <div className="comments-section">
                {showContent && (
                  <div className="comments-header" onClick={toggleSortMenu}>
                    <span className="comments-title">共 {commentCount} 条评论</span>
                    <ChevronDown size={16} className="sort-icon" />
                    {showSortMenu && (
                      <div className="sort-menu" onClick={e => e.stopPropagation()}>
                        <div
                          className={clsx('sort-option', { active: commentSortOrder === 'desc' })}
                          onClick={() => setCommentSort('desc')}
                        >
                          <span>降序</span>
                          {commentSortOrder === 'desc' && <Check size={14} className="tick-icon" />}
                        </div>
                        <div
                          className={clsx('sort-option', { active: commentSortOrder === 'asc' })}
                          onClick={() => setCommentSort('asc')}
                        >
                          <span>升序</span>
                          {commentSortOrder === 'asc' && <Check size={14} className="tick-icon" />}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {loadingComments && showContent && (
                  <div className="comments-loading">
                    <div className="loading-spinner" />
                    <span>加载评论中...</span>
                  </div>
                )}

                {!loadingComments && showContent && (
                  <div className="comments-list">
                    {enhancedComments.length === 0 && commentCount === 0 && !hasMoreCommentsToShow && (
                      <div className="no-comments">
                        <span>暂无评论，快来抢沙发吧~</span>
                      </div>
                    )}

                    {enhancedComments.map(comment => renderComment(comment, false))}

                    {hasMoreCommentsToShow && (
                      <div className="load-more-comments">
                        <span>加载更多中...</span>
                      </div>
                    )}

                    {!hasMoreCommentsToShow && enhancedComments.length > 0 && (
                      <div className="no-more-comments">
                        <span>没有更多评论了</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="footer-actions">
              <div className={clsx('input-container', { 'expanded': isInputFocused })}>
                <div className="input-row">
                  <div className="input-wrapper">
                    {replyingTo && (
                      <div className="reply-status">
                        <div className="reply-status-content">
                          <div className="reply-first-line">
                            回复 <span className="reply-username">{replyingTo.username}</span>
                          </div>
                          <div className="reply-second-line">
                            <ContentRenderer content={replyingTo.content} />
                          </div>
                        </div>
                      </div>
                    )}
                    <ContentEditableInput
                      ref={focusedInputRef}
                      value={commentInput}
                      onChange={setCommentInput}
                      placeholder={replyingTo ? `回复 ${replyingTo.username}：` : '说点什么...'}
                      onMention={handleMentionInput}
                      onFocus={handleInputFocus}
                      inputClassName={isInputFocused ? 'comment-input focused-input' : 'comment-input'}
                      onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
                        if (e.key === 'Escape') {
                          e.preventDefault()
                          handleCancelInput()
                        }
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault()
                          handleSendComment()
                        }
                      }}
                    />
                  </div>

                  <div className="action-buttons">
                    <div className={clsx('action-btn', { active: isLiked })}>
                      <LikeButton
                        isLiked={isLiked}
                        size="medium"
                        onClick={(willBeLiked) => toggleLike(willBeLiked)}
                      />
                      <span>{likeCount}</span>
                    </div>
                    <button className={clsx('action-btn collect-btn', { active: isCollected })} onClick={toggleCollect}>
                      <Bookmark size={18} fill={isCollected ? 'currentColor' : 'none'} />
                      <span>{collectCount}</span>
                    </button>
                    <button className="action-btn comment-btn" onClick={handleCommentButtonClick}>
                      <MessageCircle size={18} />
                      <span>{commentCount}</span>
                    </button>
                    <button className="action-btn share-btn" onClick={handleShare} onMouseLeave={handleShareMouseLeave}>
                      {isShared ? <Check size={18} /> : <Share2 size={18} />}
                    </button>
                  </div>
                </div>

                {/* Uploaded Images Preview */}
                {uploadedImages.length > 0 && (
                  <div className="uploaded-images-section">
                    <div className="uploaded-images-grid">
                      {uploadedImages.map((image, index) => (
                        <div key={index} className="uploaded-image-item">
                          <img src={image.url || image.preview} alt={`上传图片${index + 1}`} className="uploaded-image" />
                          <button className="remove-image-btn" onClick={() => removeUploadedImage(index)}>
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="focused-actions-section">
                  <div className="emoji-section">
                    <button className="mention-btn" onClick={toggleMentionPanel}>
                      <AtSign size={18} className="mention-icon" />
                    </button>
                    <button className="emoji-btn" onClick={toggleEmojiPanel}>
                      <Smile size={18} className="emoji-icon" />
                    </button>
                    <button className="image-btn" onClick={toggleImageUpload}>
                      <ImageIcon size={18} className="image-icon" />
                    </button>
                  </div>
                  <div className="send-cancel-buttons">
                    <button
                      className="send-btn"
                      onClick={handleSendComment}
                      disabled={
                        (!commentInput || !commentInput.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()) &&
                        uploadedImages.length === 0 ||
                        !allImagesUploaded
                      }
                    >
                      {uploadedImages.length > 0 && !allImagesUploaded ? '上传中' : '发送'}
                    </button>
                    <button className="cancel-btn" onClick={handleCancelInput}>
                      取消
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emoji Panel */}
      {showEmojiPanel && (
        <div className="emoji-panel-overlay" onClick={closeEmojiPanel}>
          <div className="emoji-panel" onClick={e => e.stopPropagation()}>
            <EmojiPicker onSelect={handleEmojiSelect} />
          </div>
        </div>
      )}

      {/* Mention Modal */}
      {showMentionPanel && (
        <MentionModal
          query={mentionQuery}
          onClose={closeMentionPanel}
          onSelect={handleMentionSelect}
        />
      )}

      {/* Post Image Viewer */}
      <ImageViewer
        visible={showImageViewer}
        images={imageList}
        initialIndex={currentImageIndex}
        imageType="post"
        onClose={closeImageViewer}
        onChange={handleImageIndexChange}
      />

      {/* Comment Image Viewer */}
      <ImageViewer
        visible={showCommentImageViewer}
        images={commentImages}
        initialIndex={currentCommentImageIndex}
        imageType="comment"
        onClose={closeCommentImageViewer}
        onChange={handleCommentImageIndexChange}
      />
    </div>
  )

  if (pageMode) {
    return cardElement
  }

  return createPortal(cardElement, document.body)
})

DetailCard.displayName = 'DetailCard'

export { DetailCard }
export default DetailCard
