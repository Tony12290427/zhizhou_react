import request from '@/lib/request'

export const userApi = {
  getUserInfo(userId: number | string) {
    return request.get(`/profile/${userId}`)
  },

  followUser(userId: number | string) {
    return request.post(`/relation/follow?toUserId=${userId}`)
  },

  unfollowUser(userId: number | string) {
    return request.post(`/relation/unfollow?toUserId=${userId}`)
  },

  getFollowStatus(userId: number | string) {
    return request.get(`/relation/status?toUserId=${userId}`)
  },

  getFollowing(userId: number | string, params?: Record<string, unknown>) {
    return request.get('/relation/following', { params: { userId, limit: 20, offset: 0, ...params } })
  },

  getFollowers(userId: number | string, params?: Record<string, unknown>) {
    return request.get('/relation/followers', { params: { userId, limit: 20, offset: 0, ...params } })
  },

  getMutualFollows(userId: number | string, params?: Record<string, unknown>) {
    // zhizhou_be doesn't have a dedicated mutual follows endpoint
    // Fallback: get following list and filter client-side
    return request.get('/relation/following', { params: { userId, limit: 100, offset: 0, ...params } })
  },

  searchUsers(keyword: string, params?: Record<string, unknown>) {
    // zhizhou_be search only returns posts; no dedicated user search
    return request.get('/search', { params: { keyword, type: 'users', ...params } })
  },

  getUserStats(userId: number | string) {
    return request.get(`/counter/user/${userId}`)
  },

  updateUserInfo(userId: number | string, data: Record<string, unknown>) {
    return request.patch('/profile', data)
  },

  getUserPersonalityTags(_userId: number | string) {
    return Promise.resolve({ data: {} })
  },

  changePassword(_userId: number | string, _data: { oldPassword: string; newPassword: string }) {
    return Promise.reject(new Error('Change password not available in zhizhou_be'))
  },

  deleteAccount(_userId: number | string) {
    return Promise.reject(new Error('Account deletion not available in zhizhou_be'))
  },
}

// Legacy exports for compatibility
export { userApi as default }
export const searchUsers = userApi.searchUsers
