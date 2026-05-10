import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { postApi } from '@/lib/api/post'
import { eventBus, EVENT_TYPES } from '@/utils/eventBus'

interface PostCollectState {
  collected: boolean
  collectCount: number
}

interface CollectState {
  postCollectStates: Map<number, PostCollectState>
  updatePostCollectState: (postId: number, collected: boolean, collectCount: number) => void
  getPostCollectState: (postId: number) => PostCollectState
  togglePostCollect: (
    postId: number,
    currentCollected: boolean,
    currentCollectCount: number
  ) => Promise<{ success: boolean; collected?: boolean; collectCount?: number; error?: string }>
  initPostCollectState: (postId: number, collected: boolean, collectCount: number) => void
  initPostsCollectStates: (
    posts: Array<{ id: number; collected?: boolean; collectCount?: number }>
  ) => void
}

export const useCollectStore = create<CollectState>()(
  immer((set, get) => ({
    postCollectStates: new Map(),

    updatePostCollectState: (postId, collected, collectCount) => {
      set((state) => {
        state.postCollectStates.set(postId, { collected, collectCount })
      })
    },

    getPostCollectState: (postId) => {
      return get().postCollectStates.get(postId) || { collected: false, collectCount: 0 }
    },

    togglePostCollect: async (postId, currentCollected, currentCollectCount) => {
      const willBeCollected = !currentCollected
      const newCollectCount = currentCollected
        ? currentCollectCount - 1
        : currentCollectCount + 1

      // Optimistic update
      set((state) => {
        state.postCollectStates.set(postId, {
          collected: willBeCollected,
          collectCount: newCollectCount,
        })
      })

      try {
        if (willBeCollected) {
          await postApi.collectPost(postId)
        } else {
          await postApi.uncollectPost(postId)
        }

        return { success: true, collected: willBeCollected, collectCount: newCollectCount }
      } catch (error: any) {
        console.error('收藏操作失败:', error)
        // Rollback on failure
        set((state) => {
          state.postCollectStates.set(postId, {
            collected: currentCollected,
            collectCount: currentCollectCount,
          })
        })
        return { success: false, error: error.message }
      } finally {
        if (willBeCollected) {
          eventBus.emit(EVENT_TYPES.USER_COLLECTED_POST, {
            postId,
            collected: willBeCollected,
            collectCount: newCollectCount,
          })
        } else {
          eventBus.emit(EVENT_TYPES.USER_UNCOLLECTED_POST, {
            postId,
            collected: willBeCollected,
            collectCount: newCollectCount,
          })
        }
      }
    },

    initPostCollectState: (postId, collected, collectCount) => {
      set((state) => {
        state.postCollectStates.set(postId, { collected, collectCount })
      })
    },

    initPostsCollectStates: (posts) => {
      set((state) => {
        posts.forEach((post) => {
          state.postCollectStates.set(post.id, {
            collected: post.collected || false,
            collectCount: post.collectCount || 0,
          })
        })
      })
    },
  }))
)
