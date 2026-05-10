import { create } from 'zustand'
import type { UserInfo } from '@/types/user'
import request from '@/lib/request'

interface LoginCredentials {
  account: string
  password: string
}

interface RegisterData {
  account: string
  password: string
  nickname?: string
  code?: string
}

interface UserState {
  token: string
  refreshToken: string
  userInfo: UserInfo | null
  isLoading: boolean

  // Computed
  isLoggedIn: () => boolean

  // Auth actions
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; message?: string }>
  register: (userData: RegisterData) => Promise<{ success: boolean; message?: string }>
  logout: () => Promise<void>
  initUserInfo: () => void
  getCurrentUser: () => Promise<UserInfo | null>
  refreshUserToken: () => Promise<boolean>

  // User actions
  getUserStats: (userId: number | string) => Promise<unknown>
  updateUserInfo: (newUserInfo: Partial<UserInfo>) => void
  updateProfile: (data: Record<string, unknown>) => Promise<{ success: boolean; data?: unknown; message?: string }>
  sendCode: (target: string) => Promise<{ success: boolean; message: string }>
}

export const useUserStore = create<UserState>((set, get) => ({
  token: localStorage.getItem('token') || '',
  refreshToken: localStorage.getItem('refreshToken') || '',
  userInfo: (() => {
    try {
      const stored = localStorage.getItem('userInfo')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })(),
  isLoading: false,

  isLoggedIn: () => {
    const { token } = get()
    return !!token
  },

  login: async (credentials) => {
    try {
      set({ isLoading: true })
      // zhizhou_be POST /auth/login expects { identifierType, identifier, password }
      // Map frontend "account" (phone number) to backend format
      const isEmail = credentials.account.includes('@')
      const data: any = await request.post('/auth/login', {
        identifierType: isEmail ? 'EMAIL' : 'PHONE',
        identifier: credentials.account,
        password: credentials.password,
      })

      // Backend returns { user: {...}, token: { accessToken, refreshToken, ... } }
      const accessToken = data?.token?.accessToken || data?.accessToken
      const refreshToken = data?.token?.refreshToken || data?.refreshToken

      if (accessToken) {
        set({ token: accessToken, refreshToken })
        localStorage.setItem('token', accessToken)
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken)

        try {
          const user: any = await request.get('/auth/me')
          if (user) {
            set({ userInfo: user })
            localStorage.setItem('userInfo', JSON.stringify(user))
          }
        } catch { /* me may fail if token not yet propagated */ }

        return { success: true }
      }
      return { success: false, message: '登录失败' }
    } catch (error: any) {
      console.error('Login failed:', error)
      return { success: false, message: error?.message || '网络错误，请稍后重试' }
    } finally {
      set({ isLoading: false })
    }
  },

  register: async (userData) => {
    try {
      set({ isLoading: true })
      const data: any = await request.post('/auth/register', userData)

      const accessToken = data?.token?.accessToken || data?.accessToken
      const refreshToken = data?.token?.refreshToken || data?.refreshToken

      if (accessToken) {
        set({ token: accessToken, refreshToken })
        localStorage.setItem('token', accessToken)
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken)

        try {
          const user: any = await request.get('/auth/me')
          if (user) { set({ userInfo: user }); localStorage.setItem('userInfo', JSON.stringify(user)) }
        } catch { /* ignore */ }

        return { success: true }
      }
      return { success: false, message: '注册失败' }
    } catch (error: any) {
      console.error('Register failed:', error)
      return { success: false, message: error?.message || '注册失败，请稍后重试' }
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    const { refreshToken } = get()
    try {
      await request.post('/auth/logout', { refreshToken })
    } catch {
      // Ignore logout errors
    } finally {
      set({ token: '', refreshToken: '', userInfo: null })
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('userInfo')
    }
  },

  initUserInfo: () => {
    const token = localStorage.getItem('token')
    const userInfo = localStorage.getItem('userInfo')
    if (token) {
      try {
        set({
          token,
          refreshToken: localStorage.getItem('refreshToken') || '',
          userInfo: userInfo ? JSON.parse(userInfo) : null,
        })
      } catch {
        set({ token })
      }
    }
  },

  getCurrentUser: async () => {
    try {
      const user: any = await request.get('/auth/me')
      set({ userInfo: user })
      localStorage.setItem('userInfo', JSON.stringify(user))
      return user as UserInfo
    } catch {
      return null
    }
  },

  refreshUserToken: async () => {
    const { refreshToken } = get()
    if (!refreshToken) return false
    try {
      const data: any = await request.post('/auth/token/refresh', { refreshToken })
      if (data?.accessToken) {
        set({ token: data.accessToken, refreshToken: data.refreshToken })
        localStorage.setItem('token', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        return true
      }
      return false
    } catch {
      return false
    }
  },

  getUserStats: async (userId) => {
    try {
      // zhizhou_be: GET /counter/user/{userId}
      return await request.get(`/counter/user/${userId}`)
    } catch {
      return { followings: 0, followers: 0, posts: 0, likedPosts: 0, favedPosts: 0 }
    }
  },

  updateUserInfo: (newUserInfo) => {
    const current = get().userInfo
    if (current) {
      const updated = { ...current, ...newUserInfo }
      set({ userInfo: updated })
      localStorage.setItem('userInfo', JSON.stringify(updated))
    }
  },

  updateProfile: async (data) => {
    try {
      const result: any = await request.patch('/profile', data)
      const current = get().userInfo
      if (current && result) {
        const updated = { ...current, ...result }
        set({ userInfo: updated })
        localStorage.setItem('userInfo', JSON.stringify(updated))
      }
      return { success: true, data: result }
    } catch (error: any) {
      return { success: false, message: error?.message || '更新失败' }
    }
  },

  sendCode: async (target) => {
    try {
      await request.post('/auth/send-code', { target })
      return { success: true, message: '验证码已发送' }
    } catch (error: any) {
      return { success: false, message: error?.message || '发送失败' }
    }
  },
}))
