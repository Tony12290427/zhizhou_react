import { useState, useEffect } from 'react'
import { Trash2, X, Check } from 'lucide-react'
import { useSearchHistoryStore } from '@/stores/search-history-store'

interface SearchDropdownProps {
  visible: boolean
  searchText: string
  onSearch: (keyword: string) => void
  onClose: () => void
  onEditModeChange: (isEditMode: boolean) => void
  onFocusSearch: () => void
}

export default function SearchDropdown({
  visible,
  onSearch,
  onClose,
  onEditModeChange,
  onFocusSearch,
}: SearchDropdownProps) {
  const searchHistoryStore = useSearchHistoryStore()
  const [isEditMode, setIsEditMode] = useState(false)
  const recentSearches = searchHistoryStore.getRecentSearches()

  // Notify parent of edit mode changes
  useEffect(() => {
    onEditModeChange(isEditMode)
  }, [isEditMode, onEditModeChange])

  const handleHistoryClick = (keyword: string) => {
    if (!isEditMode) {
      onSearch(keyword)
    }
  }

  const enterEditMode = () => {
    setIsEditMode(true)
  }

  const exitEditMode = () => {
    setIsEditMode(false)
    onFocusSearch()
  }

  const handleDeleteHistory = (keyword: string, e: React.MouseEvent) => {
    e.stopPropagation()
    searchHistoryStore.removeSearchRecord(keyword)

    if (recentSearches.length <= 1) {
      setIsEditMode(false)
      onClose()
    }
  }

  const handleClearAll = () => {
    searchHistoryStore.clearSearchHistory()
    setIsEditMode(false)
  }

  if (!visible) return null

  return (
    <div className="search-dropdown">
      <div className="dropdown-content">
        {recentSearches.length > 0 && (
          <div className="history-header">
            <span className="history-title">历史记录</span>
            <div className="header-actions">
              {!isEditMode ? (
                <span className="action-btn icon-only-btn" onClick={enterEditMode}>
                  <Trash2 size={16} />
                </span>
              ) : (
                <>
                  <span className="action-btn" onClick={handleClearAll}>
                    <Trash2 size={16} />
                    <span className="action-text">清空</span>
                  </span>
                  <span className="action-btn" onClick={exitEditMode}>
                    <Check size={16} />
                    <span className="action-text">完成</span>
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {recentSearches.length > 0 ? (
          <div className="history-list">
            {recentSearches.map((keyword) => (
              <div
                key={keyword}
                className={`history-tag${isEditMode ? ' edit-mode' : ''}`}
                onClick={() => handleHistoryClick(keyword)}
              >
                <span className="history-text">{keyword}</span>
                {isEditMode && (
                  <span
                    className="delete-btn"
                    onClick={(e) => handleDeleteHistory(keyword, e)}
                  >
                    <X size={12} />
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-history">
            <span className="no-history-text">暂无搜索记录</span>
          </div>
        )}
      </div>

      <style>{`
        .search-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: var(--bg-color-primary);
          border: 1px solid var(--border-color-primary);
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          z-index: 1001;
          margin-top: 8px;
          max-height: 300px;
          overflow-y: auto;
        }

        .dropdown-content {
          padding: 16px;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
        }

        .history-title {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-color-tertiary);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 13px;
          color: var(--text-color-secondary);
        }

        .action-text {
          font-size: 13px;
          color: var(--text-color-secondary);
        }

        .action-btn:hover,
        .action-btn:hover .action-text {
          color: var(--text-color-primary);
        }

        .icon-only-btn {
          padding: 4px;
          width: 24px;
          height: 24px;
          justify-content: center;
        }

        .history-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .history-tag {
          display: inline-flex;
          align-items: center;
          padding: 6px 12px;
          background: var(--bg-color-secondary);
          border-radius: 999px;
          cursor: pointer;
          max-width: 200px;
          position: relative;
        }

        .history-tag.edit-mode {
          background: transparent;
          border: 1px solid var(--border-color-secondary);
          padding-right: 32px;
        }

        .history-tag.edit-mode:hover {
          color: var(--text-color-primary);
        }

        .delete-btn {
          position: absolute;
          right: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          color: var(--text-color-secondary);
          cursor: pointer;
          border-radius: 50%;
        }

        .delete-btn:hover {
          color: var(--text-color-primary);
          background-color: var(--bg-color-secondary);
        }

        .history-text {
          font-size: 13px;
          color: var(--text-color-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .history-text:hover {
          color: var(--text-color-primary);
        }

        .no-history {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 24px 12px;
        }

        .no-history-text {
          font-size: 14px;
          color: var(--text-color-secondary);
        }

        /* Scrollbar styles */
        .search-dropdown::-webkit-scrollbar {
          width: 4px;
        }

        .search-dropdown::-webkit-scrollbar-track {
          background: transparent;
        }

        .search-dropdown::-webkit-scrollbar-thumb {
          background: var(--border-color-secondary);
          border-radius: 2px;
        }

        .search-dropdown::-webkit-scrollbar-thumb:hover {
          background: var(--border-color-primary);
        }
      `}</style>
    </div>
  )
}
