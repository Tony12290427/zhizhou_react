import { useState, useEffect, useRef, useCallback } from 'react'
import type { Tag } from '@/types/post'

interface TagContainerProps {
  tags: Tag[]
  activeTag: string
  onTagChange: (tag: string) => void
  loading?: boolean
}

export default function TagContainer({ tags, activeTag, onTagChange, loading }: TagContainerProps) {
  const [showAll, setShowAll] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const displayTags = showAll ? tags : tags.slice(0, 12)

  const handleTagClick = useCallback(
    (tagName: string) => {
      onTagChange(tagName === activeTag ? '' : tagName)
    },
    [activeTag, onTagChange]
  )

  return (
    <div className="tag-container" ref={containerRef}>
      <style>{`
        .tag-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 12px 0;
          align-items: center;
        }
        .tag-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          background-color: var(--bg-color-secondary);
          border: 1px solid var(--border-color-primary);
          border-radius: 16px;
          font-size: 13px;
          color: var(--text-color-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .tag-item:hover {
          background-color: var(--bg-color-tertiary);
          color: var(--text-color-primary);
        }
        .tag-item.active {
          background-color: var(--primary-color);
          border-color: var(--primary-color);
          color: #fff;
        }
        .tag-item .tag-count {
          font-size: 11px;
          opacity: 0.7;
        }
        .tag-show-more {
          padding: 4px 12px;
          font-size: 13px;
          color: var(--text-color-tag);
          cursor: pointer;
          background: none;
          border: none;
          white-space: nowrap;
        }
        .tag-show-more:hover {
          opacity: 0.8;
        }
      `}</style>
      {loading ? (
        <div style={{ color: 'var(--text-color-tertiary)', fontSize: 13 }}>加载标签中...</div>
      ) : tags.length === 0 ? null : (
        <>
          <button
            key="all-tag"
            className={`tag-item ${activeTag === '' ? 'active' : ''}`}
            onClick={() => onTagChange('')}
          >
            全部
          </button>
          {displayTags.map((tag) => (
            <button
              key={tag.id || tag.name}
              className={`tag-item ${activeTag === tag.name ? 'active' : ''}`}
              onClick={() => handleTagClick(tag.name)}
            >
              {tag.name}
              {tag.use_count !== undefined && (
                <span className="tag-count">{tag.use_count}</span>
              )}
            </button>
          ))}
          {tags.length > 12 && !showAll && (
            <button className="tag-show-more" onClick={() => setShowAll(true)}>
              +{tags.length - 12} 更多
            </button>
          )}
          {showAll && tags.length > 12 && (
            <button className="tag-show-more" onClick={() => setShowAll(false)}>
              收起
            </button>
          )}
        </>
      )}
    </div>
  )
}
