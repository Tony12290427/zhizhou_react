import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { getCategories } from '@/lib/api/categories'
import WaterfallFlow from '@/components/WaterfallFlow'
import DetailCard from '@/components/DetailCard'

interface Category {
  id: number
  name: string
  category_title: string
}

export default function ChannelPage() {
  const params = useParams()
  const location = useLocation()
  const [categories, setCategories] = useState<Category[]>([])
  const [detailCardVisible, setDetailCardVisible] = useState(false)
  const [detailCardItem, setDetailCardItem] = useState<any>(null)

  // Determine channel type from route params or fallback to 'recommend'
  const channelType = useMemo(() => {
    if (params.channel) return params.channel
    // Fallback: extract from pathname
    const segments = location.pathname.split('/').filter(Boolean)
    const idx = segments.indexOf('explore')
    if (idx >= 0 && segments.length > idx + 1) {
      return segments[idx + 1]
    }
    return 'recommend'
  }, [params.channel, location.pathname])

  // Build channel config mapping
  const channelConfig = useMemo(() => {
    const config: Record<string, { category: string | number; title: string }> = {
      recommend: { category: 'recommend', title: '推荐' },
    }
    categories.forEach((cat) => {
      config[cat.category_title] = { category: cat.id, title: cat.name }
      config[String(cat.id)] = { category: cat.id, title: cat.name }
    })
    return config
  }, [categories])

  // Current channel
  const currentChannel = useMemo(() => {
    return channelConfig[channelType] || channelConfig['recommend']
  }, [channelConfig, channelType])

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const response = await getCategories()
      if (response.success !== false && response.data) {
        setCategories(response.data)
      }
    } catch (error) {
      console.error('加载分类失败:', error)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const handleCardClick = useCallback((item: any, _position: { x: number; y: number }) => {
    setDetailCardItem(item)
    setDetailCardVisible(true)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setDetailCardVisible(false)
    setDetailCardItem(null)
  }, [])

  return (
    <div className="channel-page">
      <WaterfallFlow
        category={currentChannel.category}
        onCardClick={handleCardClick}
      />
      {detailCardVisible && detailCardItem && (
        <DetailCard
          item={detailCardItem}
          onClose={handleCloseDetail}
        />
      )}
      <style>{`
        .channel-page {
          width: 100%;
          background: var(--bg-color-primary);
          transition: background-color 0.2s ease;
        }
      `}</style>
    </div>
  )
}
