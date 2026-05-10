import { create } from 'zustand'

type AuthModalMode = 'login' | 'register'

interface AuthState {
  showAuthModal: boolean
  initialMode: AuthModalMode
  openLoginModal: () => void
  openRegisterModal: () => void
  closeAuthModal: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  showAuthModal: false,
  initialMode: 'login',

  openLoginModal: () => {
    set({ initialMode: 'login', showAuthModal: true })
  },

  openRegisterModal: () => {
    set({ initialMode: 'register', showAuthModal: true })
  },

  closeAuthModal: () => {
    set({ showAuthModal: false })
  },
}))
