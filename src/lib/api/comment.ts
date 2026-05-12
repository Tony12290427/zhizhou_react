import request from '@/lib/request'

export const commentApi = {
  async getComments(postId: number | string, params?: Record<string, unknown>) {
    const raw: any = await request.get('/comments', {
      params: { postId, offset: 0, limit: 20, ...params },
    })
    const items = raw?.items || []
    return {
      success: true,
      data: {
        comments: items.map((c: any) => ({
          id: c.id,
          user_id: c.userId,
          user_auto_id: c.userId,
          nickname: c.userNickname || '匿名用户',
          user_avatar: c.userAvatar || '',
          content: c.content,
          created_at: c.createdAt,
          parent_id: c.parentId || null,
          reply_count: c.replyCount || 0,
          like_count: 0,
          liked: false,
          deleted_at: c.deletedAt || c.deleted_at || null,
        })),
        pagination: { total: raw?.total || items.length, offset: raw?.offset || 0 },
      },
    }
  },

  async getReplies(commentId: number | string, params?: Record<string, unknown>) {
    const raw: any = await request.get(`/comments/${commentId}/replies`, {
      params: { offset: 0, limit: 10, ...params },
    })
    const items = raw?.items || []
    return {
      success: true,
      data: {
        comments: items.map((c: any) => ({
          id: c.id,
          user_id: c.userId,
          user_auto_id: c.userId,
          nickname: c.userNickname || '匿名用户',
          user_avatar: c.userAvatar || '',
          content: c.content,
          created_at: c.createdAt,
          parent_id: c.parentId || null,
          reply_count: c.replyCount || 0,
          like_count: 0,
          liked: false,
          deleted_at: c.deletedAt || c.deleted_at || null,
        })),
        pagination: { total: raw?.total || items.length },
      },
    }
  },

  async createComment(data: { postId?: number; post_id?: number; content: string; parentId?: number; parent_id?: number }) {
    // Normalize snake_case → camelCase for backend compatibility
    const payload = {
      postId: (data as any).postId ?? (data as any).post_id,
      content: data.content,
      parentId: (data as any).parentId ?? (data as any).parent_id ?? null,
    }
    const raw: any = await request.post('/comments', payload)
    return {
      success: true,
      data: {
        id: raw.id,
        user_id: raw.userId,
        nickname: raw.nickname || '匿名用户',
        user_avatar: raw.userAvatar || '',
        content: raw.content,
        created_at: raw.createdAt,
        parent_id: raw.parentId || null,
        reply_count: 0,
        like_count: 0,
        liked: false,
      },
    }
  },

  async deleteComment(commentId: number | string) {
    await request.delete(`/comments/${commentId}`)
    return { success: true }
  },
}
