import { create } from 'zustand'
import { getChannels, loadChannelsFromAPI, getChannelIdByPath, getChannelPath } from '@/lib/api/channel'

interface ChannelItem {
  id: string | number
  label: string
  path: string
}

interface ChannelState {
  channels: ChannelItem[]
  activeChannelId: string
  isLoading: boolean
  setActiveChannel: (channelId: string) => void
  loadChannels: () => Promise<void>
  getChannelIdByPath: (path: string) => string | number
  getChannelPath: (channelId: string) => string
}

export const useChannelStore = create<ChannelState>((set, get) => ({
  channels: getChannels(),
  activeChannelId: 'recommend',
  isLoading: false,

  loadChannels: async () => {
    set({ isLoading: true })
    try {
      await loadChannelsFromAPI()
      set({ channels: getChannels() })
    } finally {
      set({ isLoading: false })
    }
  },

  setActiveChannel: (channelId) => {
    set({ activeChannelId: channelId })
  },

  getChannelIdByPath,

  getChannelPath,
}))
