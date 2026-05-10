import React, { useCallback } from 'react'
import {
  Pencil,
  Trash2,
  Eye,
  Heart,
  Bookmark,
  MessageCircle,
  ImageIcon,
} from 'lucide-react'
import type { TransformedPost } from '@/types/post'
import './PostItem.css'

export interface PostItemProps {
  post: TransformedPost
  onEdit?: (post: TransformedPost) => void
  onDelete?: (post: TransformedPost) => void
  onView?: (post: TransformedPost, event: React.MouseEvent) => void
}

// Helper: sanitize and decode HTML entities
function sanitizeContent(rawContent: string | undefined | null): string {
  if (!rawContent) return ''
  const decoded = rawContent
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
  const normalized = decoded.replace(/<br\s*\/?>/gi, ' ')
  const withoutTags = normalized.replace(/<\/?[^>]+>/g, ' ')
  return withoutTags.replace(/\s+/g, ' ').trim()
}

// Helper: truncate content to 100 chars
function truncateContent(content?: string | null): string {
  const plainText = sanitizeContent(content)
  return plainText.length > 100 ? plainText.substring(0, 100) + '...' : plainText
}

// Helper: format date to zh-CN
function formatDate(dateString?: string | null): string {
  if (!dateString) return '未知时间'

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '无效日期'

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Helper: get category name
function getCategoryName(category?: string | number | null): string {
  return String(category || '未知')
}

// Helper: status text
function getStatusText(status?: number): string {
  const statusMap: Record<number, string> = {
    0: '已发布',
    1: '草稿',
    2: '待审核',
    3: '未过审',
  }
  return statusMap[status ?? -1] || '未知'
}

// Helper: status CSS class
function getStatusClass(status?: number): string {
  const classMap: Record<number, string> = {
    0: 'status-published',
    1: 'status-draft',
    2: 'status-pending',
    3: 'status-rejected',
  }
  return classMap[status ?? -1] || 'status-unknown'
}

// Placeholder image path (from Vue source: @/assets/imgs/zhizhou-placeholder.jpg)
const PLACEHOLDER_IMG = '/zhizhou-placeholder.jpg'

const PostItem: React.FC<PostItemProps> = ({ post, onEdit, onDelete, onView }) => {
  const goToPostDetail = useCallback(
    (event: React.MouseEvent) => {
      onView?.(post, event)
    },
    [post, onView],
  )

  const handleEdit = useCallback(() => {
    onEdit?.(post)
  }, [post, onEdit])

  const handleDelete = useCallback(() => {
    onDelete?.(post)
  }, [post, onDelete])

  const handleImageError = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      const img = event.currentTarget
      img.src = PLACEHOLDER_IMG
      img.style.display = 'block'
    },
    [],
  )

  // Determine thumbnail source (matching Vue logic)
  const getThumbnailSrc = (): string | null => {
    if (post.type === 2 && post.images && post.images.length > 0) {
      return post.images[0]
    }
    if (
      post.type !== 2 &&
      ((post.originalData?.images && post.originalData.images.length > 0) ||
        (post.images && post.images.length > 0))
    ) {
      return (
        (post.originalData?.images && post.originalData.images[0]) ||
        (post.images && post.images[0]) ||
        post.image ||
        null
      )
    }
    if (post.type === 2) {
      return null // video type, no image
    }
    return null
  }

  const thumbnailSrc = getThumbnailSrc()

  return (
    <div className="post-item">
      {/* Upper section: thumbnail, text content, action buttons */}
      <div className="post-upper">
        {/* Thumbnail */}
        <div className="post-thumbnail" onClick={goToPostDetail}>
          {post.type === 2 &&
          post.images &&
          post.images.length > 0 ? (
            <img
              src={post.images[0]}
              alt={post.title}
              onError={handleImageError}
            />
          ) : post.type !== 2 && thumbnailSrc ? (
            <img
              src={thumbnailSrc}
              alt={post.title}
              onError={handleImageError}
            />
          ) : post.type === 2 ? (
            <div className="video-thumbnail">
              <span>视频</span>
            </div>
          ) : (
            <div className="no-image">
              <ImageIcon width={24} height={24} />
            </div>
          )}
        </div>

        {/* Text content */}
        <div className="post-text-content" onClick={goToPostDetail}>
          <h3 className="post-title">{post.title}</h3>
          <p className="post-content">
            {truncateContent(post.content)}
          </p>
        </div>

        {/* Action buttons */}
        <div className="post-actions">
          <button className="action-btn edit-btn" onClick={handleEdit}>
            <Pencil width={16} height={16} />
            编辑
          </button>
          <button className="action-btn delete-btn" onClick={handleDelete}>
            <Trash2 width={16} height={16} />
            删除
          </button>
        </div>
      </div>

      {/* Lower section: meta tags and publish date */}
      <div className="post-lower">
        <div className="meta-row">
          <span className="category">
            {getCategoryName(post.category)}
          </span>
          <span className="stats">
            <Eye width={14} height={14} />
            {post.view_count}
          </span>
          <span className="stats">
            <Heart width={14} height={14} />
            {post.like_count}
          </span>
          <span className="stats">
            <Bookmark width={14} height={14} />
            {post.collect_count}
          </span>
          <span className="stats">
            <MessageCircle width={14} height={14} />
            {post.comment_count}
          </span>
        </div>
        <div className="date-row">
          <span className="date">
            {formatDate(
              post.originalData?.createdAt || post.created_at,
            )}
          </span>
          {/* Status tag */}
          {post.status !== undefined && (
            <span
              className={`status-tag ${getStatusClass(post.status)}`}
            >
              {getStatusText(post.status)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default PostItem
