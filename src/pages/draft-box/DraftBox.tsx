import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { useUserStore } from '@/stores/user-store'
import { getDraftPosts, deletePost } from '@/lib/api/posts'
import PostItem from '@/components/PostItem'
import ConfirmDialog from '@/components/ConfirmDialog'
import DetailCard from '@/components/DetailCard'
import { toast } from '@/utils/toastManager'

interface Post {
  id: number
  [key: string]: any
}

export default function DraftBox() {
  const navigate = useNavigate()
  const userStore = useUserStore()

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalPosts, setTotalPosts] = useState(0)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)

  const [showDetailCard, setShowDetailCard] = useState(false)
  const [selectedDetailPost, setSelectedDetailPost] = useState<any>(null)
  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 })

  const pageSize = 10

  const loadDrafts = useCallback(async () => {
    if (!userStore.userInfo?.user_id) return
    try {
      setLoading(true)
      const response = await getDraftPosts({ page: currentPage, limit: pageSize })
      if ((response as any).success) {
        setPosts((response as any).data.posts)
        setTotalPages((response as any).data.pagination.pages)
        setTotalPosts((response as any).data.pagination.total)
      } else {
        toast.error((response as any).message || '加载草稿失败')
      }
    } catch (error) {
      console.error('加载草稿失败:', error)
      toast.error('加载草稿失败')
    } finally {
      setLoading(false)
    }
  }, [userStore.userInfo, currentPage])

  useEffect(() => {
    userStore.initUserInfo()
  }, [])

  useEffect(() => {
    if (userStore.userInfo?.user_id) {
      loadDrafts()
    }
  }, [loadDrafts, userStore.userInfo?.user_id])

  const changePage = useCallback((page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [])

  const editPost = useCallback((post: Post) => {
    navigate(`/publish?draftId=${post.id}&mode=edit`)
  }, [navigate])

  const confirmDelete = useCallback((post: Post) => {
    setSelectedPost(post)
    setShowDeleteModal(true)
  }, [])

  const handleDelete = useCallback(async () => {
    if (!selectedPost) return
    try {
      const response = await deletePost(selectedPost.id)
      if ((response as any).success) {
        toast.success('删除成功')
        setShowDeleteModal(false)
        setSelectedPost(null)
        loadDrafts()
      } else {
        toast.error((response as any).message || '删除失败')
      }
    } catch (error) {
      console.error('删除失败:', error)
      toast.error('删除失败')
    }
  }, [selectedPost, loadDrafts])

  const handleViewPost = useCallback((post: any, event: React.MouseEvent) => {
    setClickPosition({ x: event.clientX, y: event.clientY })
    setSelectedDetailPost(JSON.parse(JSON.stringify(post)))
    setShowDetailCard(true)

    const originalTitle = document.title
    document.title = post.title || '草稿详情'
    const newUrl = `/post?id=${post.id}`
    window.history.pushState(
      { previousUrl: window.location.pathname + window.location.search, showDetailCard: true, postId: post.id, originalTitle },
      post.title || '草稿详情',
      newUrl,
    )
  }, [])

  const closeDetailCard = useCallback(() => {
    setShowDetailCard(false)
    setSelectedDetailPost(null)
    if ((window.history.state as any)?.originalTitle) {
      document.title = (window.history.state as any).originalTitle
    }
    if ((window.history.state as any)?.previousUrl) {
      window.history.replaceState(window.history.state, '', (window.history.state as any).previousUrl)
    } else {
      window.history.back()
    }
  }, [])

  const goToPublish = useCallback(() => navigate('/publish'), [navigate])

  return (
    <div className="draft-box-container">
      <div className="page-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/publish')}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="page-title">草稿箱</h1>
        </div>
        <div className="header-right">
          <span className="post-count">共 {totalPosts} 篇草稿</span>
        </div>
      </div>

      <div className="posts-section">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>加载中...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <p>暂无草稿</p>
            <button className="create-btn" onClick={goToPublish}>
              <Plus size={16} />
              写一篇笔记
            </button>
          </div>
        ) : (
          <div className="posts-list">
            {posts.map((post) => (
              <PostItem
                key={post.id}
                post={post as any}
                onEdit={editPost}
                onDelete={confirmDelete}
                onView={handleViewPost}
              />
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}>
            上一页
          </button>
          <span className="page-info">{currentPage} / {totalPages}</span>
          <button
            className="page-btn"
            disabled={currentPage === totalPages}
            onClick={() => changePage(currentPage + 1)}
          >
            下一页
          </button>
        </div>
      )}

      {showDetailCard && selectedDetailPost && (
        <DetailCard item={selectedDetailPost} clickPosition={clickPosition} onClose={closeDetailCard} />
      )}

      {showDeleteModal && selectedPost && (
        <ConfirmDialog
          visible={showDeleteModal}
          title="删除草稿"
          message={`确定要删除草稿《${selectedPost.title}》吗？此操作不可撤销。`}
          type="warning"
          confirmText="删除"
          cancelText="取消"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      <style>{`
        .draft-box-container {
          min-height: 100vh;
          background: var(--bg-color-primary);
          color: var(--text-color-primary);
          padding-bottom: calc(48px + env(safe-area-inset-bottom, 0px));
          margin: 72px auto;
          min-width: 700px;
          max-width: 700px;
        }
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          background: var(--bg-color-primary);
          border-bottom: 1px solid var(--border-color-primary);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .header-left { display: flex; align-items: center; gap: 0.75rem; }
        .header-right { display: flex; align-items: center; }
        .back-btn {
          display: flex; align-items: center; justify-content: center;
          width: 40px; height: 40px; border: none; background: transparent;
          color: var(--text-color-primary); border-radius: 50%; cursor: pointer;
        }
        .back-btn:hover { background: var(--bg-color-secondary); }
        .page-title { font-size: 1.2rem; font-weight: 600; margin: 0; color: var(--text-color-primary); }
        .post-count { font-size: 0.9rem; color: var(--text-color-secondary); }
        .posts-section { padding: 1rem; }
        .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; color: var(--text-color-secondary); }
        .loading-spinner {
          width: 40px; height: 40px; border: 3px solid var(--border-color-primary);
          border-top: 3px solid var(--primary-color); border-radius: 50%;
          animation: spin 1s linear infinite; margin-bottom: 1rem;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; color: var(--text-color-secondary); }
        .create-btn {
          display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem;
          background: var(--primary-color); color: white; border: none; border-radius: 6px;
          cursor: pointer; font-size: 0.9rem; font-weight: 500; margin-top: 1rem; transition: all 0.3s ease;
        }
        .create-btn:hover { background: var(--primary-color-dark); }
        .posts-list { display: flex; flex-direction: column; gap: 1rem; }
        .pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 2rem 1rem; }
        .page-btn {
          padding: 0.5rem 1rem; border: 1px solid var(--border-color-primary);
          background: var(--bg-color-primary); color: var(--text-color-primary);
          border-radius: 4px; cursor: pointer; transition: all 0.3s ease;
        }
        .page-btn:hover:not(:disabled) { background: var(--primary-color); color: white; border-color: var(--primary-color); }
        .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .page-info { font-size: 0.9rem; color: var(--text-color-secondary); }
        @media (max-width: 960px) {
          .draft-box-container { min-width: 100%; max-width: 100%; margin: 72px 0; }
          .page-header { padding: 0.75rem 1rem; }
          .posts-section { padding: 0.75rem 1rem; }
        }
      `}</style>
    </div>
  )
}
