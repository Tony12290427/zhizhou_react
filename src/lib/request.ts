import axios from 'axios'
import apiConfig from '@/config/api'
import { HTTP_STATUS, ERROR_MESSAGES } from '@/config/constants'

const request = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: apiConfig.defaultHeaders,
})

// Request interceptor — inject Bearer token
request.interceptors.request.use(
  (config) => {
    // Admin endpoints use admin_token (so admin login doesn't clobber the user token)
    if (config.url?.startsWith('/admin/')) {
      const adminToken = localStorage.getItem('admin_token')
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`
        return config
      }
    }
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('Request config error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor
request.interceptors.response.use(
  // Success: pass through raw data (zhizhou_be returns DTOs directly, no {code,message,data} wrapper)
  (response) => response.data,
  async (error) => {
    if (error.response) {
      let errorMessage: string = ERROR_MESSAGES.REQUEST_FAILED
      const status = error.response.status
      const serverMessage = error.response.data?.message || error.response.data?.error

      switch (status) {
        case HTTP_STATUS.UNAUTHORIZED: {
          const userToken = localStorage.getItem('token')
          if (userToken) {
            localStorage.removeItem('token')
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('userInfo')
            // Don't redirect on login page or during auth requests
            const isAuthRequest = error.config?.url?.includes('/auth/')
            if (!isAuthRequest) {
              window.location.href = '/'
            }
            errorMessage = ERROR_MESSAGES.SESSION_EXPIRED
          } else {
            errorMessage = ERROR_MESSAGES.UNAUTHORIZED
          }
          break
        }
        case HTTP_STATUS.TOO_MANY_REQUESTS:
          errorMessage = ERROR_MESSAGES.TOO_MANY_REQUESTS
          break
        case HTTP_STATUS.FORBIDDEN:
          errorMessage = serverMessage || ERROR_MESSAGES.FORBIDDEN
          break
        case HTTP_STATUS.NOT_FOUND:
          errorMessage = serverMessage || ERROR_MESSAGES.NOT_FOUND
          break
        case HTTP_STATUS.INTERNAL_SERVER_ERROR:
          errorMessage = serverMessage || ERROR_MESSAGES.INTERNAL_SERVER_ERROR
          console.error('Internal server error:', error.response.data)
          break
        default:
          errorMessage = serverMessage || `Request failed (${status})`
      }

      return Promise.reject({
        success: false,
        message: errorMessage,
        status,
        data: error.response.data,
      })
    } else if (error.request) {
      console.error('Network error')
      return Promise.reject({
        success: false,
        message: ERROR_MESSAGES.NETWORK_ERROR,
        data: null,
      })
    } else {
      console.error('Request config error:', error.message)
      return Promise.reject({
        success: false,
        message: error.message || ERROR_MESSAGES.REQUEST_CONFIG_ERROR,
        data: null,
      })
    }
  }
)

export default request
