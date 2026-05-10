import request from '@/lib/request'
import apiConfig from '@/config/api'

// ============================================================================
// Helpers
// ============================================================================

/** Read refresh token from localStorage so logout / refresh can send it. */
function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken')
}

/** Read admin refresh token from localStorage so admin logout / refresh can send it. */
function getAdminRefreshToken(): string | null {
  return localStorage.getItem('adminRefreshToken')
}

/**
 * Upload a File via zhizhou_be OSS presigned URL.
 * 1. POST /storage/presign  →  { url, publicUrl }
 * 2. PUT file to presigned url
 * 3. Returns the final public URL
 */
async function presignUpload(file: File): Promise<{ url: string; originalName: string; size: number }> {
  const presign: any = await request.post('/storage/presign', {
    filename: file.name,
    contentType: file.type,
  })

  const uploadUrl: string = presign.url || presign.uploadUrl
  if (!uploadUrl) {
    throw new Error('No presigned upload URL returned from /storage/presign')
  }

  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  })

  const finalUrl = presign.publicUrl || presign.fileUrl || uploadUrl.split('?')[0] || ''
  return { url: finalUrl, originalName: file.name, size: file.size }
}

/** Standard pagination: page/limit → page/size (knowposts) or offset/limit (relations/comments). */
function pageToOffset(page: number, limit: number): { offset: number; limit: number } {
  return { offset: (page - 1) * limit, limit }
}

// ============================================================================
// User API
// ============================================================================

export const userApi = {
  /** Public profile */
  getUserInfo(userId: number) {
    return request.get(`/profile/${userId}`)
  },

  /** Personality tags */
  getUserPersonalityTags(userId: number) {
    return request.get(`/profile/${userId}/tags`)
  },

  /** Update user info — not available in zhizhou_be */
  updateUserInfo(_userId: number, _data: Record<string, unknown>) {
    return Promise.reject({ success: false, message: 'Not available in zhizhou_be' })
  },

  followUser(userId: number) {
    return request.post('/relation/follow', null, { params: { toUserId: userId } })
  },

  unfollowUser(userId: number) {
    return request.post('/relation/unfollow', null, { params: { toUserId: userId } })
  },

  searchUsers(keyword: string, params: Record<string, unknown> = {}) {
    return request.get('/search', { params: { keyword, type: 'users', ...params } })
  },

  /** Mutual follows — not available in zhizhou_be */
  getMutualFollows(_userId: number, _params: Record<string, unknown> = {}) {
    return Promise.reject({ success: false, message: 'Not available in zhizhou_be' })
  },

  getFollowing(userId: number, params: Record<string, unknown> = {}) {
    const { page, limit, ...rest } = params as any
    const mapped: Record<string, unknown> = { userId, ...rest }
    if (page && limit) {
      const { offset } = pageToOffset(page, limit)
      mapped.offset = offset
      mapped.limit = limit
    }
    if (limit !== undefined && !page) mapped.limit = limit
    return request.get('/relation/following', { params: mapped })
  },

  getFollowers(userId: number, params: Record<string, unknown> = {}) {
    const { page, limit, ...rest } = params as any
    const mapped: Record<string, unknown> = { userId, ...rest }
    if (page && limit) {
      const { offset } = pageToOffset(page, limit)
      mapped.offset = offset
      mapped.limit = limit
    }
    if (limit !== undefined && !page) mapped.limit = limit
    return request.get('/relation/followers', { params: mapped })
  },

  getFollowStatus(userId: number) {
    return request.get('/relation/status', { params: { toUserId: userId } })
  },

  getUserStats(userId: number) {
    return request.get(`/counter/user/${userId}`)
  },

  changePassword(_userId: number, data: Record<string, unknown>) {
    return request.post('/auth/password/change', {
      oldPassword: data.oldPassword || (data as any).old_password,
      newPassword: data.newPassword || (data as any).new_password,
    })
  },

  deleteAccount(_userId: number) {
    return request.delete('/auth/account')
  },
}

// ============================================================================
// Auth API
// ============================================================================

export const authApi = {
  login(data: Record<string, unknown>) {
    return request.post('/auth/login', data)
  },

  register(data: Record<string, unknown>) {
    return request.post('/auth/register', data)
  },

  logout() {
    const refreshToken = getRefreshToken()
    return request.post('/auth/logout', { refreshToken: refreshToken || undefined })
  },

  refreshToken() {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      return Promise.reject({ success: false, message: 'No refresh token available' })
    }
    return request.post('/auth/token/refresh', { refreshToken })
  },

  getCurrentUser() {
    return request.get('/auth/me')
  },

  /** Send verification code (phone or email). Maps old `email` field to `target`. */
  sendEmailCode(data: Record<string, unknown>) {
    const target = (data as any).target || (data as any).email
    if (!target) {
      return Promise.reject({ success: false, message: 'target (phone or email) is required' })
    }
    return request.post('/auth/send-code', { target })
  },

  /** Email config — not available in zhizhou_be */
  getEmailConfig() {
    return Promise.resolve({ code: 200, data: { emailEnabled: false } })
  },

  /** Bind email */
  bindEmail(data: Record<string, unknown>) {
    return request.post('/auth/email/bind', { email: data.email, code: data.code })
  },

  /** Unbind email */
  unbindEmail() {
    return request.post('/auth/email/unbind')
  },

  /** Send password reset code */
  sendResetCode(data: Record<string, unknown>) {
    const target = (data as any).target || (data as any).email
    if (!target) return Promise.reject({ success: false, message: 'target is required' })
    return request.post('/auth/send-code', {
      identifierType: target.includes('@') ? 'EMAIL' : 'PHONE',
      identifier: target,
      scene: 'RESET_PASSWORD'
    })
  },

  /** Verify password reset code — not available in zhizhou_be */
  verifyResetCode(_data: Record<string, unknown>) {
    return Promise.reject({ success: false, message: 'Not available in zhizhou_be' })
  },

  /** Reset password */
  resetPassword(data: Record<string, unknown>) {
    const target = (data as any).target || (data as any).email || (data as any).phone
    return request.post('/auth/password/reset', {
      identifierType: (target || '').includes('@') ? 'EMAIL' : 'PHONE',
      identifier: target,
      code: data.code,
      newPassword: data.newPassword || (data as any).new_password,
    })
  },
}

// ============================================================================
// Post API
// ============================================================================

export const postApi = {
  /** Public feed with optional filters */
  getPosts(params: Record<string, unknown> = {}) {
    const { page, limit, size, category, keyword, tag, ...rest } = params as any
    const mapped: Record<string, unknown> = { ...rest }
    if (page !== undefined) mapped.page = page
    // Support both `limit` (old param name) and `size` (new param name)
    if (size !== undefined) mapped.size = size
    else if (limit !== undefined) mapped.size = limit
    if (category && category !== 'general') mapped.category = category
    if (keyword) mapped.keyword = keyword
    if (tag) mapped.tag = tag

    // Determine which feed endpoint to use based on params
    const type = (params as any).type
    if (type === 'following') {
      return request.get('/knowposts/following', { params: mapped })
    }
    if (type === 'mine' || type === 'posts') {
      return request.get('/knowposts/mine', { params: mapped })
    }
    if (type === 'liked' || type === 'likes') {
      return request.get('/knowposts/liked', { params: mapped })
    }
    if (type === 'faved' || type === 'collections' || type === 'fav') {
      return request.get('/knowposts/faved', { params: mapped })
    }
    return request.get('/knowposts/feed', { params: mapped })
  },

  getPostDetail(postId: number) {
    return request.get(`/knowposts/detail/${postId}`)
  },

  searchPosts(keyword: string, params: Record<string, unknown> = {}) {
    return request.get('/search', { params: { keyword, type: 'posts', ...params } })
  },

  /** Create post — not available in zhizhou_be */
  createPost(_data: Record<string, unknown>) {
    return Promise.reject({ success: false, message: 'Not available in zhizhou_be' })
  },

  /** Update post — not available in zhizhou_be */
  updatePost(_postId: number, _data: Record<string, unknown>) {
    return Promise.reject({ success: false, message: 'Not available in zhizhou_be' })
  },

  /** Delete post */
  deletePost(postId: number) {
    return request.delete(`/knowposts/${postId}`)
  },

  likePost(postId: number) {
    return request.post('/action/like', { entityType: 'POST', entityId: postId })
  },

  unlikePost(postId: number) {
    return request.post('/action/unlike', { entityType: 'POST', entityId: postId })
  },

  collectPost(postId: number) {
    return request.post('/action/fav', { entityType: 'POST', entityId: postId })
  },

  uncollectPost(postId: number) {
    return request.post('/action/unfav', { entityType: 'POST', entityId: postId })
  },

  /** Get posts by a specific user — use feed with userId filter (best-effort) */
  getUserPosts(userId: number, params: Record<string, unknown> = {}) {
    return request.get('/knowposts/feed', { params: { userId, ...params } })
  },

  /** User collections */
  getUserCollections(_userId: number, _params: Record<string, unknown> = {}) {
    return request.get('/collections')
  },
}

// ============================================================================
// Comment API
// ============================================================================

export const commentApi = {
  getComments(postId: number, params: Record<string, unknown> = {}) {
    if (!postId) {
      console.error('getComments: postId is required')
      return Promise.reject(new Error('postId is required'))
    }
    const { page, limit, offset: extOffset, ...rest } = params as any
    const mapped: Record<string, unknown> = { postId, ...rest }
    if (extOffset !== undefined) mapped.offset = extOffset
    else if (page && limit) {
      const { offset } = pageToOffset(page, limit)
      mapped.offset = offset
    }
    if (limit !== undefined) mapped.limit = limit

    return request.get('/comments', { params: mapped })
      .catch((error: Error) => {
        console.error(`获取笔记[${postId}]评论失败:`, error.message)
        return {
          success: false,
          data: null,
          message: error.message || '获取评论失败',
        }
      })
  },

  getReplies(commentId: number, params: Record<string, unknown> = {}) {
    if (!commentId) {
      console.error('getReplies: commentId is required')
      return Promise.reject(new Error('commentId is required'))
    }
    const { page, limit, offset: extOffset, ...rest } = params as any
    const mapped: Record<string, unknown> = { ...rest }
    if (extOffset !== undefined) mapped.offset = extOffset
    else if (page && limit) {
      const { offset } = pageToOffset(page, limit)
      mapped.offset = offset
    }
    if (limit !== undefined) mapped.limit = limit

    return request.get(`/comments/${commentId}/replies`, { params: mapped })
      .catch((error: Error) => {
        console.error(`获取评论[${commentId}]回复失败:`, error.message)
        return {
          success: false,
          data: null,
          message: error.message || '获取回复失败',
        }
      })
  },

  createComment(data: Record<string, unknown>) {
    // Map old field names (post_id, parent_id) to camelCase (postId, parentId)
    const payload: Record<string, unknown> = {}
    payload.postId = (data as any).post_id ?? (data as any).postId
    payload.content = (data as any).content
    const parentId = (data as any).parent_id ?? (data as any).parentId
    if (parentId !== undefined && parentId !== null) {
      payload.parentId = parentId
    }
    return request.post('/comments', payload)
  },

  /** Delete comment */
  deleteComment(commentId: number) {
    return request.delete(`/comments/${commentId}`)
  },

  likeComment(commentId: number) {
    return request.post('/action/like', { entityType: 'COMMENT', entityId: commentId })
  },

  unlikeComment(commentId: number) {
    return request.post('/action/unlike', { entityType: 'COMMENT', entityId: commentId })
  },
}

// ============================================================================
// Upload API
// ============================================================================

export const uploadApi = {
  /** Upload single image via OSS presigned URL */
  async uploadImage(file: File) {
    try {
      if (!file) throw new Error('请选择要上传的文件')
      if (!file.type.startsWith('image/')) throw new Error('请选择图片文件')
      if (file.size > apiConfig.upload.image.maxFileSize) {
        throw new Error(`图片大小不能超过${formatFileSize(apiConfig.upload.image.maxFileSize)}`)
      }

      const result = await presignUpload(file)
      return { success: true, data: result, message: '上传成功' }
    } catch (error: any) {
      return { success: false, data: null, message: error.message || '上传失败' }
    }
  },

  /** Batch upload images via OSS presigned URL */
  async uploadImages(files: File[]) {
    try {
      if (!files || files.length === 0) throw new Error('请选择要上传的文件')
      const maxCount = apiConfig.upload.image.maxCount
      if (files.length > maxCount) throw new Error(`最多只能上传${maxCount}张图片`)

      const uploaded: any[] = []
      const errors: Array<{ file: string; error: string }> = []

      for (const file of files) {
        try {
          if (file.size > apiConfig.upload.image.maxFileSize) {
            errors.push({ file: file.name, error: `文件大小超过${formatFileSize(apiConfig.upload.image.maxFileSize)}` })
            continue
          }
          const result = await presignUpload(file)
          uploaded.push(result)
        } catch (e: any) {
          errors.push({ file: file.name, error: e.message || '上传失败' })
        }
      }

      return {
        success: uploaded.length > 0,
        data: { uploaded, errors, total: files.length, successCount: uploaded.length, errorCount: errors.length },
        message: errors.length === 0 ? '所有图片上传成功' : `${uploaded.length}张上传成功，${errors.length}张失败`,
      }
    } catch (error: any) {
      return { success: false, data: null, message: error.message || '批量上传失败' }
    }
  },

  /** Upload video via OSS presigned URL with progress tracking */
  async uploadVideo(file: File, onProgress?: (progress: number) => void) {
    try {
      if (!file) throw new Error('请选择要上传的文件')
      const maxSize = (apiConfig.upload as any).video?.maxFileSize || 100 * 1024 * 1024
      if (file.size > maxSize) {
        throw new Error(`视频大小不能超过${formatFileSize(maxSize)}`)
      }

      const presign: any = await request.post('/storage/presign', {
        filename: file.name,
        contentType: file.type || 'video/mp4',
      })

      const uploadUrl: string = presign.url || presign.uploadUrl
      if (!uploadUrl) throw new Error('No presigned upload URL returned')

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4')

        xhr.upload.onprogress = (event: ProgressEvent) => {
          if (onProgress && event.total > 0) {
            const progress = Math.round((event.loaded * 100) / event.total)
            onProgress(progress)
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Upload failed with status ${xhr.status}`))
        }
        xhr.onerror = () => reject(new Error('Network error during video upload'))
        xhr.upload.onerror = () => reject(new Error('Upload interrupted'))
        xhr.send(file)
      })

      const fileUrl = presign.publicUrl || presign.fileUrl || uploadUrl.split('?')[0] || ''
      return { success: true, data: { url: fileUrl, originalName: file.name, size: file.size } }
    } catch (error: any) {
      return { success: false, message: error.message || '视频上传失败' }
    }
  },

  /** Upload cropped image (e.g. avatar) via OSS presigned URL */
  async uploadCroppedImage(blob: Blob) {
    try {
      if (!blob) throw new Error('请选择要上传的文件')
      const file = new File([blob], 'avatar.png', { type: blob.type || 'image/png' })
      const result = await presignUpload(file)
      return { success: true, data: result, message: '上传成功' }
    } catch (error: any) {
      return { success: false, data: null, message: error.message || '上传失败' }
    }
  },

  // Legacy aliases — point to the same presigned implementations
  get uploadToImageHost(): (file: File) => ReturnType<typeof uploadApi.uploadImage> {
    return this.uploadImage
  },
  get uploadMultipleToImageHost(): (files: File[]) => ReturnType<typeof uploadApi.uploadImages> {
    return this.uploadImages
  },

  // Client-side utilities (no server calls)
  validateImageFile,
  formatFileSize,
  createImagePreview,

  // Video utilities
  validateVideoFile,
  createVideoPreview,
  revokeVideoPreview,
}

// ============================================================================
// Image / Video utilities (client-side only)
// ============================================================================

export function validateImageFile(file: File, options: { maxSize?: number; allowedTypes?: string[] } = {}): { valid: boolean; error: string | null } {
  const { maxSize = apiConfig.upload.image.maxFileSize, allowedTypes = apiConfig.upload.image.allowedTypes } = options
  if (!file) return { valid: false, error: '请选择文件' }
  if (!file.type.startsWith('image/')) return { valid: false, error: '请选择图片文件' }
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return { valid: false, error: '不支持的文件类型' }
  }
  if (file.size > maxSize) {
    return { valid: false, error: `文件大小不能超过${formatFileSize(maxSize)}` }
  }
  return { valid: true, error: null }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('不是有效的图片文件'))
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target!.result as string)
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}

export function validateVideoFile(file: File): { valid: boolean; message: string } {
  const maxSize = (apiConfig.upload as any).video?.maxFileSize || 100 * 1024 * 1024
  const allowedTypes = (apiConfig.upload as any).video?.allowedTypes || [
    'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm',
  ]
  if (!file.type.startsWith('video/')) return { valid: false, message: '请选择视频文件' }
  if (!allowedTypes.includes(file.type)) return { valid: false, message: '不支持的视频格式' }
  if (file.size > maxSize) return { valid: false, message: `文件大小不能超过 ${formatFileSize(maxSize)}` }
  return { valid: true, message: '文件验证通过' }
}

export function createVideoPreview(file: File): string {
  return URL.createObjectURL(file)
}

export function revokeVideoPreview(url: string): void {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

// ============================================================================
// Notification API
// ============================================================================

export const notificationApi = {
  /** Unified notification list (zhizhou_be combines all types) */
  getNotifications(params: Record<string, unknown> = {}) {
    return request.get('/notifications', { params })
  },

  /** All type-specific methods map to the unified endpoint */
  getCommentNotifications(params: Record<string, unknown> = {}) {
    return request.get('/notifications', { params })
  },
  getLikeNotifications(params: Record<string, unknown> = {}) {
    return request.get('/notifications', { params })
  },
  getFollowNotifications(params: Record<string, unknown> = {}) {
    return request.get('/notifications', { params })
  },
  getCollectionNotifications(params: Record<string, unknown> = {}) {
    return request.get('/notifications', { params })
  },

  /** Individual mark-as-read — not available in zhizhou_be */
  markAsRead(_notificationId: number) {
    return Promise.reject({ success: false, message: 'Individual mark-as-read not available; use markAllAsRead' })
  },

  markAllAsRead() {
    return request.post('/notifications/read-all')
  },

  getUnreadCount() {
    return request.get('/notifications/unread-count')
  },

  /** Unread count by type — not available in zhizhou_be (stub returns zeroes) */
  getUnreadCountByType() {
    return Promise.reject({ success: false, message: 'Not available in zhizhou_be; use getUnreadCount' })
  },

  /** Delete notification */
  deleteNotification(notificationId: number) {
    return request.delete(`/notifications/${notificationId}`)
  },
}

// ============================================================================
// Search API
// ============================================================================

export const searchApi = {
  search(params: Record<string, unknown> = {}) {
    return request.get('/search', { params })
  },

  searchPosts(keyword = '', tag = '', params: Record<string, unknown> = {}) {
    const query: Record<string, unknown> = { keyword, ...params }
    if (tag) query.tag = tag
    return request.get('/search', { params: query })
  },

  searchUsers(keyword = '', params: Record<string, unknown> = {}) {
    return request.get('/search', { params: { keyword, type: 'users', ...params } })
  },

  /** Autocomplete / suggest */
  suggest(prefix = '', size = 10) {
    return request.get('/search/suggest', { params: { prefix, size } })
  },

  /**
   * AI-powered search via Server-Sent Events.
   * Backend: GET /search/ai?q=keyword&topK=5
   * SSE stream: data: [HTML]... | data: [ARTICLES][...] | data: [DONE]
   * Calls onChunk with accumulated HTML as it arrives, onArticles with referenced
   * articles, and returns the final full HTML when the stream completes.
   */
  aiSearch: async (
    query: string,
    topK: number = 5,
    onChunk: (html: string) => void,
    onArticles: (articles: any[]) => void,
  ): Promise<string> => {
    const token = localStorage.getItem('token')
    const response = await fetch(
      `/api/v1/search/ai?q=${encodeURIComponent(query)}&topK=${topK}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    )

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let fullHtml = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue
          if (data.startsWith('[ARTICLES]')) {
            try {
              const articles = JSON.parse(data.slice(10))
              onArticles(articles)
            } catch { /* ignore parse errors */ }
          } else if (data.startsWith('[HTML]')) {
            const html = data.slice(6)
            fullHtml += html
            onChunk(fullHtml)
          } else {
            // Plain text chunk
            fullHtml += data
            onChunk(fullHtml)
          }
        }
      }
    }

    return fullHtml
  },
}

// ============================================================================
// Admin API — not available in zhizhou_be (all stubs)
// ============================================================================

const NA = <T = never>(): Promise<T> =>
  Promise.reject({ success: false, message: 'Not available in zhizhou_be' })

export const adminApi = {
  // Auth
  login: (data: Record<string, unknown>) => request.post('/admin/auth/login', data),
  getCurrentAdmin: () => request.get('/admin/auth/me'),
  logout: () => {
    const refreshToken = getAdminRefreshToken()
    return request.post('/admin/auth/logout', { refreshToken: refreshToken || undefined })
  },
  refreshToken: () => {
    const refreshToken = getAdminRefreshToken()
    if (!refreshToken) {
      return Promise.reject({ success: false, message: 'No admin refresh token available' })
    }
    return request.post('/admin/auth/refresh', { refreshToken })
  },

  // User Management
  getUsers: (params?: Record<string, unknown>) => request.get('/admin/users', { params }),
  createUser: NA, // backend needs more work
  updateUser: (id: number, data: Record<string, unknown>) => request.put(`/admin/users/${id}`, data),
  deleteUser: (id: number) => request.delete(`/admin/users/${id}`),
  batchDeleteUsers: (ids: number[]) => request.post('/admin/users/batch-delete', { ids }),
  getUserDetail: (id: number) => request.get(`/admin/users/${id}`),

  // Post Management
  getPosts: (params?: Record<string, unknown>) => request.get('/admin/posts', { params }),
  createPost: NA,
  updatePost: (id: number, data: Record<string, unknown>) => request.put(`/admin/posts/${id}`, data),
  deletePost: (id: number) => request.delete(`/admin/posts/${id}`),
  batchDeletePosts: (ids: number[]) => request.post('/admin/posts/batch-delete', { ids }),
  getPostDetail: (id: number) => request.get(`/admin/posts/${id}`),
  auditPost: (id: number, action: string) => request.post(`/admin/posts/${id}/audit`, { action }),

  // Comment Management
  getComments: (params?: Record<string, unknown>) => request.get('/admin/comments', { params }),
  createComment: NA,
  updateComment: NA,
  deleteComment: (id: number) => request.delete(`/admin/comments/${id}`),
  batchDeleteComments: (ids: number[]) => request.post('/admin/comments/batch-delete', { ids }),
  getCommentDetail: NA,

  // Tag Management
  getTags: (params?: Record<string, unknown>) => request.get('/admin/tags', { params }),
  createTag: (data: Record<string, unknown>) => request.post('/admin/tags', data),
  updateTag: NA,
  deleteTag: (id: number) => request.delete(`/admin/tags/${id}`),
  batchDeleteTags: NA,
  getTagDetail: NA,

  // Like Management
  getLikes: NA, createLike: NA, updateLike: NA, deleteLike: NA, batchDeleteLikes: NA, getLikeDetail: NA,

  // Collection Management
  getCollections: (params?: Record<string, unknown>) => request.get('/admin/collections', { params }),
  createCollection: NA,
  updateCollection: NA,
  deleteCollection: (id: number) => request.delete(`/admin/collections/${id}`),
  batchDeleteCollections: (ids: number[]) => request.post('/admin/collections/batch-delete', { ids }),
  getCollectionDetail: NA,

  // Follow Management
  getFollows: (params?: Record<string, unknown>) => request.get('/admin/follows', { params }),
  createFollow: NA,
  updateFollow: NA,
  deleteFollow: (id: number) => request.delete(`/admin/follows/${id}`),
  batchDeleteFollows: (ids: number[]) => request.post('/admin/follows/batch-delete', { ids }),
  getFollowDetail: NA,

  // Notification Management
  getNotifications: (params?: Record<string, unknown>) => request.get('/admin/notifications', { params }),
  createNotification: (data: Record<string, unknown>) => request.post('/admin/notifications', data),
  updateNotification: NA,
  deleteNotification: (id: number) => request.delete(`/admin/notifications/${id}`),
  batchDeleteNotifications: (ids: number[]) => request.post('/admin/notifications/batch-delete', { ids }),
  getNotificationDetail: NA,

  // Session Management
  getSessions: (params?: Record<string, unknown>) => request.get('/admin/sessions', { params }),
  createSession: NA,
  updateSession: NA,
  deleteSession: (id: number) => request.delete(`/admin/sessions/${id}`),
  batchDeleteSessions: NA,
  getSessionDetail: NA,

  // Admin Session Management
  getAdminSessions: NA, createAdminSession: NA, updateAdminSession: NA, deleteAdminSession: NA, batchDeleteAdminSessions: NA, getAdminSessionDetail: NA,

  // Admin Management
  getAdmins: (params?: Record<string, unknown>) => request.get('/admin/admins', { params }),
  getAdminsAuth: NA,
  createAdmin: (data: Record<string, unknown>) => request.post('/admin/admins', data),
  createAdminAuth: NA,
  updateAdmin: NA,
  updateAdminAuth: NA,
  deleteAdmin: (id: number) => request.delete(`/admin/admins/${id}`),
  deleteAdminAuth: NA,
  batchDeleteAdmins: NA,
  batchDeleteAdminsAuth: NA,
  getAdminDetail: NA, getAdminDetailAuth: NA,

  getMonitorActivities: () => request.get('/admin/monitor/activities'),
}

// ============================================================================
// Categories API
// ============================================================================

export const categoryApi = {
  getCategories(_params: Record<string, unknown> = {}) {
    return Promise.reject({ success: false, message: 'Not available in zhizhou_be' })
  },
}

// ============================================================================
// Re-exports for backwards compatibility with individual module files
// ============================================================================

export { default as imageUploadApi } from './upload'
export { default as videoUploadApi } from './video'
