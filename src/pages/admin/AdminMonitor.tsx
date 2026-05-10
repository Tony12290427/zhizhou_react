import { useState, useEffect } from 'react'
import { toast } from '@/utils/toastManager'
import { adminApi } from '@/lib/api/index'

interface Activity {
  id: number
  type: string
  nickname: string
  avatar: string
  user_id: string
  target_id: number
  content: string
  description: string
  created_at: string
}

const TYPE_TEXT: Record<string, string> = {
  user_register: '用户注册',
  post_publish: '发布笔记',
  comment_publish: '发表评论',
}

export default function AdminMonitor() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await adminApi.getMonitorActivities()
        if (res && res.success) {
          setActivities(Array.isArray(res.data) ? res.data : [])
        } else {
          setError((res && res.message) || '获取动态失败')
        }
      } catch (err) {
        setError('网络错误，请稍后重试')
      }
    }
    fetchActivities()
  }, [])

  const formatTime = (timeStr: string) => {
    const time = new Date(timeStr)
    const now = new Date()
    const diff = now.getTime() - time.getTime()
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
    return time.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  const handleClick = (activity: Activity) => {
    if (activity.type === 'user_register') {
      window.open(`/user/${activity.user_id}`, '_blank')
    } else if (activity.type === 'post_publish' || activity.type === 'comment_publish') {
      window.open(`/post?id=${activity.target_id}`, '_blank')
    }
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center" style={{ color: 'var(--text-color-secondary)' }}>
        <p>{error}</p>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center" style={{ color: 'var(--text-color-secondary)' }}>
        <p>暂无动态</p>
      </div>
    )
  }

  return (
    <div className="p-3" style={{ background: 'var(--bg-color-primary)', minHeight: '100%' }}>
      <div className="max-w-[1200px] mx-auto rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--border-color-primary)', background: 'var(--bg-color-primary)' }}>
        <div>
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center px-8 py-5 border-b cursor-pointer transition-colors hover:bg-[var(--bg-color-secondary)] last:border-b-0"
              style={{ borderColor: 'var(--border-color-primary)' }}
              onClick={() => handleClick(activity)}
            >
              <div className="w-10 h-10 mr-3 flex-shrink-0">
                <img
                  src={activity.avatar || ''}
                  alt="avatar"
                  className="w-10 h-10 rounded-full object-cover border"
                  style={{ borderColor: 'var(--border-color-primary)' }}
                  onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect fill="%23e5e7eb" width="40" height="40" rx="20"/><text x="20" y="24" text-anchor="middle" fill="%239ca3af" font-size="14">U</text></svg>' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-medium mb-1 leading-relaxed" style={{ color: 'var(--text-color-primary)' }}>
                  {activity.description || activity.content}
                </div>
                <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-color-secondary)' }}>
                  <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--bg-color-secondary)' }}>
                    {TYPE_TEXT[activity.type] || '未知活动'}
                  </span>
                  <span>{activity.nickname}</span>
                </div>
              </div>
              <div className="text-sm ml-4 whitespace-nowrap" style={{ color: 'var(--text-color-tertiary)' }}>
                {formatTime(activity.created_at)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
