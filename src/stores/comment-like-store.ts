import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface CommentLikeEntry {
  liked: boolean
  likeCount: number
}

interface CommentApi {
  likeComment: (commentId: number) => Promise<void>
  unlikeComment: (commentId: number) => Promise<void>
}

// Default no-op API — override via setCommentApi() after store creation
let commentApi: CommentApi = {
  likeComment: () => Promise.resolve(),
  unlikeComment: () => Promise.resolve(),
}

interface CommentLikeState {
  commentLikeStates: Record<number, CommentLikeEntry>
  updateCommentLikeState: (
    commentId: number,
    liked: boolean,
    likeCount: number,
  ) => void
  getCommentLikeState: (commentId: number) => CommentLikeEntry
  toggleCommentLike: (
    commentId: number,
    currentLiked: boolean,
    currentLikeCount: number,
  ) => Promise<{
    success: boolean
    liked?: boolean
    likeCount?: number
    error?: string
  }>
  initCommentLikeState: (
    commentId: number,
    liked: boolean,
    likeCount: number,
  ) => void
  initCommentsLikeStates: (
    comments: Array<{
      id: number
      isLiked?: boolean
      is_liked?: boolean
      likeCount?: number
      like_count?: number
      replies?: Array<{
        id: number
        isLiked?: boolean
        is_liked?: boolean
        likeCount?: number
        like_count?: number
      }>
    }>,
  ) => void
  setCommentApi: (api: CommentApi) => void
}

export const setCommentApi = (api: CommentApi) => {
  commentApi = api
}

export const useCommentLikeStore = create<CommentLikeState>()(
  immer((set, get) => ({
    commentLikeStates: {},

    updateCommentLikeState: (
      commentId: number,
      liked: boolean,
      likeCount: number,
    ) => {
      set((state) => {
        state.commentLikeStates[commentId] = { liked, likeCount }
      })
    },

    getCommentLikeState: (commentId: number) => {
      return (
        get().commentLikeStates[commentId] || { liked: false, likeCount: 0 }
      )
    },

    toggleCommentLike: async (
      commentId: number,
      currentLiked: boolean,
      currentLikeCount: number,
    ) => {
      const willBeLiked = !currentLiked
      const newLikeCount = currentLiked
        ? currentLikeCount - 1
        : currentLikeCount + 1

      // 先更新本地状态，提供即时反馈
      get().updateCommentLikeState(commentId, willBeLiked, newLikeCount)

      try {
        if (willBeLiked) {
          await commentApi.likeComment(commentId)
        } else {
          await commentApi.unlikeComment(commentId)
        }

        return { success: true, liked: willBeLiked, likeCount: newLikeCount }
      } catch (error: unknown) {
        console.error(`评论${commentId}点赞操作失败:`, error)

        // 恢复原始状态
        get().updateCommentLikeState(commentId, currentLiked, currentLikeCount)

        return {
          success: false,
          error:
            error instanceof Error ? error.message : '操作失败',
        }
      }
    },

    initCommentLikeState: (
      commentId: number,
      liked: boolean,
      likeCount: number,
    ) => {
      get().updateCommentLikeState(commentId, liked, likeCount)
    },

    initCommentsLikeStates: (comments) => {
      const initComment = (comment: {
        id: number
        isLiked?: boolean
        is_liked?: boolean
        likeCount?: number
        like_count?: number
        replies?: Array<{
          id: number
          isLiked?: boolean
          is_liked?: boolean
          likeCount?: number
          like_count?: number
        }>
      }) => {
        const liked =
          comment.isLiked !== undefined
            ? comment.isLiked
            : (comment.is_liked || false)
        const likeCount =
          comment.likeCount !== undefined
            ? comment.likeCount
            : (comment.like_count || 0)

        get().initCommentLikeState(comment.id, liked, likeCount)

        if (comment.replies && comment.replies.length > 0) {
          comment.replies.forEach((reply) => {
            const replyLiked =
              reply.isLiked !== undefined
                ? reply.isLiked
                : (reply.is_liked || false)
            const replyLikeCount =
              reply.likeCount !== undefined
                ? reply.likeCount
                : (reply.like_count || 0)
            get().initCommentLikeState(reply.id, replyLiked, replyLikeCount)
          })
        }
      }

      comments.forEach(initComment)
    },

    setCommentApi: (api: CommentApi) => {
      commentApi = api
    },
  })),
)
