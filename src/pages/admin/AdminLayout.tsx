import { useState, useEffect, useCallback } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { toast } from '@/utils/toastManager'
import { adminApi } from '@/lib/api/index'
import {
  Home, Activity, Users, FileText, ClipboardCheck, MessageSquare,
  FolderTree, Hash, Heart, Bookmark, UserPlus, Bell,
  Monitor, ShieldCheck, UserCheck, Settings, LogOut, Menu, X,
} from 'lucide-react'

const menuItems = [
  { path: '/admin/api-docs', title: 'API文档', icon: Settings },
  { path: '/admin/monitor', title: '动态监控', icon: Activity },
  { path: '/admin/users', title: '用户管理', icon: Users },
  { path: '/admin/posts', title: '笔记管理', icon: FileText },
  { path: '/admin/post-audit', title: '笔记审核', icon: ClipboardCheck },
  { path: '/admin/comments', title: '评论管理', icon: MessageSquare },
  { path: '/admin/categories', title: '分类管理', icon: FolderTree },
  { path: '/admin/tags', title: '标签管理', icon: Hash },
  { path: '/admin/likes', title: '点赞管理', icon: Heart },
  { path: '/admin/collections', title: '收藏管理', icon: Bookmark },
  { path: '/admin/follows', title: '关注管理', icon: UserPlus },
  { path: '/admin/notifications', title: '通知管理', icon: Bell },
  { path: '/admin/sessions', title: '用户会话管理', icon: Monitor },
  { path: '/admin/admin-sessions', title: '管理员会话管理', icon: Monitor },
  { path: '/admin/audit', title: '认证管理', icon: ShieldCheck },
  { path: '/admin/admins', title: '管理员管理', icon: UserCheck },
]

const pageDescriptions: Record<string, string> = {
  '/admin/api-docs': '查看和测试API接口文档',
  '/admin/monitor': '查看系统最近动态和活动监控',
  '/admin/users': '管理用户账户和权限',
  '/admin/post-audit': '管理笔记审核',
  '/admin/posts': '管理用户发布的笔记内容',
  '/admin/comments': '管理用户评论和回复',
  '/admin/categories': '管理笔记分类和分类信息',
  '/admin/tags': '管理笔记标签分类',
  '/admin/likes': '管理用户点赞记录',
  '/admin/collections': '管理用户收藏记录',
  '/admin/follows': '管理用户关注关系',
  '/admin/notifications': '管理系统通知消息',
  '/admin/sessions': '管理用户登录会话',
  '/admin/admin-sessions': '管理管理员登录会话',
  '/admin/audit': '管理用户认证申请和审核',
  '/admin/admins': '管理系统管理员账号',
}

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      navigate('/admin/login', { replace: true })
      return
    }
    try {
      const res: any = await adminApi.getCurrentAdmin()
      if (!res || !res.id) {
        throw new Error('token invalid')
      }
    } catch {
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminRefreshToken')
      localStorage.removeItem('adminInfo')
      toast.error('登录已过期，请重新登录')
      navigate('/admin/login', { replace: true })
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const handleLogout = async () => {
    try {
      await adminApi.logout()
    } catch { /* ignore */ }
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminRefreshToken')
    localStorage.removeItem('adminInfo')
    toast.success('已退出登录')
    navigate('/admin/login', { replace: true })
  }

  const currentTitle = menuItems.find((item) => item.path === location.pathname)?.title || '管理后台'
  const currentDesc = pageDescriptions[location.pathname] || ''

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center z-[9999]" style={{ background: 'var(--overlay-bg)' }}>
        <div className="w-10 h-10 border-4 rounded-full animate-spin mb-4" style={{ borderColor: 'var(--border-color-primary)', borderTopColor: 'var(--primary-color)' }} />
        <p style={{ color: 'var(--text-color-secondary)' }}>正在验证登录状态...</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--bg-color-secondary)' }}>
      {/* Sidebar - desktop */}
      <aside
        className="hidden lg:flex flex-col w-[260px] flex-shrink-0 border-r"
        style={{
          background: 'var(--bg-color-primary)',
          borderColor: 'var(--border-color-primary)',
        }}
      >
        <div className="p-5 border-b text-center" style={{ borderColor: 'var(--border-color-primary)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-color-primary)' }}>
            知舟管理后台
          </h2>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-colors no-underline ${
                  isActive ? 'font-semibold' : ''
                }`}
                style={{
                  color: 'var(--text-color-primary)',
                  background: isActive ? 'var(--bg-color-secondary)' : 'transparent',
                }}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={18} style={{ color: isActive ? 'var(--primary-color)' : 'var(--text-color-tertiary)' }} />
                <span>{item.title}</span>
              </NavLink>
            )
          })}
        </nav>
        <div className="border-t p-3" style={{ borderColor: 'var(--border-color-primary)' }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-full text-sm transition-colors cursor-pointer"
            style={{ color: 'var(--text-color-secondary)' }}
          >
            <LogOut size={18} />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <header
          className="flex items-center justify-between px-4 lg:px-8 py-5 border-b flex-shrink-0"
          style={{
            background: 'var(--bg-color-primary)',
            borderColor: 'var(--border-color-primary)',
          }}
        >
          <div>
            <h1 className="text-xl lg:text-2xl font-semibold m-0" style={{ color: 'var(--text-color-primary)' }}>
              {currentTitle}
            </h1>
            {currentDesc && (
              <p className="text-sm mt-1 m-0" style={{ color: 'var(--text-color-secondary)' }}>
                {currentDesc}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white no-underline transition-opacity hover:opacity-90"
              style={{ background: 'var(--primary-color)' }}
            >
              <Home size={16} />
              <span>返回主站</span>
            </a>
            {/* Mobile menu trigger */}
            <button
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-full text-white cursor-pointer border-0"
              style={{ background: 'var(--primary-color)' }}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-color-secondary)' }}>
          <Outlet />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0"
            style={{ background: 'var(--overlay-bg)' }}
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className="absolute left-0 top-0 bottom-0 w-[260px] flex flex-col border-r"
            style={{
              background: 'var(--bg-color-primary)',
              borderColor: 'var(--border-color-primary)',
            }}
          >
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color-primary)' }}>
              <h2 className="text-lg font-semibold m-0" style={{ color: 'var(--text-color-primary)' }}>
                管理后台
              </h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="bg-transparent border-0 cursor-pointer p-1 rounded"
                style={{ color: 'var(--text-color-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-colors no-underline ${
                      isActive ? 'font-semibold' : ''
                    }`}
                    style={{
                      color: 'var(--text-color-primary)',
                      background: isActive ? 'var(--bg-color-secondary)' : 'transparent',
                    }}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon size={18} style={{ color: isActive ? 'var(--primary-color)' : 'var(--text-color-tertiary)' }} />
                    <span>{item.title}</span>
                  </NavLink>
                )
              })}
            </nav>
            <div className="border-t p-3" style={{ borderColor: 'var(--border-color-primary)' }}>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-2.5 w-full rounded-full text-sm transition-colors cursor-pointer"
                style={{ color: 'var(--text-color-secondary)' }}
              >
                <LogOut size={18} />
                <span>退出登录</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
