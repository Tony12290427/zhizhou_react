import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { commentApi } from '@/lib/api/comment'
import { formatTime } from '@/utils/timeFormat'

interface CommentUser {
  id: number
  user_id: string
  user_auto_id: number
  username: string
  avatar: string
  verified: number
  content: string
  time: string
  location: string
  likeCount: number
  isLiked: boolean
  parent_id: number | null
  replies: CommentUser[]
  reply_count: number
  isReply: boolean
  replyTo?: string
  deleted_at?: string | null
}

interface PostCommentData {
  comments: CommentUser[]
  loading: boolean
  loaded: boolean
  hasMore: boolean
  currentPage: number
  total: number
  sort: string
}

interface FetchCommentsParams {
  page?: number
  limit?: number
  loadMore?: boolean
  sort?: string
  silentLoad?: boolean
}

interface CommentState {
  postComments: Map<number, PostCommentData>
  fetchComments: (postId: number, params?: FetchCommentsParams) => Promise<CommentUser[]>
  addComment: (postId: number, comment: CommentUser) => void
  updateComments: (postId: number, newData: Partial<PostCommentData>) => void
  getComments: (postId: number) => PostCommentData
  clearComments: (postId?: number) => void
}

async function fetchAllReplies(
  commentId: number,
  allComments: CommentUser[],
  allReplies: CommentUser[]
): Promise<CommentUser[]> {
  try {
    const repliesResponse = await commentApi.getReplies(commentId)
    if (repliesResponse.success && repliesResponse.data?.comments) {
      const replies: CommentUser[] = (repliesResponse.data.comments || []).map((reply: any) => {
        let replyToUsername = '未知用户'

        const parentInReplies = repliesResponse.data.comments.find(
          (r: any) => r.id === reply.parent_id
        )
        if (parentInReplies) {
          replyToUsername = parentInReplies.nickname || '匿名用户'
        } else {
          const parentComment = allComments.find((c) => c.id === reply.parent_id)
          if (parentComment) {
            replyToUsername = parentComment.username || '匿名用户'
          } else {
            const parentReply = allReplies.find((r) => r.id === reply.parent_id)
            if (parentReply) {
              replyToUsername = parentReply.username || '匿名用户'
            }
          }
        }

        return {
          id: reply.id,
          user_id: reply.user_display_id || reply.user_id,
          user_auto_id: reply.user_auto_id || reply.user_id,
          username: reply.nickname || '匿名用户',
          avatar: reply.user_avatar || '',
          verified: reply.verified || 0,
          content: reply.content,
          time: formatTime(reply.created_at),
          location: reply.user_location || reply.location,
          likeCount: reply.like_count || 0,
          isLiked: reply.liked || false,
          parent_id: reply.parent_id,
          replyTo: replyToUsername,
          replies: [],
          isReply: true,
          reply_count: 0,
          deleted_at: reply.deleted_at || reply.deletedAt || null,
        }
      })

      const flatReplies = [...replies]

      for (const reply of replies) {
        const childReplies = await fetchAllReplies(reply.id, allComments, [
          ...allReplies,
          ...flatReplies,
        ])
        flatReplies.push(...childReplies)
      }

      return flatReplies
    }
  } catch (error) {
    console.error(`获取评论[${commentId}]的回复失败:`, error)
  }
  return []
}

export const useCommentStore = create<CommentState>()(
  immer((set, get) => ({
    postComments: new Map(),

    fetchComments: async (postId, params = {}) => {
      let { page = 1, limit = 5, loadMore = false, sort = 'desc', silentLoad = false } = params

      const currentData: PostCommentData = get().postComments.get(postId) || {
        comments: [],
        hasMore: true,
        currentPage: 0,
        total: 0,
        sort: 'desc',
        loading: false,
        loaded: false,
      }

      if (currentData.loading) {
        return currentData.comments
      }

      const sortChanged = currentData.sort !== sort
      if (sortChanged && loadMore) {
        loadMore = false
        page = 1
      }

      if (loadMore && !currentData.hasMore) {
        return currentData.comments
      }

      if (!silentLoad) {
        set((state) => {
          state.postComments.set(postId, {
            ...currentData,
            loading: true,
            loaded: false,
          })
        })
      }

      try {
        const apiParams: Record<string, unknown> = { ...params, page, limit }
        const response = await commentApi.getComments(postId, apiParams)

        if (!response) {
          console.error(`笔记[${postId}]评论获取失败，响应为空`)
          throw new Error('响应数据为空')
        }

        if (response.success && response.data?.comments) {
          const parentComments: CommentUser[] = (response.data.comments || []).map((comment: any) => ({
            id: comment.id,
            user_id: comment.user_display_id || comment.user_id,
            user_auto_id: comment.user_auto_id || comment.user_id,
            username: comment.nickname || '匿名用户',
            avatar: comment.user_avatar || '',
            verified: comment.verified || 0,
            content: comment.content,
            time: formatTime(comment.created_at),
            location: comment.user_location || comment.location,
            likeCount: comment.like_count || 0,
            isLiked: comment.liked || false,
            parent_id: comment.parent_id,
            replies: [],
            reply_count: comment.reply_count || 0,
            isReply: false,
            deleted_at: comment.deleted_at || comment.deletedAt || null,
          }))

          for (const comment of parentComments) {
            if (comment.reply_count > 0) {
              comment.replies = await fetchAllReplies(comment.id, parentComments, [])
            }
          }

          const hasMore = parentComments.length === limit
          const existingComments = loadMore ? currentData.comments : []
          const updatedComments = loadMore
            ? [...existingComments, ...parentComments]
            : parentComments
          const serverTotal = response.data.pagination ? response.data.pagination.total : 0

          set((state) => {
            state.postComments.set(postId, {
              comments: updatedComments,
              loading: false,
              loaded: true,
              total: serverTotal,
              hasMore,
              currentPage: page,
              sort,
            })
          })

          return updatedComments
        } else {
          console.error(`笔记[${postId}]评论获取失败，响应结构:`, {
            success: response.success,
            hasData: !!response.data,
          })

          set((state) => {
            state.postComments.set(postId, {
              ...currentData,
              loading: false,
              loaded: false,
              comments: loadMore ? currentData.comments : [],
            })
          })

          return loadMore ? currentData.comments : []
        }
      } catch (error) {
        console.error(`获取笔记[${postId}]评论失败:`, error)
        set((state) => {
          state.postComments.set(postId, {
            ...get().postComments.get(postId) || currentData,
            loading: false,
            loaded: false,
            comments: [],
          })
        })
        return []
      }
    },

    addComment: (postId, comment) => {
      set((state) => {
        const currentData = state.postComments.get(postId) || {
          comments: [],
          loading: false,
          loaded: true,
          hasMore: true,
          currentPage: 0,
          total: 0,
          sort: 'desc',
        }
        state.postComments.set(postId, {
          ...currentData,
          comments: [comment, ...currentData.comments],
          total: (currentData.total || 0) + 1,
        })
      })
    },

    updateComments: (postId, newData) => {
      set((state) => {
        const currentData = state.postComments.get(postId) || {
          comments: [],
          loading: false,
          loaded: true,
          hasMore: true,
          currentPage: 0,
          total: 0,
          sort: 'desc',
        }
        state.postComments.set(postId, {
          ...currentData,
          ...newData,
        })
      })
    },

    getComments: (postId) => {
      return (
        get().postComments.get(postId) || {
          comments: [],
          loading: false,
          loaded: false,
          hasMore: true,
          currentPage: 0,
          total: 0,
          sort: 'desc',
        }
      )
    },

    clearComments: (postId) => {
      set((state) => {
        if (postId !== undefined) {
          state.postComments.delete(postId)
        } else {
          state.postComments.clear()
        }
      })
    },
  }))
)
