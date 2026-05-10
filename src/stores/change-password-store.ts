import { create } from 'zustand'
import request from '@/lib/request'

interface ChangePasswordState {
  visible: boolean
  open: () => void
  close: () => void
  toggle: () => void
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string }>
}

export const useChangePasswordStore = create<ChangePasswordState>((set) => ({
  visible: false,
  open: () => set({ visible: true }),
  close: () => set({ visible: false }),
  toggle: () => set((s) => ({ visible: !s.visible })),

  changePassword: async (oldPassword, newPassword) => {
    try {
      await request.post('/auth/password/change', { oldPassword, newPassword })
      return { success: true, message: '密码修改成功' }
    } catch (error: any) {
      return { success: false, message: error?.message || '密码修改失败' }
    }
  },
}))
