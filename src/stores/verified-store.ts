import { create } from 'zustand'

interface VerifiedState {
  showVerifiedModal: boolean
  openVerifiedModal: () => void
  closeVerifiedModal: () => void
}

export const useVerifiedStore = create<VerifiedState>((set) => ({
  showVerifiedModal: false,
  openVerifiedModal: () => set({ showVerifiedModal: true }),
  closeVerifiedModal: () => set({ showVerifiedModal: false }),
}))
