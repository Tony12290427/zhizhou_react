import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { postApi } from '@/lib/api/post'
import { eventBus, EVENT_TYPES } from '@/utils/eventBus'

interface PostLikeState {
  liked: boolean
  likeCount: number
}

interface LikeState {
  postLikeStates: Map<number, PostLikeState>
  updatePostLikeState: (postId: number, liked: boolean, likeCount: number) => void
  getPostLikeState: (postId: number) => PostLikeState
  togglePostLike: (
    postId: number,
    currentLiked: boolean,
    currentLikeCount: number
  ) => Promise<{ success: boolean; liked?: boolean; likeCount?: number; error?: string }>
  initPostLikeState: (postId: number, liked: boolean, likeCount: number) => void
  initPostsLikeStates: (posts: Array<{ id: number; liked?: boolean; likeCount?: number }>) => void
}

export const useLikeStore = create<LikeState>()(
  immer((set, get) => ({
    postLikeStates: new Map(),

    updatePostLikeState: (postId, liked, likeCount) => {
      set((state) => {
        state.postLikeStates.set(postId, { liked, likeCount })
      })
    },

    getPostLikeState: (postId) => {
      return get().postLikeStates.get(postId) || { liked: false, likeCount: 0 }
    },

    togglePostLike: async (postId, currentLiked, currentLikeCount) => {
      const willBeLiked = !currentLiked
      const newLikeCount = willBeLiked ? currentLikeCount + 1 : currentLikeCount - 1

      // Optimistic update
      set((state) => {
        state.postLikeStates.set(postId, { liked: willBeLiked, likeCount: newLikeCount })
      })

      try {
        if (willBeLiked) {
          await postApi.likePost(postId)
        } else {
          await postApi.unlikePost(postId)
        }

        return { success: true, liked: willBeLiked, likeCount: newLikeCount }
      } catch (error: any) {
        console.error('点赞操作失败:', error)
        // Rollback on failure
        set((state) => {
          state.postLikeStates.set(postId, { liked: currentLiked, likeCount: currentLikeCount })
        })
        return { success: false, error: error.message }
      } finally {
        if (willBeLiked) {
          eventBus.emit(EVENT_TYPES.USER_LIKED_POST, { postId, liked: willBeLiked, likeCount: newLikeCount })
        } else {
          eventBus.emit(EVENT_TYPES.USER_UNLIKED_POST, { postId, liked: willBeLiked, likeCount: newLikeCount })
        }
      }
    },

    initPostLikeState: (postId, liked, likeCount) => {
      set((state) => {
        state.postLikeStates.set(postId, { liked, likeCount })
      })
    },

    initPostsLikeStates: (posts) => {
      set((state) => {
        posts.forEach((post) => {
          state.postLikeStates.set(post.id, {
            liked: post.liked || false,
            likeCount: post.likeCount || 0,
          })
        })
      })
    },
  }))
)
