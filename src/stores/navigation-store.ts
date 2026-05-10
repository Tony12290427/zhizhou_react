import { create } from 'zustand'

interface NavigationState {
  activeItemId: string
  setActiveItem: (id: string) => void
  scrollToTop: (behavior?: ScrollBehavior) => void
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  activeItemId: '',

  setActiveItem: (id: string) => {
    set({ activeItemId: id })
  },

  scrollToTop: (behavior: ScrollBehavior = 'smooth') => {
    window.scrollTo({ top: 0, behavior })
  },
}))
