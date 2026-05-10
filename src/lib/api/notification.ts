import request from '@/lib/request'

// zhizhou_be notifications — simplified (no per-type filtering, no individual mark-read, no deletion)
// GET /notifications?offset=&limit=  → unified notification list
// GET /notifications/unread-count      → unread count
// POST /notifications/read-all         → mark all read

export const getCommentNotifications = (params: Record<string, unknown> = {}) => {
  return request.get('/notifications', { params })
}

export const getLikeNotifications = (params: Record<string, unknown> = {}) => {
  return request.get('/notifications', { params })
}

export const getFollowNotifications = (params: Record<string, unknown> = {}) => {
  return request.get('/notifications', { params })
}

export const getCollectionNotifications = (params: Record<string, unknown> = {}) => {
  return request.get('/notifications', { params })
}

export async function markNotificationAsRead(_notificationId: number) {
  // zhizhou_be has no individual mark-read; silently succeed
  return { success: true }
}

export async function markAllNotificationsAsRead() {
  try {
    await request.post('/notifications/read-all')
    return { success: true }
  } catch (error) {
    console.error('Failed to mark all notifications read:', error)
    throw error
  }
}

export async function getUnreadNotificationCount() {
  try {
    const data: any = await request.get('/notifications/unread-count')
    return { count: data?.count ?? data ?? 0 }
  } catch (error) {
    console.error('Failed to get unread count:', error)
    return { count: 0 }
  }
}

export async function getUnreadNotificationCountByType() {
  // zhizhou_be has no per-type unread count
  const { count } = await getUnreadNotificationCount()
  return { comments: 0, likes: 0, collections: 0, follows: 0, total: count }
}

export async function deleteNotification(notificationId: number) {
  try {
    await request.delete(`/notifications/${notificationId}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error?.message || '删除失败' }
  }
}
