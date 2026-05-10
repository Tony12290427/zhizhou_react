import { getCategories } from '@/lib/api/categories'

/** 频道配置项 */
export interface Channel {
  id: string
  label: string
  path: string
}

// 默认频道配置（推荐频道始终存在）
const DEFAULT_CHANNELS: Channel[] = [
  { id: 'recommend', label: '推荐', path: '/recommend' },
]

// 动态频道列表
let dynamicChannels: Channel[] = [...DEFAULT_CHANNELS]

// 从API加载分类数据并转换为频道格式
export const loadChannelsFromAPI = async (): Promise<Channel[]> => {
  try {
    const response = await getCategories()
    if (response.success !== false && response.data) {
      const categoryChannels: Channel[] = response.data.map(
        (category: { id: string; name: string; category_title: string }) => ({
          id: category.id,
          label: category.name,
          path: `/${category.category_title}`, // 使用英文标题作为路径
        })
      )

      // 合并默认频道和分类频道
      dynamicChannels = [...DEFAULT_CHANNELS, ...categoryChannels]
      return dynamicChannels
    }
  } catch (error) {
    console.error('加载分类数据失败:', error)
  }

  // 如果加载失败，返回默认频道
  return DEFAULT_CHANNELS
}

// 获取当前频道列表
export const getChannels = (): Channel[] => {
  return dynamicChannels
}

// 兼容性：导出CHANNELS（向后兼容）
export const CHANNELS = dynamicChannels

// 获取有效的频道路径（用于路由验证）
export const getValidChannelPaths = (): string[] => {
  return dynamicChannels.map((ch) => ch.path.substring(1)) // 去掉开头的 '/'
}

// 根据路径获取频道ID
export const getChannelIdByPath = (path: string): string => {
  // 处理 /explore/xxx 格式的路径
  let channelPath = path
  if (path.startsWith('/explore/')) {
    channelPath = path.replace('/explore', '')
  } else if (path === '/explore') {
    return 'recommend' // 默认返回推荐频道
  }

  const channel = dynamicChannels.find((ch) => ch.path === channelPath)
  return channel ? channel.id : 'recommend'
}

// 根据频道ID获取路径
export const getChannelPath = (channelId: string): string => {
  const channel = dynamicChannels.find((ch) => ch.id === channelId)
  return channel ? channel.path : '/recommend'
}
