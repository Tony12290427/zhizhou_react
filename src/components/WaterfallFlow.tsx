import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react'
import { Play } from 'lucide-react'
import SkeletonList from '@/components/skeleton/SkeletonList'
import BaseSkeleton from '@/components/skeleton/BaseSkeleton'
import SimpleSpinner from '@/components/spinner/SimpleSpinner'
import LazyImage from '@/components/LazyImage'
import { LikeButton } from '@/components/LikeButton'
import { useUserStore } from '@/stores/user-store'
import { useLikeStore } from '@/stores/like-store'
import { useCollectStore } from '@/stores/collect-store'
import { useAuthStore } from '@/stores/auth-store'
import { getPostList } from '@/lib/api/posts'
import type { TransformedPost } from '@/types/post'

// ============================================================
// Constants
// ============================================================
const DEFAULT_AVATAR = '/avatar.png'
const DEFAULT_PLACEHOLDER = '/zhizhou-placeholder.jpg'
const PAGE_SIZE = 20

// ============================================================
// Props
// ============================================================
export interface WaterfallFlowProps {
  refreshKey?: number
  category?: string | number | null
  searchKeyword?: string
  searchTag?: string
  userId?: number | string | null
  type?: string | number | null
  preloadedPosts?: TransformedPost[]
  onCardClick?: (item: TransformedPost, position: { x: number; y: number }) => void
}

// ============================================================
// Helpers (pure, outside component)
// ============================================================

interface ColumnConfig {
  columns: number
  gap: number
  batchSize: number
}

function getColumnConfig(width: number): ColumnConfig {
  if (width >= 1420) return { columns: 5, gap: 16, batchSize: 15 }
  if (width >= 1200) return { columns: 4, gap: 16, batchSize: 12 }
  if (width >= 900) return { columns: 4, gap: 15, batchSize: 10 }
  if (width >= 600) return { columns: 3, gap: 12, batchSize: 8 }
  return { columns: 2, gap: 10, batchSize: 6 }
}

function estimateItemHeight(item: TransformedPost, windowWidth: number): number {
  const baseHeight = 200
  const bottomHeight = 50

  const titleLines = Math.ceil((item.title?.length || 0) / 20)
  const adjustedTitleHeight = Math.min(titleLines * 20, 40)

  let imageHeight = baseHeight
  if (item.aspectRatio) {
    const containerWidth =
      windowWidth >= 900
        ? (windowWidth - 60) / 4
        : (windowWidth - 30) / 2
    imageHeight = Math.min(containerWidth / item.aspectRatio, 400)
  }

  return imageHeight + adjustedTitleHeight + bottomHeight
}

function createEmptyColumns(count: number): TransformedPost[][] {
  return Array.from({ length: count }, () => [])
}

function createZeroHeights(count: number): number[] {
  return Array.from({ length: count }, () => 0)
}

function getShortestColumnIndex(heights: number[]): number {
  const minHeight = Math.min(...heights)
  return heights.indexOf(minHeight)
}

// ============================================================
// Component
// ============================================================

const WaterfallFlow: React.FC<WaterfallFlowProps> = ({
  refreshKey = 0,
  category = null,
  searchKeyword = '',
  searchTag = '',
  userId = null,
  type = null,
  preloadedPosts = [],
  onCardClick,
}) => {
  // ---- Stores ----
  const userStore = useUserStore()
  const likeStore = useLikeStore()
  const collectStore = useCollectStore()
  const authStore = useAuthStore()

  // ---- UI State ----
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [contentList, setContentList] = useState<TransformedPost[]>([])
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [columns, setColumns] = useState<TransformedPost[][]>([[], []])
  const [columnCount, setColumnCount] = useState(2)
  const [columnGap, setColumnGap] = useState(10)
  const [batchSize, setBatchSize] = useState(8)
  const [itemLoadingStates, setItemLoadingStates] = useState<
    Record<number, { imageLoaded: boolean; avatarLoaded: boolean }>
  >({})
  const [newItemAnimStates, setNewItemAnimStates] = useState<
    Record<number, { isNew: boolean; fadeIn: boolean }>
  >({})

  // ---- Mutable Refs ----
  const containerRef = useRef<HTMLDivElement>(null)
  const columnHeightsRef = useRef<number[]>([0, 0])
  const itemHeightsRef = useRef<Record<number, number>>({})
  const currentPageRef = useRef(1)
  const loadedItemCountRef = useRef(0)
  const columnsRef = useRef<TransformedPost[][]>([[], []])
  const contentListRef = useRef<TransformedPost[]>([])
  const hasMoreRef = useRef(true)
  const loadingMoreRef = useRef(false)
  const columnCountRef = useRef(2)
  const batchSizeRef = useRef(8)

  // Stable callback refs (to avoid closure staleness in event listeners)
  const handleScrollRef = useRef<() => void>(() => {})
  const handleResizeRef = useRef<() => void>(() => {})
  const loadMoreContentRef = useRef<() => Promise<void>>(async () => {})

  // Timer refs
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const imageMonitorTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ---- Keep refs in sync ----
  useEffect(() => {
    columnsRef.current = columns
  }, [columns])

  useEffect(() => {
    contentListRef.current = contentList
  }, [contentList])

  useEffect(() => {
    hasMoreRef.current = hasMore
  }, [hasMore])

  useEffect(() => {
    loadingMoreRef.current = loadingMore
  }, [loadingMore])

  useEffect(() => {
    columnCountRef.current = columnCount
  }, [columnCount])

  useEffect(() => {
    batchSizeRef.current = batchSize
  }, [batchSize])

  // ---- Height helpers ----
  const getOrEstimateItemHeight = useCallback((item: TransformedPost): number => {
    const cached = itemHeightsRef.current[item.id]
    if (cached !== undefined) return cached
    const estimated = estimateItemHeight(item, window.innerWidth)
    itemHeightsRef.current[item.id] = estimated
    return estimated
  }, [])

  // ---- Update height after image loads ----
  const updateItemHeight = useCallback((itemId: number) => {
    requestAnimationFrame(() => {
      const el = document.querySelector(
        `[data-item-id="${itemId}"]`,
      ) as HTMLElement | null
      if (!el) return

      const actualHeight = el.offsetHeight
      const estimatedHeight = itemHeightsRef.current[itemId] || 0
      const diff = actualHeight - estimatedHeight

      if (Math.abs(diff) < 10) return

      itemHeightsRef.current[itemId] = actualHeight

      const cols = columnsRef.current
      const heights = columnHeightsRef.current
      for (let i = 0; i < cols.length; i++) {
        if (cols[i].some((item) => item.id === itemId)) {
          heights[i] += diff
          break
        }
      }

      loadedItemCountRef.current++
    })
  }, [])

  // ---- Init content ----
  const initContent = useCallback(async () => {
    if (isInitialLoad) {
      setLoading(true)
    }

    currentPageRef.current = 1
    setHasMore(true)

    try {
      let content: TransformedPost[] = []

      if (preloadedPosts && preloadedPosts.length > 0) {
        content = preloadedPosts
        setHasMore(false)
      } else {
        const result = await getPostList({
          page: 1,
          limit: PAGE_SIZE,
          category: category as string | undefined,
          searchKeyword,
          searchTag,
          userId: userId as number | undefined,
          type: type as string | undefined,
        })
        content = result.posts || []
        setHasMore(result.hasMore !== false)
      }

      // New item animation states
      if (!isInitialLoad) {
        const newAnim: Record<number, { isNew: boolean; fadeIn: boolean }> = {}
        content.forEach((item) => {
          newAnim[item.id] = { isNew: true, fadeIn: false }
        })
        setNewItemAnimStates((prev) => ({ ...prev, ...newAnim }))
      }

      setContentList(content)

      // Init like/collect states in global stores
      likeStore.initPostsLikeStates(content)
      collectStore.initPostsCollectStates(content)

      // Init per-item loading states
      setItemLoadingStates((prev) => {
        const loadingStates: Record<
          number,
          { imageLoaded: boolean; avatarLoaded: boolean }
        > = {}
        content.forEach((item) => {
          loadingStates[item.id] = prev[item.id] || {
            imageLoaded: false,
            avatarLoaded: false,
          }
        })
        return loadingStates
      })

      if (isInitialLoad) {
        setNewItemAnimStates({})
      }

      // Compute column config and distribute
      const config = getColumnConfig(window.innerWidth)
      setColumnCount(config.columns)
      setColumnGap(config.gap)
      setBatchSize(config.batchSize)

      const cols = createEmptyColumns(config.columns)
      const heights = createZeroHeights(config.columns)

      content.forEach((item) => {
        const shortestIdx = getShortestColumnIndex(heights)
        cols[shortestIdx].push(item)
        const h = getOrEstimateItemHeight(item)
        heights[shortestIdx] += h
      })

      columnHeightsRef.current = heights
      setColumns(cols)

      // Trigger fade-in animation for new items
      if (!isInitialLoad) {
        setTimeout(() => {
          setNewItemAnimStates((prev) => {
            const updated = { ...prev }
            content.forEach((item) => {
              if (updated[item.id]) {
                updated[item.id] = { ...updated[item.id], fadeIn: true }
              }
            })
            return updated
          })
        }, 100)
      }
    } catch (error) {
      console.error('加载内容失败:', error)
    } finally {
      if (isInitialLoad) {
        setLoading(false)
        setIsInitialLoad(false)
      }
    }
  }, [
    isInitialLoad,
    preloadedPosts,
    category,
    searchKeyword,
    searchTag,
    userId,
    type,
    likeStore,
    collectStore,
    getOrEstimateItemHeight,
  ])

  // ---- Load more content ----
  const loadMoreContent = useCallback(async () => {
    if (preloadedPosts && preloadedPosts.length > 0) return
    if (loadingMoreRef.current || !hasMoreRef.current) return

    setLoadingMore(true)
    loadingMoreRef.current = true
    currentPageRef.current++

    try {
      const result = await getPostList({
        page: currentPageRef.current,
        limit: PAGE_SIZE,
        category: category as string | undefined,
        searchKeyword,
        searchTag,
        userId: userId as number | undefined,
        type: type as string | undefined,
      })

      const newContent = result.posts || []
      const moreAvailable = result.hasMore !== false
      setHasMore(moreAvailable)
      hasMoreRef.current = moreAvailable

      if (newContent.length === 0) {
        setHasMore(false)
        hasMoreRef.current = false
        return
      }

      setContentList((prev) => [...prev, ...newContent])

      // Init states for new content
      likeStore.initPostsLikeStates(newContent)
      collectStore.initPostsCollectStates(newContent)

      setItemLoadingStates((prev) => {
        const updated = { ...prev }
        newContent.forEach((item) => {
          updated[item.id] = { imageLoaded: false, avatarLoaded: false }
        })
        return updated
      })

      const newAnim: Record<number, { isNew: boolean; fadeIn: boolean }> = {}
      newContent.forEach((item) => {
        newAnim[item.id] = { isNew: true, fadeIn: false }
      })
      setNewItemAnimStates((prev) => ({ ...prev, ...newAnim }))

      // Distribute new items into existing columns
      setColumns((prevColumns) => {
        const cols = prevColumns.map((col) => [...col])
        const heights = [...columnHeightsRef.current]

        newContent.forEach((item, index) => {
          const shortestIdx = getShortestColumnIndex(heights)
          cols[shortestIdx].push(item)
          const h = getOrEstimateItemHeight(item)
          heights[shortestIdx] += h

          if (
            columnCountRef.current >= 4 &&
            index > 0 &&
            index % batchSizeRef.current === 0
          ) {
            // yield
          }
        })

        columnHeightsRef.current = heights
        return cols
      })

      // Trigger fade-in
      setTimeout(() => {
        setNewItemAnimStates((prev) => {
          const updated = { ...prev }
          newContent.forEach((item) => {
            if (updated[item.id]) {
              updated[item.id] = { ...updated[item.id], fadeIn: true }
            }
          })
          return updated
        })
      }, 100)
    } catch (error) {
      console.error('加载更多内容失败:', error)
      currentPageRef.current--
    } finally {
      setLoadingMore(false)
      loadingMoreRef.current = false
    }
  }, [
    preloadedPosts,
    category,
    searchKeyword,
    searchTag,
    userId,
    type,
    likeStore,
    collectStore,
    getOrEstimateItemHeight,
  ])

  // Keep loadMoreContent ref in sync so scroll handler always calls latest version
  useEffect(() => {
    loadMoreContentRef.current = loadMoreContent
  }, [loadMoreContent])

  // ---- Scroll handler ----
  const handleScroll = useCallback(() => {
    const scrollTop =
      window.pageYOffset || document.documentElement.scrollTop
    const windowHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight

    // Clamp scroll when no more content
    if (!hasMoreRef.current && contentListRef.current.length > 0) {
      const maxScrollTop = Math.max(0, documentHeight - windowHeight - 10)
      if (scrollTop > maxScrollTop) {
        window.scrollTo({ top: maxScrollTop, behavior: 'auto' })
        return
      }
    }

    if (loadingMoreRef.current || !hasMoreRef.current) return

    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current)
    }

    scrollTimerRef.current = setTimeout(() => {
      if (loadingMoreRef.current || !hasMoreRef.current) return

      const currentScrollTop =
        window.pageYOffset || document.documentElement.scrollTop
      const currentWindowHeight = window.innerHeight
      const currentDocumentHeight = document.documentElement.scrollHeight

      if (
        currentScrollTop + currentWindowHeight >=
        currentDocumentHeight - 200
      ) {
        if (hasMoreRef.current) {
          loadMoreContentRef.current()
        }
      }
    }, 200)
  }, [])

  // ---- Resize handler ----
  const handleResize = useCallback(() => {
    if (resizeTimerRef.current) {
      clearTimeout(resizeTimerRef.current)
    }

    resizeTimerRef.current = setTimeout(() => {
      const oldColumnCount = columnCountRef.current
      const config = getColumnConfig(window.innerWidth)

      setColumnCount(config.columns)
      setColumnGap(config.gap)
      setBatchSize(config.batchSize)

      if (oldColumnCount !== config.columns) {
        // Re-distribute everything with new column count
        const items = contentListRef.current
        const cols = createEmptyColumns(config.columns)
        const heights = createZeroHeights(config.columns)

        items.forEach((item) => {
          const shortestIdx = getShortestColumnIndex(heights)
          cols[shortestIdx].push(item)
          const h = getOrEstimateItemHeight(item)
          heights[shortestIdx] += h
        })

        columnHeightsRef.current = heights
        setColumns(cols)
      }
    }, 300)
  }, [getOrEstimateItemHeight])

  // Keep event handler refs in sync
  useEffect(() => {
    handleScrollRef.current = handleScroll
  }, [handleScroll])

  useEffect(() => {
    handleResizeRef.current = handleResize
  }, [handleResize])

  // ---- Popstate handler (DetailCard back navigation) ----
  const handlePopState = useCallback(() => {
    // When browser back/forward is used, if there was a DetailCard state,
    // the parent component should handle it via the callback mechanism.
    // This is a simplified placeholder.
  }, [])

  // ---- Image stuck-detection ----
  const checkImageLoadingStatus = useCallback(() => {
    const allItems = document.querySelectorAll('.waterfall-item')

    allItems.forEach((item, index) => {
      const rect = item.getBoundingClientRect()
      const img = item.querySelector('.lazy-image') as HTMLImageElement | null

      const isInViewport =
        rect.top < window.innerHeight + 200 && rect.bottom > -200
      const isFirstScreen = index < columnCountRef.current * 2

      if ((isInViewport || isFirstScreen) && img) {
        const isStuck =
          !img.src || img.src === 'data:' || img.style.opacity === '0'
        if (isStuck) {
          const imgSrc = img.dataset.src
          if (imgSrc) {
            // Force-load stuck image
            const newImg = new Image()
            newImg.src = imgSrc
          }
        }
      }
    })
  }, [])

  const forceCheckFirstScreenImages = useCallback(() => {
    const allItems = document.querySelectorAll('.waterfall-item')

    allItems.forEach((item, index) => {
      if (index >= columnCountRef.current * 2) return

      const img = item.querySelector('.lazy-image') as HTMLImageElement | null
      if (
        img &&
        (!img.src || img.src === 'data:' || img.style.opacity === '0')
      ) {
        const imgSrc = img.dataset.src
        if (imgSrc) {
          const newImg = new Image()
          newImg.src = imgSrc
        }
      }
    })
  }, [])

  // ---- Event handlers ----
  const onCardClickHandler = useCallback(
    (item: TransformedPost, event: React.MouseEvent) => {
      const position = { x: event.clientX, y: event.clientY }
      onCardClick?.(JSON.parse(JSON.stringify(item)), position)
    },
    [onCardClick],
  )

  const onUserClickHandler = useCallback(
    (authorAccount: number | string | undefined, event: React.MouseEvent) => {
      event.stopPropagation()
      if (authorAccount) {
        const userUrl = `${window.location.origin}/user/${authorAccount}`
        window.open(userUrl, '_blank')
      }
    },
    [],
  )

  const onLikeClickHandler = useCallback(
    async (
      item: TransformedPost,
      willBeLiked: boolean,
      e: React.MouseEvent,
    ) => {
      e.stopPropagation()

      if (!userStore.isLoggedIn()) {
        authStore.openLoginModal()
        return
      }

      try {
        const currentState = likeStore.getPostLikeState(item.id)
        await likeStore.togglePostLike(
          item.id,
          currentState.liked,
          currentState.likeCount,
        )
      } catch (error) {
        console.error('点赞操作失败:', error)
      }
    },
    [userStore, authStore, likeStore],
  )

  const onImageLoaded = useCallback(
    (itemId: number, loadType: 'imageLoaded' | 'avatarLoaded') => {
      setItemLoadingStates((prev) => {
        const current = prev[itemId]
        if (!current) return prev
        return {
          ...prev,
          [itemId]: { ...current, [loadType]: true },
        }
      })

      if (loadType === 'imageLoaded') {
        updateItemHeight(itemId)
      }
    },
    [updateItemHeight],
  )

  const isItemFullyLoaded = useCallback(
    (itemId: number): boolean => {
      return itemLoadingStates[itemId]?.imageLoaded ?? false
    },
    [itemLoadingStates],
  )

  const onFadeInEnd = useCallback((item: TransformedPost) => {
    setNewItemAnimStates((prev) => {
      const updated = { ...prev }
      delete updated[item.id]
      return updated
    })
  }, [])

  const handleAvatarError = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      ;(event.target as HTMLImageElement).src = DEFAULT_AVATAR
    },
    [],
  )

  const handleImageError = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      ;(event.target as HTMLImageElement).src = DEFAULT_PLACEHOLDER
    },
    [],
  )

  // ---- Mount / Unmount ----
  useEffect(() => {
    // Initial load
    initContent()

    // Force-check first-screen images after DOM settles
    setTimeout(() => {
      forceCheckFirstScreenImages()
    }, 100)

    // Add listeners (using refs to avoid stale closures)
    const onScroll = () => handleScrollRef.current()
    const onResize = () => handleResizeRef.current()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    window.addEventListener('popstate', handlePopState)

    // Start image loading monitor
    imageMonitorTimerRef.current = setInterval(() => {
      checkImageLoadingStatus()
    }, 15000)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('popstate', handlePopState)

      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current)
        scrollTimerRef.current = null
      }
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current)
        resizeTimerRef.current = null
      }
      if (imageMonitorTimerRef.current) {
        clearInterval(imageMonitorTimerRef.current)
        imageMonitorTimerRef.current = null
      }
    }
    // Only run on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Prop watchers (equivalent to Vue watch) ----
  useEffect(() => {
    if (refreshKey !== 0) {
      initContent()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  useEffect(() => {
    // Skip on initial mount (already handled by mount effect)
    // This runs on category change
    initContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  useEffect(() => {
    initContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKeyword])

  useEffect(() => {
    initContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTag])

  useEffect(() => {
    // Deep compare for preloadedPosts
    initContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(preloadedPosts)])

  useEffect(() => {
    initContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    // Reset initial load flag when type changes (tab switch)
    setIsInitialLoad(true)
    initContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  // ---- Empty state message ----
  const getEmptyMessage = (): string => {
    if (type === 'posts') return '还没有发布任何内容'
    if (type === 'collections') return '还没有收藏任何内容'
    if (type === 'likes') return '还没有点赞任何内容'
    if (searchKeyword) return '没有找到相关内容'
    return '暂无内容'
  }

  // ---- Render helpers ----
  const renderSkeleton = () => (
    <SkeletonList
      count={8}
      type="image-card"
      layout="waterfall"
      imageHeight="random"
      showStats={false}
      showButton={false}
      listClass="waterfall-layout"
    />
  )

  const renderEmptyState = () => (
    <div className="empty-state">
      <div className="empty-text">{getEmptyMessage()}</div>
    </div>
  )

  const renderLoadMoreIndicator = () => (
    <div
      className={`load-more-indicator${
        !hasMore && contentList.length > 0 ? ' no-more-content' : ''
      }`}
    >
      {loadingMore ? (
        <div className="loading-more">
          <SimpleSpinner size="24" />
          <span className="loading-text">加载中...</span>
        </div>
      ) : !hasMore && contentList.length > 0 ? (
        <div className="no-more">
          <span className="no-more-text">没有更多内容了</span>
        </div>
      ) : null}
    </div>
  )

  const renderColumn = (column: TransformedPost[], columnIndex: number) => (
    <div key={columnIndex} className="waterfall-column">
      {column.map((item) => {
        const fullyLoaded = isItemFullyLoaded(item.id)
        const animState = newItemAnimStates[item.id]
        const likeState = likeStore.getPostLikeState(item.id)

        return (
          <div
            key={item.id}
            data-item-id={item.id}
            className={`waterfall-item${
              animState?.isNew ? ' new-item' : ''
            }${animState?.fadeIn ? ' fade-in' : ''}`}
            onAnimationEnd={(e) => {
              // Only handle animationend from this element, not children
              if (
                e.target === e.currentTarget &&
                animState?.fadeIn
              ) {
                onFadeInEnd(item)
              }
            }}
          >
            {/* Skeleton placeholder while image not loaded */}
            {!fullyLoaded && (
              <BaseSkeleton
                type="image-card"
                imageHeight="random"
                showStats={false}
                showButton={false}
              />
            )}

            {/* Actual content */}
            <div
              className={`item-content${
                !fullyLoaded ? ' content-hidden' : ''
              }`}
            >
              <div
                className="content-img"
                onClick={(e) => onCardClickHandler(item, e)}
              >
                <LazyImage
                  src={item.image}
                  alt=""
                  className="lazy-image"
                  onLoad={() => onImageLoaded(item.id, 'imageLoaded')}
                  onError={() => {
                    // Handled internally by LazyImage
                  }}
                />
                {/* Video indicator for type === 2 posts */}
                {item.type === 2 && (
                  <div className="video-indicator">
                    <Play size={12} />
                  </div>
                )}
              </div>

              <div className="content-title">{item.title}</div>

              <div className="contentlist">
                <img
                  src={item.avatar || undefined as any}
                  alt=""
                  className="lazy-avatar clickable-avatar"
                  onError={handleAvatarError}
                  onLoad={() => onImageLoaded(item.id, 'avatarLoaded')}
                  onClick={(e) =>
                    onUserClickHandler(item.author_account, e)
                  }
                />

                <div
                  className="contentlist-name clickable-name"
                  onClick={(e) =>
                    onUserClickHandler(item.author_account, e)
                  }
                >
                  {item.author}
                </div>

                <div className="action-wrapper">
                  <div className="like-num-wrapper">
                    <LikeButton
                      isLiked={likeState.liked}
                      onClick={(willBeLiked, event) =>
                        onLikeClickHandler(item, willBeLiked, event)
                      }
                    />
                    <span className="like-num">
                      {likeState.likeCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  // ---- Main Render ----
  return (
    <>
      {/* Inline styles — exact match of Vue scoped CSS */}
      <style>{`
        .waterfall-container {
          width: 100%;
          position: relative;
          padding: 0 16px;
          box-sizing: border-box;
          isolation: isolate;
        }

        .waterfall-columns {
          display: flex;
          align-items: flex-start;
          width: 100%;
          gap: 16px;
          contain: layout style;
          transform: none;
          will-change: auto;
        }

        .waterfall-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
          contain: layout;
        }

        .waterfall-item {
          width: 100%;
          border-radius: 10px;
          overflow: hidden;
          background-color: var(--bg-color-primary);
          position: relative;
          box-sizing: border-box;
          transition: border-color 0.2s ease, background-color 0.2s ease;
          visibility: visible;
          opacity: 1;
          contain: layout style paint;
          transform: translateZ(0);
          backface-visibility: hidden;
        }

        .waterfall-item.new-item {
          opacity: 0;
          transform: translateY(20px) translateZ(0);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
          will-change: opacity, transform;
        }

        .waterfall-item.new-item.fade-in {
          opacity: 1;
          transform: translateY(0) translateZ(0);
        }

        .waterfall-item:not(.new-item) {
          will-change: auto;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          min-height: 200px;
        }

        .empty-text {
          color: var(--text-color-secondary);
          font-size: 16px;
          line-height: 1.5;
        }

        .content-hidden {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          opacity: 0;
          z-index: -1;
          visibility: hidden;
        }

        .content-img {
          cursor: pointer;
          position: relative;
          overflow: hidden;
          z-index: 1;
        }

        .video-indicator {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 20px;
          height: 20px;
          background: rgba(0, 0, 0, 0.323);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          z-index: 2;
          backdrop-filter: blur(4px);
          transition: all 0.2s ease;
        }

        .content-img img {
          width: 100%;
          height: auto;
          object-fit: cover;
          border-radius: 10px;
          display: block;
          max-width: 100%;
          opacity: 1;
          visibility: visible;
          object-position: center;
          transition: filter 0.8s ease;
        }

        .content-img img:hover {
          filter: brightness(0.7);
        }

        .lazy-image {
          transition: opacity 0.5s ease, filter 0.3s ease !important;
          opacity: 0;
          visibility: hidden;
        }

        .lazy-image.fade-in {
          opacity: 1 !important;
          visibility: visible !important;
        }

        .lazy-image[src]:not([src=""]):not([src="data:"]) {
          opacity: 1;
          visibility: visible;
        }

        .lazy-avatar {
          transition: opacity 0.3s ease;
          opacity: 1;
          visibility: visible;
        }

        .lazy-avatar.fade-in {
          opacity: 1 !important;
          visibility: visible !important;
        }

        .content-title {
          margin: 5px 10px;
          font-size: 14px;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          line-clamp: 2;
          overflow: hidden;
        }

        .contentlist {
          display: flex;
          align-items: center;
          padding: 10px;
        }

        .contentlist img {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          margin-right: 5px;
        }

        .clickable-avatar {
          cursor: pointer;
        }

        .contentlist-name {
          font-size: 12px;
          color: var(--text-color-secondary);
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
          flex: 1;
        }

        .clickable-name {
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .clickable-name:hover {
          color: var(--text-color-primary);
        }

        .action-wrapper {
          display: flex;
          align-items: center;
          margin-left: auto;
        }

        .like-num-wrapper {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .like-num {
          font-size: 12px;
          color: var(--text-color-secondary);
        }

        .load-more-indicator {
          width: 100%;
          padding: 15px 0;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .load-more-indicator.no-more-content {
          padding: 8px 0 5px 0;
          margin: 0;
          min-height: auto;
        }

        .loading-more {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 10px;
        }

        .loading-text {
          color: var(--text-color-secondary);
          font-size: 14px;
        }

        .no-more {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px 0;
        }

        .no-more-text {
          color: var(--text-color-tertiary);
          font-size: 12px;
          position: relative;
        }

        .no-more-text::before,
        .no-more-text::after {
          content: '';
          position: absolute;
          top: 50%;
          width: 40px;
          height: 1px;
          background: var(--border-color-secondary);
        }

        .no-more-text::before {
          right: 100%;
          margin-right: 10px;
        }

        .no-more-text::after {
          left: 100%;
          margin-left: 10px;
        }

        @media (min-width: 1420px) {
          .waterfall-columns {
            gap: 20px;
          }

          .waterfall-column {
            gap: 20px;
          }
        }

        @media (min-width: 1200px) {
          .waterfall-columns {
            gap: 18px;
          }

          .waterfall-column {
            gap: 18px;
          }
        }

        @media (max-width: 600px) {
          .waterfall-container {
            padding: 0 12px;
          }

          .waterfall-columns {
            gap: 12px;
          }

          .waterfall-column {
            gap: 12px;
          }
        }
      `}</style>

      {/* Render */}
      {loading ? (
        renderSkeleton()
      ) : (
        <div ref={containerRef} className="waterfall-container">
          {contentList.length === 0 && !loadingMore ? (
            renderEmptyState()
          ) : (
            <>
              <div
                className="waterfall-columns"
                style={{ gap: `${columnGap}px` }}
              >
                {columns.map((column, i) => renderColumn(column, i))}
              </div>

              {renderLoadMoreIndicator()}
            </>
          )}
        </div>
      )}
    </>
  )
}

export default WaterfallFlow
