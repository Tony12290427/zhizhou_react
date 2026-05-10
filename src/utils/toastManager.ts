export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastData {
  id: number
  message: string
  type: ToastType
  duration: number
}

class ToastManager {
  private toasts: ToastData[] = []
  private listeners: Set<(toasts: ToastData[]) => void> = new Set()
  private idCounter = 0

  subscribe(listener: (toasts: ToastData[]) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(): void {
    const snapshot = [...this.toasts]
    this.listeners.forEach((listener) => listener(snapshot))
  }

  show(message: string, type: ToastType = 'success', duration = 2000): void {
    // 同一时刻只显示一个：清空旧的
    this.toasts = []
    this.idCounter++
    const toast: ToastData = {
      id: this.idCounter,
      message,
      type,
      duration,
    }
    this.toasts.push(toast)
    this.emit()

    setTimeout(() => {
      this.remove(toast.id)
    }, duration + 300) // +300ms 等退场动画
  }

  remove(id: number): void {
    this.toasts = this.toasts.filter((t) => t.id !== id)
    this.emit()
  }

  success(message: string, duration?: number): void {
    this.show(message, 'success', duration)
  }

  error(message: string, duration?: number): void {
    this.show(message, 'error', duration)
  }

  info(message: string, duration?: number): void {
    this.show(message, 'info', duration)
  }

  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration)
  }

  clear(): void {
    this.toasts = []
    this.emit()
  }
}

export const toast = new ToastManager()
