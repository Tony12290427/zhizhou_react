import { create } from 'zustand'

interface KeyboardShortcutsState {
  showKeyboardShortcutsModal: boolean
  openKeyboardShortcutsModal: () => void
  closeKeyboardShortcutsModal: () => void
}

export const useKeyboardShortcutsStore = create<KeyboardShortcutsState>(
  (set) => ({
    showKeyboardShortcutsModal: false,
    openKeyboardShortcutsModal: () => set({ showKeyboardShortcutsModal: true }),
    closeKeyboardShortcutsModal: () =>
      set({ showKeyboardShortcutsModal: false }),
  }),
)
