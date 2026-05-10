import { useEffect } from 'react'

/**
 * ESC键关闭 Hook
 * 用法：useEscapeKey(() => closeModal())
 * 当按下ESC键时，会调用传入的函数
 *
 * 仅在没有焦点位于 input/textarea/contentEditable 元素上时触发
 */
export function useEscapeKey(handler: () => void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled || !handler || typeof handler !== 'function') {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // 检查焦点是否在输入元素上
        const activeElement = document.activeElement
        if (
          activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement ||
          (activeElement instanceof HTMLElement && activeElement.isContentEditable)
        ) {
          return
        }

        event.preventDefault()
        event.stopPropagation()
        handler()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handler, enabled])
}
