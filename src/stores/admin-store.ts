import { create } from 'zustand'
import { adminApi as realAdminApi } from '@/lib/api/index'

interface AdminInfo {
  id?: number
  nickname?: string
  username?: string
  email?: string
  [key: string]: unknown
}

interface LoginCredentials {
  username: string
  password: string
}

interface LoginResult {
  success: boolean
  message?: string
}

interface RefreshResult {
  success: boolean
  message?: string
}

interface GetAdminResult {
  success: boolean
  data?: AdminInfo
  message?: string
}

interface AdminState {
  admin: AdminInfo | null
  token: string
  refreshTokenValue: string
  isLoggedIn: () => boolean
  login: (credentials: LoginCredentials) => Promise<LoginResult>
  logout: () => Promise<void>
  refreshTokens: () => Promise<RefreshResult>
  getCurrentAdmin: () => Promise<GetAdminResult>
  initializeAdmin: () => void
  checkTokenValidity: () => Promise<boolean>
}

export const useAdminStore = create<AdminState>((set, get) => ({
  admin: null,
  token: localStorage.getItem('admin_token') || '',
  refreshTokenValue: localStorage.getItem('admin_refresh_token') || '',

  isLoggedIn: () => {
    const { admin, token } = get()
    return !!admin && !!token
  },

  login: async (credentials: LoginCredentials): Promise<LoginResult> => {
    try {
      const response = await realAdminApi.login({
        identifierType: 'PHONE',
        identifier: credentials.username,
        password: credentials.password,
      })

      // Backend returns AuthResponse directly: { user: {...}, token: { accessToken, refreshToken } }
      const res = response as any
      const accessToken = res?.token?.accessToken || res?.accessToken || ''
      const refreshToken = res?.token?.refreshToken || res?.refreshToken || ''
      const adminInfo = res?.user || res

      if (accessToken) {
        set({
          admin: adminInfo,
          token: accessToken,
          refreshTokenValue: refreshToken,
        })

        localStorage.setItem('admin_token', accessToken)
        localStorage.setItem('admin_refresh_token', refreshToken)
        localStorage.setItem('adminInfo', JSON.stringify(adminInfo))

        return { success: true, message: '登录成功' }
      } else {
        return { success: false, message: res?.message || '登录失败' }
      }
    } catch (error: unknown) {
      console.error('管理员登录失败:', error)

      let errorMessage = '登录失败，请稍后重试'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error
      ) {
        const axiosErr = error as {
          response?: { data?: { message?: string } }
        }
        if (axiosErr.response?.data?.message) {
          errorMessage = axiosErr.response.data.message
        }
      }

      return { success: false, message: errorMessage }
    }
  },

  logout: async () => {
    try {
      const { token } = get()
      if (token) {
        await realAdminApi.logout()
      }
    } catch (error) {
      console.error('管理员退出登录失败:', error)
    } finally {
      set({ admin: null, token: '', refreshTokenValue: '' })
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_refresh_token')
      localStorage.removeItem('adminInfo')
    }
  },

  refreshTokens: async (): Promise<RefreshResult> => {
    try {
      const { refreshTokenValue } = get()
      if (!refreshTokenValue) {
        throw new Error('无刷新令牌')
      }

      const response = await realAdminApi.refreshToken()

      if ((response as any).success) {
        const data = (response as any).data || {}
        const accessToken = data.token || data.access_token || data.accessToken || ''
        const refreshToken = data.refresh_token || data.refreshToken || ''

        set({
          token: accessToken,
          refreshTokenValue: refreshToken,
        })

        localStorage.setItem('admin_token', accessToken)
        localStorage.setItem('admin_refresh_token', refreshToken)

        return { success: true }
      } else {
        throw new Error((response as any).message || '刷新令牌失败')
      }
    } catch (error: unknown) {
      console.error('刷新令牌失败:', error)
      await get().logout()
      return {
        success: false,
        message: error instanceof Error ? error.message : undefined,
      }
    }
  },

  getCurrentAdmin: async (): Promise<GetAdminResult> => {
    try {
      const { token } = get()
      if (!token) {
        throw new Error('未登录')
      }

      const response = await realAdminApi.getCurrentAdmin()

      if ((response as any).success && (response as any).data) {
        const data = (response as any).data
        set({ admin: data })
        localStorage.setItem('adminInfo', JSON.stringify(data))
        return { success: true, data }
      } else {
        throw new Error((response as any).message || '获取管理员信息失败')
      }
    } catch (error: unknown) {
      console.error('获取管理员信息失败:', error)

      // 如果是401错误，尝试刷新令牌
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error
      ) {
        const axiosErr = error as {
          response?: { status?: number }
        }
        if (axiosErr.response?.status === 401) {
          const refreshResult = await get().refreshTokens()
          if (refreshResult.success) {
            try {
              const newResponse = await realAdminApi.getCurrentAdmin()
              if ((newResponse as any).success && (newResponse as any).data) {
                const newData = (newResponse as any).data
                set({ admin: newData })
                localStorage.setItem('adminInfo', JSON.stringify(newData))
                return { success: true, data: newData }
              } else {
                throw new Error((newResponse as any).message || '获取管理员信息失败')
              }
            } catch (refreshError: unknown) {
              console.error('刷新令牌后获取管理员信息失败:', refreshError)
              return {
                success: false,
                message:
                  refreshError instanceof Error
                    ? refreshError.message
                    : undefined,
              }
            }
          } else {
            await get().logout()
          }
        }
      }

      return {
        success: false,
        message: error instanceof Error ? error.message : undefined,
      }
    }
  },

  initializeAdmin: () => {
    try {
      const { token } = get()
      const storedAdminInfo = localStorage.getItem('adminInfo')
      if (storedAdminInfo && token) {
        set({ admin: JSON.parse(storedAdminInfo) })
      }
    } catch (error) {
      console.error('恢复管理员信息失败:', error)
      get().logout()
    }
  },

  checkTokenValidity: async (): Promise<boolean> => {
    const { token } = get()
    if (!token) return false

    try {
      const result = await get().getCurrentAdmin()
      return result.success
    } catch {
      return false
    }
  },
}))
