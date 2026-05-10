import { useState, useEffect, useCallback, useMemo } from 'react'
import { X } from 'lucide-react'
import request from '@/lib/request'
import clsx from 'clsx'

interface TagItem {
  id: number | string
  name: string
  use_count?: number
}

interface TagSelectorProps {
  value?: string[]
  maxTags?: number
  onChange?: (tags: string[]) => void
  className?: string
}

export function TagSelector({
  value = [],
  maxTags = 10,
  onChange,
  className,
}: TagSelectorProps) {
  const [tagInput, setTagInput] = useState('')
  const [allTags, setAllTags] = useState<TagItem[]>([])
  const [hotTags, setHotTags] = useState<TagItem[]>([])
  const [loading, setLoading] = useState(false)

  const selectedTags = useMemo(() => {
    return Array.isArray(value) ? value : []
  }, [value])

  const filteredSuggestions = useMemo(() => {
    if (!tagInput.trim()) return []
    const input = tagInput.toLowerCase()
    return allTags
      .filter(
        (tag) =>
          tag.name.toLowerCase().includes(input) && !isTagSelected(tag)
      )
      .slice(0, 10)
  }, [tagInput, allTags, selectedTags])

  const isInputDisabled = selectedTags.length >= maxTags

  const isAddButtonDisabled = useMemo(() => {
    const input = tagInput.trim()
    return (
      !input ||
      selectedTags.length >= maxTags ||
      selectedTags.includes(input)
    )
  }, [tagInput, selectedTags, maxTags])

  // Load all tags
  useEffect(() => {
    loadAllTags()
    loadHotTags()
  }, [])

  async function loadAllTags() {
    try {
      setLoading(true)
      const response = await request.get('/tags')
      if ((response as any).success) {
        setAllTags((response as any).data)
      }
    } catch (error) {
      console.error('获取标签列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadHotTags() {
    try {
      const response = await request.get('/tags/hot?limit=5')
      if ((response as any).success) {
        setHotTags((response as any).data)
      }
    } catch (error) {
      console.error('获取热门标签失败:', error)
    }
  }

  function isTagSelected(tag: TagItem): boolean {
    return selectedTags.includes(tag.name)
  }

  const emitChange = useCallback(
    (newTags: string[]) => {
      onChange?.(newTags)
    },
    [onChange]
  )

  const addTag = useCallback(() => {
    const input = tagInput.trim()
    if (!input) return

    if (selectedTags.length >= maxTags) {
      console.warn(`最多只能选择${maxTags}个标签`)
      return
    }

    if (selectedTags.includes(input)) {
      setTagInput('')
      return
    }

    emitChange([...selectedTags, input])
    setTagInput('')
  }, [tagInput, selectedTags, maxTags, emitChange])

  const removeTag = useCallback(
    (tagToRemove: string) => {
      emitChange(selectedTags.filter((tag) => tag !== tagToRemove))
    },
    [selectedTags, emitChange]
  )

  const selectSuggestion = useCallback(
    (tag: TagItem) => {
      if (isTagSelected(tag)) return

      if (selectedTags.length >= maxTags) {
        alert(`最多只能选择${maxTags}个标签`)
        return
      }

      emitChange([...selectedTags, tag.name])
      setTagInput('')
    },
    [selectedTags, maxTags, emitChange]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        addTag()
      }
    },
    [addTag]
  )

  return (
    <div className={clsx('tag-selector', className)}>
      {/* Input area */}
      <div className="tag-input-container">
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className={clsx('tag-input', { 'input-disabled': isInputDisabled })}
          placeholder="输入标签名称，按回车添加"
          maxLength={8}
          disabled={isInputDisabled}
        />
        <button
          type="button"
          onClick={addTag}
          className="add-tag-btn"
          disabled={isAddButtonDisabled}
        >
          添加
        </button>
      </div>

      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="selected-tags">
          <div className="selected-tags-header">
            <span>已选标签 ({selectedTags.length}/{maxTags})</span>
          </div>
          <div className="tags-list">
            {selectedTags.map((tag, index) => (
              <div key={index} className="tag-item selected">
                <span className="tag-name">{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="remove-tag-btn"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {filteredSuggestions.length > 0 && (
        <div className="tag-suggestions">
          <div className="suggestions-header">标签建议</div>
          <div className="suggestions-list">
            {filteredSuggestions.map((tag) => (
              <div
                key={tag.id}
                onClick={() => selectSuggestion(tag)}
                className={clsx('tag-item suggestion', {
                  disabled: isTagSelected(tag),
                })}
              >
                <span className="tag-name">{tag.name}</span>
                <span className="tag-usage">{tag.use_count || 0}次使用</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hot tags */}
      {hotTags.length > 0 && (
        <div className="hot-tags">
          <div className="hot-tags-header">热门标签</div>
          <div className="tags-list">
            {hotTags.map((tag) => (
              <div
                key={tag.id}
                onClick={() => selectSuggestion(tag)}
                className={clsx('tag-item hot', {
                  disabled: isTagSelected(tag),
                })}
              >
                <span className="tag-name">{tag.name}</span>
                <span className="tag-usage">{tag.use_count || 0}次</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .tag-selector {
          width: 100%;
        }
        .tag-input-container {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          max-width: 100%;
        }
        .tag-input {
          flex: 1;
          max-width: 300px;
          min-width: 200px;
          padding: 8px 12px;
          border: 1px solid var(--border-color-primary);
          border-radius: 4px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
          caret-color: var(--primary-color);
          background: var(--bg-color-primary);
          color: var(--text-color-primary);
        }
        .tag-input:focus {
          border-color: var(--primary-color);
        }
        .tag-input:disabled,
        .tag-input.input-disabled {
          background-color: var(--bg-color-secondary);
          color: var(--text-color-quaternary);
          cursor: not-allowed;
          opacity: 0.6;
        }
        .tag-input:disabled::placeholder,
        .tag-input.input-disabled::placeholder {
          color: var(--text-color-quaternary);
        }
        .add-tag-btn {
          padding: 8px 16px;
          background: var(--primary-color);
          color: var(--button-text-color);
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        .add-tag-btn:hover:not(:disabled) {
          background: var(--primary-color-dark);
        }
        .add-tag-btn:disabled {
          background: var(--text-color-quaternary);
          cursor: not-allowed;
          opacity: 0.6;
        }
        .selected-tags,
        .tag-suggestions,
        .hot-tags {
          margin-bottom: 16px;
        }
        .selected-tags-header,
        .suggestions-header,
        .hot-tags-header {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-color-primary);
          margin-bottom: 8px;
        }
        .tags-list,
        .suggestions-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .tag-item {
          display: flex;
          align-items: center;
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          user-select: none;
        }
        .tag-item.selected {
          background: var(--primary-color);
          color: var(--button-text-color);
          cursor: default;
        }
        .tag-item.suggestion {
          background: var(--bg-color-secondary);
          border: 1px solid var(--border-color-primary);
          color: var(--text-color-secondary);
        }
        .tag-item.suggestion:hover:not(.disabled) {
          border-color: var(--primary-color);
        }
        .tag-item.hot {
          background: var(--bg-color-secondary);
          border: 1px solid var(--border-color-primary);
          color: var(--text-color-tag);
        }
        .tag-item.hot:hover:not(.disabled) {
          border-color: var(--primary-color);
        }
        .tag-item.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .tag-name {
          flex: 1;
        }
        .tag-usage {
          font-size: 12px;
          opacity: 0.7;
          margin-left: 8px;
        }
        .remove-tag-btn {
          background: none;
          border: none;
          color: var(--button-text-color);
          cursor: pointer;
          padding: 2px;
          margin-left: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }
        .remove-tag-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  )
}
