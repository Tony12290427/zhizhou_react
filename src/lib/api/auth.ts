import request from '@/lib/request'

export const authApi = {
  login(data: { account: string; password: string }) {
    return request.post('/auth/login', data)
  },

  register(data: { account: string; password: string; nickname?: string; code?: string }) {
    return request.post('/auth/register', data)
  },

  logout(refreshToken: string) {
    return request.post('/auth/logout', { refreshToken })
  },

  refreshToken(refreshToken: string) {
    return request.post('/auth/token/refresh', { refreshToken })
  },

  getCurrentUser() {
    return request.get('/auth/me')
  },

  sendCode(target: string) {
    return request.post('/auth/send-code', { target })
  },

  // Not available in zhizhou_be — stubs
  sendEmailCode(_data: { email: string }) {
    return Promise.reject(new Error('Use sendCode instead'))
  },

  bindEmail(_data: { email: string; code: string }) {
    return Promise.reject(new Error('Email binding not available'))
  },

  unbindEmail() {
    return Promise.reject(new Error('Email unbinding not available'))
  },
}
