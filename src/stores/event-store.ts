import { create } from 'zustand'

interface EventListenerEntry {
  eventName: string
  handler: EventListenerOrEventListenerObject
  target: EventTarget
}

// Module-level state — not reactive (doesn't trigger re-renders)
const eventListeners = new Map<string, EventListenerEntry>()

interface EventState {
  addEventListener: (
    eventName: string,
    handler: EventListenerOrEventListenerObject,
    target?: EventTarget,
  ) => string
  removeEventListener: (key: string) => void
  removeAllEventListeners: () => void
  dispatchEvent: (
    eventName: string,
    detail?: unknown,
    target?: EventTarget,
  ) => void
  triggerFloatingBtnReload: () => void
  triggerFloatingBtnReloadRequest: () => void
}

export const useEventStore = create<EventState>(() => ({
  addEventListener: (
    eventName: string,
    handler: EventListenerOrEventListenerObject,
    target: EventTarget = window,
  ) => {
    const key = `${eventName}_${Date.now()}_${Math.random()}`
    target.addEventListener(eventName, handler)

    eventListeners.set(key, {
      eventName,
      handler,
      target,
    })

    return key
  },

  removeEventListener: (key: string) => {
    const listener = eventListeners.get(key)
    if (listener) {
      listener.target.removeEventListener(listener.eventName, listener.handler)
      eventListeners.delete(key)
    }
  },

  removeAllEventListeners: () => {
    eventListeners.forEach((listener) => {
      listener.target.removeEventListener(listener.eventName, listener.handler)
    })
    eventListeners.clear()
  },

  dispatchEvent: (
    eventName: string,
    detail: unknown = null,
    target: EventTarget = window,
  ) => {
    const event =
      detail != null
        ? new CustomEvent(eventName, { detail })
        : new CustomEvent(eventName)
    target.dispatchEvent(event)
  },

  triggerFloatingBtnReload: () => {
    useEventStore.getState().dispatchEvent('floating-btn-reload')
  },

  triggerFloatingBtnReloadRequest: () => {
    useEventStore.getState().dispatchEvent('floating-btn-reload-request')
  },
}))
