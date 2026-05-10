import { useEffect } from 'react'
import { eventBus } from '@/utils/eventBus'

/**
 * 事件总线 Hook
 * 用法：useEventBus('user_liked_post', (data) => { ... })
 *
 * 在组件挂载时订阅事件，卸载时自动取消订阅
 */
export function useEventBus(eventName: string, handler: (...args: any[]) => void) {
  useEffect(() => {
    if (!eventName || !handler || typeof handler !== 'function') {
      return
    }

    eventBus.on(eventName, handler)

    return () => {
      eventBus.off(eventName, handler)
    }
  }, [eventName, handler])
}
