import { create } from 'zustand'

interface ToggleState {
  visible: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

export const useAboutStore = create<ToggleState>((set) => ({
  visible: false,
  open: () => set({ visible: true }),
  close: () => set({ visible: false }),
  toggle: () => set((s) => ({ visible: !s.visible })),
}))
