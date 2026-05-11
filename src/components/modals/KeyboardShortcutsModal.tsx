import React, { useEffect, useCallback, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useKeyboardShortcutsStore } from '@/stores/keyboard-shortcuts-store'
import { useScrollLock } from '@/hooks/use-scroll-lock'

const shortcuts: { desc: string; keys: string[] }[] = [
  { desc: '上一张图片', keys: ['←'] },
  { desc: '下一张图片', keys: ['→'] },
  { desc: '关闭笔记', keys: ['Esc'] },
  { desc: '收藏', keys: ['S'] },
  { desc: '点赞', keys: ['D'] },
  { desc: '发送评论', keys: ['Ctrl', '+', 'Enter'] },
]

export function KeyboardShortcutsModal() {
  const showKeyboardShortcutsModal = useKeyboardShortcutsStore(
    (s) => s.showKeyboardShortcutsModal
  )
  const closeKeyboardShortcutsModal = useKeyboardShortcutsStore(
    (s) => s.closeKeyboardShortcutsModal
  )
  const [isAnimating, setIsAnimating] = useState(false)
  const { lock, unlock } = useScrollLock()

  useEffect(() => {
    if (showKeyboardShortcutsModal) {
      lock()
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true)
        })
      })
    } else {
      setIsAnimating(false)
    }
  }, [showKeyboardShortcutsModal, lock])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setIsAnimating(false)
        setTimeout(() => {
          unlock()
          closeKeyboardShortcutsModal()
        }, 200)
      }
    },
    [closeKeyboardShortcutsModal, unlock]
  )

  return (
    <Dialog.Root open={showKeyboardShortcutsModal} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={`shortcuts-modal-overlay ${isAnimating ? 'animating' : ''}`}
        />
        <Dialog.Content
          className={`shortcuts-modal ${isAnimating ? 'scale-in' : ''}`}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="shortcuts-header">
            <div className="header-content">
              <h1 className="shortcuts-title">键盘快捷键</h1>
            </div>
            <Dialog.Close asChild>
              <button className="close-btn">
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <div className="shortcuts-content">
            <div className="shortcuts-main">
              <div className="shortcuts-list">
                {shortcuts.map((item, index) => (
                  <div key={index} className="shortcut-item">
                    <span className="shortcut-desc">{item.desc}</span>
                    <div className="shortcut-keys">
                      {item.keys.map((key, ki) =>
                        key === '+' ? (
                          <span key={ki} className="plus">+</span>
                        ) : (
                          <kbd key={ki} className="shortcut-key">{key}</kbd>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      <style>{`
        .shortcuts-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--overlay-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .shortcuts-modal-overlay.animating {
          opacity: 1;
        }
        .shortcuts-modal {
          background: var(--bg-color-primary);
          border-radius: 16px;
          width: 400px;
          min-height: 70vh;
          position: relative;
          transform: scale(0.9);
          transition: transform 0.3s ease;
          box-shadow: 0 20px 40px var(--shadow-color);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .shortcuts-modal.scale-in {
          transform: scale(1);
        }
        .shortcuts-header {
          position: relative;
          background: var(--bg-color-primary);
          padding: 16px 32px;
          border-radius: 16px 16px 0 0;
          flex-shrink: 0;
          border-bottom: 1px solid var(--border-color-primary);
        }
        .header-content {
          text-align: center;
        }
        .close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 32px;
          height: 32px;
          border: none;
          background: var(--bg-color-secondary);
          color: var(--text-color-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 1;
          transition: all 0.3s ease;
        }
        .close-btn:hover {
          opacity: 0.8;
          transform: scale(1.1);
        }
        .shortcuts-content {
          flex: 1;
          overflow-y: auto;
          padding: 12px 24px;
        }
        .shortcuts-main {
          display: flex;
          flex-direction: column;
        }
        .shortcuts-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-color-primary);
          margin: 0;
        }
        .shortcuts-list {
          display: flex;
          flex-direction: column;
        }
        .shortcut-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid var(--border-color-primary);
        }
        .shortcut-item:last-child {
          border-bottom: none;
        }
        .shortcut-desc {
          font-size: 16px;
          color: var(--text-color-secondary);
          flex: 1;
          font-weight: 400;
        }
        .shortcut-keys {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .shortcut-key {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 24px;
          padding: 0 8px;
          background: var(--text-color-primary);
          border-radius: 5px;
          font-size: 15px;
          font-weight: 600;
          color: var(--bg-color-primary);
          font-family: inherit;
        }
        .plus {
          margin: 0 4px;
          color: var(--text-color-secondary);
          font-size: 15px;
        }
        @media (max-width: 768px) {
          .shortcuts-modal {
            width: 300px;
          }
        }
      `}</style>
    </Dialog.Root>
  )
}

export default KeyboardShortcutsModal
