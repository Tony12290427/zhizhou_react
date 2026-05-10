import { useEffect, RefObject } from 'react'

/**
 * 点击外部区域关闭模态框的 Hook
 * 用法：useClickOutside(ref, () => closeModal())
 *
 * 功能：
 * 1. 监听 document 上的点击事件，当点击目标是 ref 元素外部时触发回调
 * 2. 自动处理事件的绑定和解绑
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  handler: () => void,
) {
  useEffect(() => {
    if (!handler || typeof handler !== 'function') {
      return
    }

    // Use mousedown (not click) to avoid race with the open-trigger click event.
    // The card click that opens the modal fires "click" → bubbles to document →
    // the outside-check fires and finds the card element outside the still-mounting
    // modal, immediately closing it. mousedown fires before click and avoids this.
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler()
      }
    }

    document.addEventListener('mousedown', handleClick)

    return () => {
      document.removeEventListener('mousedown', handleClick)
    }
  }, [ref, handler])
}
