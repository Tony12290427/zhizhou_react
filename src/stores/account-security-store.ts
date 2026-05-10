import { create } from 'zustand'
import request from '@/lib/request'

interface AccountSecurityState {
  showAccountSecurityModal: boolean
  openAccountSecurityModal: () => void
  closeAccountSecurityModal: () => void
  bindEmail: (email: string, code: string) => Promise<{ success: boolean; message?: string }>
  unbindEmail: () => Promise<{ success: boolean; message?: string }>
  deleteAccount: () => Promise<{ success: boolean; message?: string }>
  sendBindCode: (email: string) => Promise<{ success: boolean; message?: string }>
}

export const useAccountSecurityStore = create<AccountSecurityState>((set) => ({
  showAccountSecurityModal: false,
  openAccountSecurityModal: () => set({ showAccountSecurityModal: true }),
  closeAccountSecurityModal: () => set({ showAccountSecurityModal: false }),

  bindEmail: async (email, code) => {
    try {
      await request.post('/auth/email/bind', { email, code })
      return { success: true, message: '邮箱绑定成功' }
    } catch (error: any) {
      return { success: false, message: error?.message || '邮箱绑定失败' }
    }
  },

  unbindEmail: async () => {
    try {
      await request.post('/auth/email/unbind')
      return { success: true, message: '邮箱解绑成功' }
    } catch (error: any) {
      return { success: false, message: error?.message || '邮箱解绑失败' }
    }
  },

  deleteAccount: async () => {
    try {
      await request.delete('/auth/account')
      return { success: true, message: '账号已注销' }
    } catch (error: any) {
      return { success: false, message: error?.message || '账号注销失败' }
    }
  },

  sendBindCode: async (email) => {
    try {
      await request.post('/auth/send-code', { target: email, scene: 'REGISTER' })
      return { success: true, message: '验证码已发送' }
    } catch (error: any) {
      return { success: false, message: error?.message || '发送验证码失败' }
    }
  },
}))
