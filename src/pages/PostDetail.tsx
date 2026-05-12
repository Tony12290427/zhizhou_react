import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { getPostDetail } from '@/lib/api/posts'
import DetailCard from '@/components/DetailCard'

export default function PostDetail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const postId = searchParams.get('id')
  const targetCommentId = searchParams.get('targetCommentId') || null

  const [postData, setPostData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showBackButton, setShowBackButton] = useState(false)
  const originalTitleRef = useState(() => document.title)[0]

  // Check mobile viewport
  const updateShowBackButton = useCallback(() => {
    setShowBackButton(window.innerWidth <= 768)
  }, [])

  useEffect(() => {
    updateShowBackButton()
    window.addEventListener('resize', updateShowBackButton)
    return () => {
      window.removeEventListener('resize', updateShowBackButton)
    }
  }, [updateShowBackButton])

  // Fetch post detail
  const fetchPostDetail = useCallback(async (id: string) => {
    try {
      setLoading(true)
      const response = await getPostDetail(id)
      if (response) {
        setPostData(response)
        document.title = response.title || '笔记详情'
      } else {
        navigate('/not-found', { replace: true })
      }
    } catch (error) {
      console.error('获取笔记详情出错:', error)
      navigate('/not-found', { replace: true })
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    if (postId) {
      fetchPostDetail(postId)
    } else {
      navigate('/not-found', { replace: true })
      setLoading(false)
    }
    return () => {
      // Restore original page title
      if (originalTitleRef) {
        document.title = originalTitleRef
      }
    }
  }, [postId, fetchPostDetail, navigate, originalTitleRef])

  const goBack = useCallback(() => {
    navigate('/explore')
  }, [navigate])

  return (
    <div className="post-detail-page">
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>加载中...</p>
        </div>
      ) : (
        <>
          {showBackButton && (
            <button onClick={goBack} className="back-home-btn" aria-label="返回">
              <X size={20} />
            </button>
          )}
          <DetailCard
            item={postData}
            pageMode
            targetCommentId={targetCommentId}
          />
        </>
      )}
      <style>{`
        .post-detail-page {
          min-height: calc(100vh - 64px);
          margin: 10px;
          width: 100%;
          box-sizing: border-box;
          position: relative;
          padding-top: 64px;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 64px 20px 20px 20px;
        }
        @media (max-width: 960px) {
          .post-detail-page {
            margin: 0;
            padding: 0;
            padding-top: 64px;
            width: 100vw;
            max-width: 100vw;
          }
        }
        @media (max-width: 768px) {
          .post-detail-page {
            margin: 0;
            padding: 0;
            overflow-y: visible;
            overflow-x: hidden;
            width: 100vw;
            height: 100vh;
            min-height: 100vh;
            max-width: 100vw;
            display: block;
            border-radius: 0;
            box-shadow: none;
            align-items: normal;
            justify-content: normal;
          }
        }
        .back-home-btn {
          position: fixed;
          top: calc(16px + env(safe-area-inset-top, 0px));
          left: 16px;
          z-index: 1001;
          background: transparent;
          color: var(--text-color-secondary);
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        .back-home-btn:hover {
          background: rgba(144, 144, 144, 0.292);
        }
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          text-align: center;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        @media (max-width: 960px) {
          .loading-container {
            position: relative;
            top: auto;
            left: auto;
            transform: none;
            min-height: calc(100vh - 64px);
            width: 100%;
          }
        }
        @media (max-width: 768px) {
          .loading-container {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            transform: none;
            min-height: 100vh;
            width: 100vw;
            height: 100vh;
            padding: 20px;
            box-sizing: border-box;
            background: var(--bg-color-primary);
            z-index: 1000;
          }
        }
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid var(--border-color-primary);
          border-top: 4px solid var(--primary-color);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }
        @media (max-width: 768px) {
          .loading-spinner {
            width: 48px;
            height: 48px;
            border-width: 5px;
            margin-bottom: 20px;
          }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
