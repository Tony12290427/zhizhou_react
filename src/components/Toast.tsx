import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { toast, type ToastData } from '@/utils/toastManager'

function ToastItem({ id, message }: Pick<ToastData, 'id' | 'message'>) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // 下一帧触发入场动画
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const handleTransitionEnd = useCallback(() => {
    if (!visible) {
      toast.remove(id)
    }
  }, [visible, id])

  return (
    <div
      className={`toast-item ${visible ? 'toast-enter' : 'toast-exit'}`}
      onTransitionEnd={handleTransitionEnd}
    >
      <span className="toast-text">{message}</span>
    </div>
  )
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  useEffect(() => {
    return toast.subscribe((snapshot) => {
      setToasts(snapshot)
    })
  }, [])

  if (toasts.length === 0) return null

  return createPortal(
    <div className="toast-container">
      {toasts.map((t) => (
        <ToastItem key={t.id} id={t.id} message={t.message} />
      ))}
    </div>,
    document.body
  )
}
