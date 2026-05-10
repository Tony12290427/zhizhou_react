import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { TabContainer, type Tab } from '@/components/TabContainer'
import { useNavigationStore } from '@/stores/navigation-store'
import { useEventStore } from '@/stores/event-store'
import WaterfallFlow from '@/components/WaterfallFlow'
import LoadingSpinner from '@/components/spinner/LoadingSpinner'
import { ContentRenderer } from '@/components/ContentRenderer'
import { searchApi } from '@/lib/api'
import apiConfig from '@/config/api'

const SEARCH_TABS: Tab[] = [
  { id: 'all', label: '全部' },
  { id: 'posts', label: '图文' },
  { id: 'videos', label: '视频' },
  { id: 'users', label: '用户' },
  { id: 'ai', label: 'AI' },
]

interface SearchResultData {
  posts?: { data: any[]; pagination: any }
  users?: { data: any[]; pagination: any }
  data?: any[]
  tagStats?: any[]
}

export default function SearchResult() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const navigationStore = useNavigationStore()
  const eventStore = useEventStore()

  const keyword = searchParams.get('keyword') || ''
  const selectedTagParam = searchParams.get('tag') || ''
  const tabParam = location.pathname.split('/').pop() || 'all'

  const [activeTab, setActiveTab] = useState<string>(
    ['all', 'posts', 'videos', 'users', 'ai'].includes(tabParam) ? tabParam : 'all',
  )
  const [selectedTag, setSelectedTag] = useState(selectedTagParam)
  const [postResults, setPostResults] = useState<any[]>([])
  const [userResults, setUserResults] = useState<any[]>([])
  const [tagStats, setTagStats] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isTagLoading, setIsTagLoading] = useState(false)

  // AI search state
  const [aiHtml, setAiHtml] = useState('')
  const [aiArticles, setAiArticles] = useState<any[]>([])
  const [aiLoading, setAiLoading] = useState(false)

  // Caches
  const cachedAllPosts = useRef<any[]>([])
  const cachedKeyword = useRef('')
  const cachedPostsData = useRef<any[]>([])
  const cachedVideosData = useRef<any[]>([])
  const cachedAllTagStats = useRef<any[]>([])
  const cachedPostsTagStats = useRef<any[]>([])
  const cachedVideosTagStats = useRef<any[]>([])

  const isInitialLoad = useRef(true)
  const listenerKeyRef = useRef<string | null>(null)

  // Show tag container
  const shouldShowTagContainer = useMemo(() => {
    if (activeTab === 'users' || activeTab === 'ai') return false
    if (postResults.length === 0) return false
    return true
  }, [activeTab, postResults])

  // Current tag stats based on active tab
  const currentTagStats = useMemo(() => {
    if (activeTab === 'all' && cachedAllTagStats.current.length > 0) return cachedAllTagStats.current
    if (activeTab === 'posts' && cachedPostsTagStats.current.length > 0) return cachedPostsTagStats.current
    if (activeTab === 'videos' && cachedVideosTagStats.current.length > 0) return cachedVideosTagStats.current
    return tagStats
  }, [activeTab, tagStats])

  // Search content
  const searchContent = useCallback(async (type = 'all', page = 1, limit = 20) => {
    if (!keyword.trim() && !selectedTag.trim()) {
      console.warn('搜索关键词和标签都为空')
      return
    }

    // Check cache
    if (keyword.trim() && keyword === cachedKeyword.current && !selectedTag.trim()) {
      if (type === 'all' && cachedAllPosts.current.length > 0) {
        setPostResults([...cachedAllPosts.current])
        return
      }
      if (type === 'posts' && cachedPostsData.current.length > 0) {
        setPostResults([...cachedPostsData.current])
        return
      }
      if (type === 'videos' && cachedVideosData.current.length > 0) {
        setPostResults([...cachedVideosData.current])
        return
      }
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({ type, page: String(page), limit: String(limit) })
      if (keyword.trim()) params.append('keyword', keyword.trim())
      if (selectedTag.trim()) params.append('tag', selectedTag.trim())

      const response = await fetch(`${apiConfig.baseURL}/search?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }).then((res) => res.json())

      if (response?.code === 200 && response.data) {
        const data: SearchResultData = response.data
        // Tag stats
        let currentTagStatsData: any[] = []
        if (data.tagStats) currentTagStatsData = data.tagStats
        else if (data.posts?.tagStats) currentTagStatsData = data.posts.tagStats
        setTagStats(currentTagStatsData)

        // Users
        if (type === 'users' || (type === 'all' && data.users)) {
          handleUserResults(data.users)
        }

        // Posts
        if (type === 'posts' || type === 'videos' || (type === 'all' && data.data)) {
          const postsData = type === 'all' ? data : data.posts
          handlePostResults(postsData, type, currentTagStatsData)
        }
      } else {
        console.error('搜索失败:', response)
        setUserResults([])
        setPostResults([])
        setTagStats([])
        clearCaches()
      }
    } catch (error) {
      console.error('搜索失败:', error)
      setUserResults([])
      setPostResults([])
      setTagStats([])
      clearCaches()
    } finally {
      setLoading(false)
    }
  }, [keyword, selectedTag])

  function clearCaches() {
    cachedAllPosts.current = []
    cachedPostsData.current = []
    cachedVideosData.current = []
    cachedAllTagStats.current = []
    cachedPostsTagStats.current = []
    cachedVideosTagStats.current = []
    cachedKeyword.current = ''
  }

  function handleUserResults(usersData: any) {
    if (usersData?.data) {
      setUserResults(
        usersData.data.map((user: any) => ({
          id: user.id,
          nickname: user.nickname,
          userId: user.user_id,
          avatar: user.avatar,
          verified: user.verified || 0,
          followers: user.fans_count || 0,
          posts: user.post_count || 0,
          isFollowing: user.isFollowing || false,
          buttonType: user.buttonType || 'follow',
          bio: user.bio,
          location: user.location,
        })),
      )
    } else {
      setUserResults([])
    }
  }

  function handlePostResults(postsData: any, type: string, currentTagStatsData: any[]) {
    if (postsData?.data?.length > 0) {
      setPostResults([...postsData.data])

      if (keyword.trim() && postsData.data.length > 0) {
        if (type === 'all') {
          cachedAllPosts.current = postsData.data
          cachedAllTagStats.current = currentTagStatsData
        } else if (type === 'posts') {
          cachedPostsData.current = postsData.data
          cachedPostsTagStats.current = currentTagStatsData
        } else if (type === 'videos') {
          cachedVideosData.current = postsData.data
          cachedVideosTagStats.current = currentTagStatsData
        }
        cachedKeyword.current = keyword
      }
    } else {
      setPostResults([])
      // Clear cache for empty results
      if (type === 'all') { cachedAllPosts.current = []; cachedAllTagStats.current = [] }
      else if (type === 'posts') { cachedPostsData.current = []; cachedPostsTagStats.current = [] }
      else if (type === 'videos') { cachedVideosData.current = []; cachedVideosTagStats.current = [] }
    }
  }

  const handleTabChange = useCallback((item: Tab) => {
    const previousTab = activeTab
    setActiveTab(item.id as string)
    navigationStore.scrollToTop('instant')

    // Reset tag when switching to non-user tabs
    if (item.id !== 'users') {
      setSelectedTag('')
      const newQuery = new URLSearchParams(searchParams)
      newQuery.delete('tag')
      setSearchParams(newQuery)
    }

    const type = item.id as string

    if (type === 'ai') {
      // AI search handled via useEffect (aiSearchEffect)
      return
    }

    if (type === 'users') {
      searchContent(type)
    } else if (type === 'videos') {
      if (cachedVideosData.current.length > 0 && cachedKeyword.current === keyword) {
        setPostResults([...cachedVideosData.current])
        setTagStats(cachedVideosTagStats.current)
      } else {
        searchContent('videos')
      }
    } else if (type === 'posts') {
      if (cachedPostsData.current.length > 0 && cachedKeyword.current === keyword) {
        setPostResults([...cachedPostsData.current])
        setTagStats(cachedPostsTagStats.current)
      } else {
        searchContent('posts')
      }
    } else {
      if (cachedAllPosts.current.length > 0 && cachedKeyword.current === keyword) {
        setPostResults([...cachedAllPosts.current])
        setTagStats(cachedAllTagStats.current)
      } else {
        searchContent('all')
      }
    }
  }, [activeTab, keyword, navigationStore, searchContent, searchParams, setSearchParams])

  const handleTagReload = useCallback(() => {
    setIsTagLoading(true)
    setTimeout(() => setIsTagLoading(false), 700)
  }, [])

  const handleFloatingBtnReloadRequest = useCallback(() => {
    clearCaches()
    setIsTagLoading(true)
    eventStore.triggerFloatingBtnReload()
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('force-recheck'))
    }, 100)
    setTimeout(() => setIsTagLoading(false), 700)
    setTimeout(() => searchContent(activeTab), 100)
  }, [activeTab, eventStore, searchContent])

  const handleUserClick = useCallback((user: any) => {
    const userUrl = `${window.location.origin}/user/${user.userId}`
    window.open(userUrl, '_blank')
  }, [])

  // Watch query params
  useEffect(() => {
    if (isInitialLoad.current) {
      const kw = searchParams.get('keyword') || ''
      const tag = searchParams.get('tag') || ''
      setSelectedTag(tag)
      if (kw) {
        searchContent(activeTab)
      }
      isInitialLoad.current = false
      return
    }

    const newKeyword = searchParams.get('keyword') || ''
    const newTag = searchParams.get('tag') || ''

    if (newKeyword !== keyword || newTag !== selectedTag) {
      setSelectedTag(newTag)
      if (newKeyword !== keyword) {
        clearCaches()
      }
      navigationStore.scrollToTop('instant')
      // Will re-search via keyword change
    }
  }, [searchParams])

  // Effect to re-search when keyword changes
  const prevKeywordRef = useRef(keyword)
  useEffect(() => {
    if (prevKeywordRef.current !== keyword) {
      prevKeywordRef.current = keyword
      if (keyword) {
        searchContent(activeTab)
      }
    }
  }, [keyword, activeTab, searchContent])

  // AI search effect — streams SSE when AI tab is active
  useEffect(() => {
    if (activeTab !== 'ai' || !keyword.trim()) {
      setAiHtml('')
      setAiArticles([])
      return
    }

    setAiLoading(true)
    setAiHtml('')
    setAiArticles([])

    let cancelled = false

    searchApi
      .aiSearch(
        keyword.trim(),
        5,
        (html) => {
          if (!cancelled) setAiHtml(html)
        },
        (articles) => {
          if (!cancelled) setAiArticles(articles)
        },
      )
      .then(() => {
        if (!cancelled) setAiLoading(false)
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('AI search failed:', err)
          setAiLoading(false)
          setAiHtml('')
          setAiArticles([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [activeTab, keyword])

  // Mount
  useEffect(() => {
    listenerKeyRef.current = eventStore.addEventListener(
      'floating-btn-reload-request',
      handleFloatingBtnReloadRequest,
    )
    window.addEventListener('popstate', handlePopState)
    return () => {
      if (listenerKeyRef.current) eventStore.removeEventListener(listenerKeyRef.current)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  function handlePopState() {
    const newQuery = new URLSearchParams(searchParams)
    newQuery.delete('tag')
    setSearchParams(newQuery)
  }

  return (
    <div className="search-container">
      <TabContainer tabs={SEARCH_TABS} activeTab={activeTab} onChange={handleTabChange} />

      {shouldShowTagContainer && (
        <div className="tag-container-wrapper">
          {/* TagContainer equivalent - render tag chips */}
          <div className="tag-stats">
            {currentTagStats.map((tag: any) => (
              <button
                key={tag.id || tag.name}
                className={`tag-chip${selectedTag === (tag.name || tag.id) ? ' active' : ''}`}
                onClick={() => {
                  const newTag = selectedTag === (tag.name || tag.id) ? '' : (tag.name || tag.id)
                  setSelectedTag(newTag)
                  if (newTag) {
                    setSearchParams((prev) => { prev.set('tag', newTag); return prev })
                  } else {
                    setSearchParams((prev) => { prev.delete('tag'); return prev })
                  }
                  searchContent(activeTab)
                }}
              >
                {tag.label || tag.name} ({tag.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {isTagLoading && <LoadingSpinner />}

      <div className={`search-main${isTagLoading ? ' with-loading' : ''}`}>
        {activeTab === 'ai' ? (
          <div className="ai-search-section">
            {aiLoading && !aiHtml && (
              <div className="ai-loading">
                <LoadingSpinner />
                <span className="ai-loading-text">AI 正在生成回答...</span>
              </div>
            )}
            {aiHtml && (
              <div className="ai-answer">
                <ContentRenderer content={aiHtml} className="ai-content" />
                {aiLoading && (
                  <div className="ai-streaming-indicator">
                    <span className="ai-cursor" />
                  </div>
                )}
              </div>
            )}
            {aiArticles.length > 0 && (
              <div className="ai-articles">
                <h3 className="ai-articles-title">参考文章</h3>
                <div className="ai-articles-grid">
                  {aiArticles.map((article: any) => (
                    <a
                      key={article.id}
                      href={`${window.location.origin}/post/${article.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ai-article-card"
                    >
                      <div className="ai-article-card-content">
                        <h4 className="ai-article-card-title">{article.title || '无标题'}</h4>
                        {article.summary && (
                          <p className="ai-article-card-summary">{article.summary}</p>
                        )}
                      </div>
                      <span className="ai-article-card-arrow">&#8594;</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'users' ? (
          <div className="user-list-section">
            {userResults.map((user: any) => (
              <div key={user.id} className="user-item" onClick={() => handleUserClick(user)}>
                <img src={user.avatar} alt={user.nickname} className="user-avatar" />
                <div className="user-info">
                  <span className="user-name">{user.nickname}</span>
                  <span className="user-bio">{user.bio || '暂无简介'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <WaterfallFlow
            searchKeyword={keyword}
            searchTag={selectedTag}
            preloadedPosts={postResults}
            type={activeTab}
          />
        )}
      </div>

      <style>{`
        .search-container {
          padding-top: 72px;
          min-height: 100vh;
          background: var(--bg-color-primary);
          transition: background 0.2s ease;
        }
        .search-main {
          padding: 0px 10px calc(48px + env(safe-area-inset-bottom, 0px)) 10px;
          width: 100%;
          box-sizing: border-box;
          overflow-x: hidden;
          background: var(--bg-color-primary);
          transition: margin-top 0.3s ease, background 0.2s ease;
        }
        .search-main.with-loading {
          margin-top: 40px;
        }
        @media (max-width: 768px) {
          .search-main { padding: 15px; }
        }
        .tag-container-wrapper {
          padding: 8px 16px;
        }
        .tag-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .tag-chip {
          padding: 6px 14px;
          border: 1px solid var(--border-color-primary);
          border-radius: 999px;
          background: var(--bg-color-primary);
          color: var(--text-color-secondary);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .tag-chip:hover {
          background: var(--bg-color-secondary);
          color: var(--text-color-primary);
        }
        .tag-chip.active {
          background: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }
        .user-list-section {
          padding: 8px 0;
        }
        .user-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .user-item:hover {
          background: var(--bg-color-secondary);
        }
        .user-item .user-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
        }
        .user-item .user-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .user-item .user-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-color-primary);
        }
        .user-item .user-bio {
          font-size: 13px;
          color: var(--text-color-secondary);
        }

        /* AI Search */
        .ai-search-section {
          padding: 16px 0;
        }
        .ai-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 40px 0;
        }
        .ai-loading-text {
          font-size: 15px;
          color: var(--text-color-secondary);
        }
        .ai-answer {
          margin-bottom: 24px;
          line-height: 1.7;
          color: var(--text-color-primary);
        }
        .ai-content {
          font-size: 15px;
        }
        .ai-streaming-indicator {
          display: inline-flex;
          align-items: center;
          margin-left: 4px;
        }
        .ai-cursor {
          display: inline-block;
          width: 2px;
          height: 18px;
          background: var(--primary-color, #1a73e8);
          animation: ai-cursor-blink 1s step-end infinite;
          vertical-align: text-bottom;
        }
        @keyframes ai-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .ai-articles {
          border-top: 1px solid var(--border-color-primary);
          padding-top: 20px;
        }
        .ai-articles-title {
          font-size: 17px;
          font-weight: 600;
          color: var(--text-color-primary);
          margin: 0 0 12px 0;
        }
        .ai-articles-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ai-article-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border: 1px solid var(--border-color-primary);
          border-radius: 10px;
          text-decoration: none;
          color: inherit;
          transition: background-color 0.2s ease, border-color 0.2s ease;
          cursor: pointer;
        }
        .ai-article-card:hover {
          background: var(--bg-color-secondary);
          border-color: var(--primary-color);
        }
        .ai-article-card-content {
          flex: 1;
          min-width: 0;
        }
        .ai-article-card-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-color-primary);
          margin: 0 0 4px 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ai-article-card-summary {
          font-size: 13px;
          color: var(--text-color-secondary);
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ai-article-card-arrow {
          flex-shrink: 0;
          margin-left: 12px;
          font-size: 18px;
          color: var(--text-color-secondary);
        }
      `}</style>
    </div>
  )
}
