// zhizhou_be has no categories endpoint. Channels are static.
const DEFAULT_CHANNELS = [
  { id: 'recommend', label: '推荐', path: '/recommend' },
  { id: 'following', label: '关注', path: '/following' },
  { id: 'tech', label: '技术', path: '/tech' },
  { id: 'life', label: '生活', path: '/life' },
  { id: 'food', label: '美食', path: '/food' },
  { id: 'travel', label: '旅行', path: '/travel' },
]

let dynamicChannels = [...DEFAULT_CHANNELS]

export const loadChannelsFromAPI = async () => {
  // zhizhou_be: no category CRUD. Return static channels.
  return DEFAULT_CHANNELS
}

export const getChannels = () => dynamicChannels

export const getChannelIdByPath = (path: string) => {
  let channelPath = path
  if (path.startsWith('/explore/')) {
    channelPath = path.replace('/explore', '')
  } else if (path === '/explore') {
    return 'recommend'
  }
  const channel = dynamicChannels.find((ch) => ch.path === channelPath)
  return channel ? channel.id : 'recommend'
}

export const getChannelPath = (channelId: string) => {
  const channel = dynamicChannels.find((ch) => ch.id === channelId)
  return channel ? channel.path : '/recommend'
}

// Legacy export
export async function getCategories() {
  return { data: [] }
}
