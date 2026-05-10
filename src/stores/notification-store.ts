import { create } from 'zustand'
import { getUnreadNotificationCount, getUnreadNotificationCountByType, deleteNotification as deleteNotificationApi } from '@/lib/api/notification'

interface UnreadCountByType {
  comments: number
  likes: number
  collections: number
  follows: number
}

type NotificationType = keyof UnreadCountByType

interface NotificationState {
  unreadCount: number
  unreadCountByType: UnreadCountByType
  fetchUnreadCount: () => Promise<number>
  fetchUnreadCountByType: () => Promise<UnreadCountByType>
  decrementUnreadCount: () => void
  decrementUnreadCountByType: (type: NotificationType) => void
  clearUnreadCount: () => void
  resetUnreadCount: () => void
  deleteNotification: (notificationId: number) => Promise<{ success: boolean; message?: string }>
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  unreadCountByType: {
    comments: 0,
    likes: 0,
    collections: 0,
    follows: 0,
  },

  fetchUnreadCount: async () => {
    try {
      const response = await getUnreadNotificationCount()
      const count = response.count || 0
      set({ unreadCount: count })
      return count
    } catch (error) {
      console.error('获取未读通知数量失败:', error)
      set({ unreadCount: 0 })
      return 0
    }
  },

  fetchUnreadCountByType: async () => {
    try {
      const response = await getUnreadNotificationCountByType()
      const byType = {
        comments: response.comments || 0,
        likes: response.likes || 0,
        collections: response.collections || 0,
        follows: response.follows || 0,
      }
      set({
        unreadCountByType: byType,
        unreadCount: response.total || 0,
      })
      return byType
    } catch (error) {
      console.error('获取按类型的未读通知数量失败:', error)
      const zero = { comments: 0, likes: 0, collections: 0, follows: 0 }
      set({ unreadCountByType: zero })
      return zero
    }
  },

  decrementUnreadCount: () => {
    const { unreadCount } = get()
    if (unreadCount > 0) {
      set({ unreadCount: unreadCount - 1 })
    }
  },

  decrementUnreadCountByType: (type) => {
    const { unreadCountByType, unreadCount } = get()
    if (unreadCountByType[type] > 0) {
      set({
        unreadCountByType: {
          ...unreadCountByType,
          [type]: unreadCountByType[type] - 1,
        },
        unreadCount: unreadCount > 0 ? unreadCount - 1 : 0,
      })
    }
  },

  clearUnreadCount: () => {
    set({
      unreadCount: 0,
      unreadCountByType: {
        comments: 0,
        likes: 0,
        collections: 0,
        follows: 0,
      },
    })
  },

  resetUnreadCount: () => {
    set({
      unreadCount: 0,
      unreadCountByType: {
        comments: 0,
        likes: 0,
        collections: 0,
        follows: 0,
      },
    })
  },

  deleteNotification: async (notificationId: number) => {
    try {
      await deleteNotificationApi(notificationId)
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error?.message || '删除失败' }
    }
  },
}))
