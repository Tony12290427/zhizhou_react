import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { userApi } from '@/lib/api/user'
import type { FollowButtonType } from '@/types/common'

// Prevent concurrent toggle calls for the same userId (store-level lock)
const inFlight = new Set<string>()

interface UserFollowState {
  followed: boolean
  isMutual: boolean
  buttonType: FollowButtonType
}

interface FollowingItem {
  user_id: string
}

interface FollowState {
  userFollowStates: Map<string, UserFollowState>
  followingList: FollowingItem[]
  updateUserFollowState: (
    userId: number | string,
    followed: boolean,
    isMutual?: boolean,
    buttonType?: FollowButtonType
  ) => void
  getUserFollowState: (
    userId: number | string
  ) => UserFollowState & { hasState: boolean }
  followUser: (userId: number | string) => Promise<{ success: boolean; error?: string }>
  unfollowUser: (userId: number | string) => Promise<{ success: boolean; error?: string }>
  toggleUserFollow: (userId: number | string) => Promise<{ success: boolean; error?: string }>
  initUserFollowState: (
    userId: number | string,
    followed: boolean,
    isMutual?: boolean,
    buttonType?: FollowButtonType | null
  ) => void
  initUsersFollowStates: (
    users: Array<{
      user_id: number | string
      followed?: boolean
      isFollowing?: boolean
      isMutual?: boolean
      buttonType?: FollowButtonType
    }>
  ) => void
  fetchFollowStatus: (
    userId: number | string
  ) => Promise<{
    success: boolean
    data?: { followed: boolean; isMutual: boolean; buttonType: FollowButtonType }
    error?: string
  }>
}

export const useFollowStore = create<FollowState>()(
  immer((set, get) => ({
    userFollowStates: new Map(),
    followingList: [],

    updateUserFollowState: (userId, followed, isMutual = false, buttonType = 'follow') => {
      if (userId === null || userId === undefined) return
      set((state) => {
        state.userFollowStates.set(userId.toString(), { followed, isMutual, buttonType })
      })
    },

    getUserFollowState: (userId) => {
      if (userId === null || userId === undefined) {
        return { followed: false, isMutual: false, buttonType: 'follow' as FollowButtonType, hasState: false }
      }
      const key = userId.toString()
      const hasState = get().userFollowStates.has(key)
      const state = get().userFollowStates.get(key)
      if (state) {
        return { ...state, hasState }
      }
      return { followed: false, isMutual: false, buttonType: 'follow' as FollowButtonType, hasState }
    },

    followUser: async (userId) => {
      const currentState = get().getUserFollowState(userId)

      let newButtonType: FollowButtonType = 'unfollow'
      let newIsMutual = currentState.isMutual

      if (currentState.buttonType === 'back') {
        newButtonType = 'mutual'
        newIsMutual = true
      }

      // Optimistic update
      set((state) => {
        state.userFollowStates.set(userId.toString(), {
          followed: true,
          isMutual: newIsMutual,
          buttonType: newButtonType,
        })
      })

      const userIdStr = userId.toString()
      set((state) => {
        if (!state.followingList.some((user) => user.user_id === userIdStr)) {
          state.followingList.push({ user_id: userIdStr })
        }
      })

      try {
        await userApi.followUser(userId)
        // Backend returns { success: false } on idempotent re-follow — keep optimistic state
        return { success: true }
      } catch (error: any) {
        console.error('关注失败:', error)

        if (error.message && error.message.includes('已经关注过了')) {
          set((state) => {
            state.userFollowStates.set(userId.toString(), {
              followed: true,
              isMutual: newIsMutual,
              buttonType: newButtonType,
            })
          })
          return { success: true }
        }

        // Rollback on errors
        set((state) => {
          state.userFollowStates.set(userId.toString(), {
            followed: false,
            isMutual: currentState.isMutual,
            buttonType: currentState.buttonType,
          })
          state.followingList = state.followingList.filter(
            (user) => user.user_id !== userIdStr
          )
        })
        return { success: false, error: error.message }
      }
    },

    unfollowUser: async (userId) => {
      const currentState = get().getUserFollowState(userId)

      let newButtonType: FollowButtonType = 'follow'
      let newIsMutual = false

      if (currentState.buttonType === 'mutual') {
        newButtonType = 'back'
        newIsMutual = false
      }

      // Optimistic update
      set((state) => {
        state.userFollowStates.set(userId.toString(), {
          followed: false,
          isMutual: newIsMutual,
          buttonType: newButtonType,
        })
      })

      const userIdStr = userId.toString()
      set((state) => {
        state.followingList = state.followingList.filter(
          (user) => user.user_id !== userIdStr
        )
      })

      try {
        await userApi.unfollowUser(userId)
        // Backend returns { success: false } on idempotent re-unfollow — keep optimistic state
        return { success: true }
      } catch (error: any) {
        console.error('取消关注失败:', error)

        if (error.message && error.message.includes('还没有关注')) {
          set((state) => {
            state.userFollowStates.set(userId.toString(), {
              followed: false,
              isMutual: newIsMutual,
              buttonType: newButtonType,
            })
          })
          return { success: true }
        }

        // Rollback on errors
        set((state) => {
          state.userFollowStates.set(userId.toString(), {
            followed: true,
            isMutual: currentState.isMutual,
            buttonType: currentState.buttonType,
          })
          if (!state.followingList.some((user) => user.user_id === userIdStr)) {
            state.followingList.push({ user_id: userIdStr })
          }
        })
        return { success: false, error: error.message }
      }
    },

    toggleUserFollow: async (userId) => {
      const key = String(userId)
      if (inFlight.has(key)) return { success: false, error: '操作进行中' }
      inFlight.add(key)
      try {
        const currentState = get().getUserFollowState(userId)
        if (currentState.followed) {
          return await get().unfollowUser(userId)
        } else {
          return await get().followUser(userId)
        }
      } finally {
        inFlight.delete(key)
      }
    },

    initUserFollowState: (userId, followed, isMutual = false, buttonType = null) => {
      let finalButtonType: FollowButtonType
      if (buttonType) {
        finalButtonType = buttonType
      } else {
        finalButtonType = followed ? 'unfollow' : 'follow'
      }
      set((state) => {
        state.userFollowStates.set(userId.toString(), {
          followed,
          isMutual,
          buttonType: finalButtonType,
        })
      })
    },

    initUsersFollowStates: (users) => {
      set((state) => {
        users.forEach((user) => {
          const followed = user.followed || user.isFollowing || false
          const isMutual = user.isMutual || false
          let buttonType: FollowButtonType
          if (user.buttonType) {
            buttonType = user.buttonType
          } else {
            buttonType = followed ? 'unfollow' : 'follow'
          }
          state.userFollowStates.set(user.user_id.toString(), {
            followed,
            isMutual,
            buttonType,
          })
        })
      })
    },

    fetchFollowStatus: async (userId) => {
      try {
        const response = await userApi.getFollowStatus(userId)
        // Backend returns RelationStatus record: { following: boolean, followedBy: boolean, mutual: boolean }
        const raw: any = response
        const isFollowing = raw?.following || false
        const isFollowedBy = raw?.followedBy || false
        const isMutual = raw?.mutual || (isFollowing && isFollowedBy)
        const buttonType: FollowButtonType = isMutual ? 'mutual' : isFollowing ? 'unfollow' : isFollowedBy ? 'back' : 'follow'
        set((state) => {
          state.userFollowStates.set(userId.toString(), {
            followed: isFollowing,
            isMutual,
            buttonType,
          })
        })
        return { success: true, data: { followed: isFollowing, isMutual, buttonType } }
      } catch (error: any) {
        console.error('获取关注状态失败:', error)
        return { success: false, error: error.message }
      }
    },
  }))
)
