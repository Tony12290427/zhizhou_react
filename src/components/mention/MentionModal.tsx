import { useState, useEffect, useCallback, useRef } from 'react'
import { searchUsers } from '@/lib/api/user'
import { createPortal } from 'react-dom'

interface MentionModalProps {
  query: string
  onSelect: (user: { id: number; nickname: string; avatar: string; user_id: string }) => void
  onClose: () => void
  position?: { top: number; left: number }
}

export default function MentionModal({ query, onSelect, onClose, position }: MentionModalProps) {
  const [users, setUsers] = useState<Array<{ id: number; nickname: string; avatar: string; user_id: string }>>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!query) {
      setUsers([])
      return
    }

    let cancelled = false
    setLoading(true)

    searchUsers(query, { limit: 10 })
      .then((res: any) => {
        if (cancelled) return
        const data = res?.data?.users || res?.data || []
        setUsers(Array.isArray(data) ? data : [])
        setSelectedIndex(0)
      })
      .catch(() => {
        if (!cancelled) setUsers([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [query])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % Math.max(users.length, 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + users.length) % Math.max(users.length, 1))
          break
        case 'Enter':
          e.preventDefault()
          if (users[selectedIndex]) {
            onSelect(users[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown as any)
    return () => document.removeEventListener('keydown', handleKeyDown as any)
  }, [users, selectedIndex, onSelect, onClose])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  if (!query && users.length === 0) return null

  const style: React.CSSProperties = {
    position: 'fixed',
    zIndex: 10000,
    maxHeight: '300px',
    overflowY: 'auto',
    ...(position || { top: '50%', left: '50%' }),
  }

  return createPortal(
    <div ref={modalRef} style={style} className="mention-modal">
      <style>{`
        .mention-modal {
          background: var(--bg-color-primary);
          border: 1px solid var(--border-color-primary);
          border-radius: 8px;
          box-shadow: 0 4px 20px var(--shadow-color);
          min-width: 240px;
          max-width: 320px;
        }
        .mention-modal-header {
          padding: 8px 12px;
          font-size: 12px;
          color: var(--text-color-tertiary);
          border-bottom: 1px solid var(--border-color-secondary);
        }
        .mention-user-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .mention-user-item:hover, .mention-user-item.selected {
          background-color: var(--bg-color-secondary);
        }
        .mention-user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
        }
        .mention-user-name {
          font-size: 14px;
          color: var(--text-color-primary);
        }
        .mention-user-id {
          font-size: 12px;
          color: var(--text-color-tertiary);
        }
        .mention-loading, .mention-empty {
          padding: 16px;
          text-align: center;
          color: var(--text-color-tertiary);
          font-size: 13px;
        }
      `}</style>
      {loading ? (
        <div className="mention-loading">搜索中...</div>
      ) : users.length === 0 ? (
        <div className="mention-empty">未找到用户</div>
      ) : (
        <>
          <div className="mention-modal-header">选择用户</div>
          {users.map((user, index) => (
            <div
              key={user.id}
              className={`mention-user-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => onSelect(user)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <img
                src={user.avatar || '/avatar.png'}
                alt={user.nickname}
                className="mention-user-avatar"
                onError={(e) => { (e.target as HTMLImageElement).src = '/avatar.png' }}
              />
              <div>
                <div className="mention-user-name">{user.nickname}</div>
                <div className="mention-user-id">@{user.user_id}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>,
    document.body
  )
}
