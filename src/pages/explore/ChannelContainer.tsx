import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useChannelStore } from '@/stores/channel-store'

export default function ChannelContainer() {
  const navigate = useNavigate()
  const location = useLocation()
  const { channels, activeChannelId, loadChannels, setActiveChannel } = useChannelStore()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    loadChannels()
  }, [loadChannels])

  // Determine active channel from URL
  useEffect(() => {
    const pathParts = location.pathname.split('/')
    const channelPath = pathParts[pathParts.length - 1]
    if (channelPath && channelPath !== 'explore') {
      const channel = channels.find((c) => (c as any).label === channelPath || (c as any).path === '/' + channelPath)
      if (channel) {
        setActiveChannel(String(channel.id))
      }
    } else if (location.pathname === '/explore') {
      // Default to first channel or 'recommend'
      if (channels.length > 0) {
        setActiveChannel(String(channels[0].id))
      }
    }
  }, [location.pathname, channels, setActiveChannel])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleChannelClick = useCallback(
    (channel: { id: string | number; label: string; path?: string }) => {
      setActiveChannel(String(channel.id))
      const chPath = (channel as any).path || channel.label
      if (chPath === '/recommend' || channel.id === 'recommend') {
        navigate('/explore')
      } else {
        navigate(`/explore${chPath.startsWith('/') ? chPath : '/' + chPath}`)
      }
    },
    [navigate, setActiveChannel]
  )

  if (channels.length === 0) return null

  return (
    <div className={`channel-container ${isScrolled ? 'scrolled' : ''}`}>
      <div className="channel-tabs">
        {channels.map((channel) => (
          <button
            key={channel.id}
            className={`channel-tab ${channel.id === activeChannelId ? 'active' : ''}`}
            onClick={() => handleChannelClick(channel)}
          >
            {channel.label}
          </button>
        ))}
      </div>
    </div>
  )
}
