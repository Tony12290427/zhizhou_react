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
      <style>{`
        .channel-container {
          position: sticky;
          top: 0;
          z-index: 99;
          background-color: var(--bg-color-primary);
          border-bottom: 1px solid transparent;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          padding: 0 16px;
        }
        .channel-container.scrolled {
          border-bottom-color: var(--border-color-primary);
          box-shadow: 0 1px 4px var(--shadow-color);
        }
        .channel-tabs {
          display: flex;
          align-items: center;
          gap: 0;
          max-width: 1200px;
          margin: 0 auto;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding: 4px 0;
        }
        .channel-tabs::-webkit-scrollbar {
          display: none;
        }
        .channel-tab {
          flex-shrink: 0;
          padding: 8px 16px;
          font-size: 15px;
          color: var(--text-color-secondary);
          cursor: pointer;
          border: none;
          background: none;
          position: relative;
          transition: color 0.2s ease;
          white-space: nowrap;
          font-weight: 400;
        }
        .channel-tab:hover {
          color: var(--text-color-primary);
        }
        .channel-tab.active {
          color: var(--text-color-primary);
          font-weight: 600;
        }
        .channel-tab.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 3px;
          background-color: var(--primary-color);
          border-radius: 2px;
        }
      `}</style>
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
