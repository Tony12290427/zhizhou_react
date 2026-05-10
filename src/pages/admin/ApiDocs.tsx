import { useState, useMemo } from 'react'
import { Search, X } from 'lucide-react'

interface ApiParam {
  name: string
  type: string
  required: boolean
  description: string
}

interface ApiEndpoint {
  method: string
  path: string
  title: string
  description?: string
  auth?: boolean
  params?: ApiParam[]
  example?: string
}

interface ApiGroup {
  name: string
  description?: string
  apis: ApiEndpoint[]
}

const apiGroups: ApiGroup[] = [
  {
    name: '认证相关接口',
    apis: [
      { method: 'POST', path: '/api/auth/register', title: '用户注册', description: '用户注册接口，支持IP属地自动获取', params: [
        { name: 'user_id', type: 'string', required: true, description: '知舟号（3-15位，字母数字下划线）' },
        { name: 'nickname', type: 'string', required: true, description: '昵称（2-10位）' },
        { name: 'password', type: 'string', required: true, description: '密码（6-20位）' },
        { name: 'avatar', type: 'string', required: false, description: '头像URL' },
        { name: 'bio', type: 'string', required: false, description: '个人简介' },
        { name: 'location', type: 'string', required: false, description: '所在地（默认使用IP属地）' },
      ], example: `{"code":200,"message":"注册成功","data":{"user":{...},"tokens":{...}}}` },
      { method: 'POST', path: '/api/auth/login', title: '用户登录', description: '用户登录接口，返回JWT令牌', params: [
        { name: 'user_display_id', type: 'string', required: true, description: '知舟号' },
        { name: 'password', type: 'string', required: true, description: '密码' },
      ] },
      { method: 'POST', path: '/api/auth/refresh', title: '刷新令牌', description: '使用refresh_token刷新access_token', params: [
        { name: 'refresh_token', type: 'string', required: true, description: '刷新令牌' },
      ] },
      { method: 'POST', path: '/api/auth/logout', title: '退出登录', auth: true },
      { method: 'GET', path: '/api/auth/me', title: '获取当前用户信息', auth: true },
      { method: 'POST', path: '/api/auth/send-email-code', title: '发送邮箱验证码', params: [
        { name: 'email', type: 'string', required: true, description: '邮箱地址' },
      ] },
      { method: 'POST', path: '/api/auth/bind-email', title: '绑定邮箱', auth: true, params: [
        { name: 'email', type: 'string', required: true, description: '邮箱地址' },
        { name: 'emailCode', type: 'string', required: true, description: '邮箱验证码' },
      ] },
      { method: 'DELETE', path: '/api/auth/unbind-email', title: '解除邮箱绑定', auth: true },
    ],
  },
  {
    name: '图片上传接口',
    apis: [
      { method: 'POST', path: '/api/upload/single', title: '单图片上传', description: '上传单个图片文件，限制5MB', auth: true, params: [
        { name: 'file', type: 'file', required: true, description: '要上传的图片文件（jpg, jpeg, png, webp）' },
      ] },
      { method: 'POST', path: '/api/upload/multiple', title: '多图片上传', description: '上传多个图片文件，最多9个', auth: true, params: [
        { name: 'files', type: 'file[]', required: true, description: '要上传的图片文件数组' },
      ] },
    ],
  },
  {
    name: '视频上传接口',
    apis: [
      { method: 'POST', path: '/api/upload/video', title: '视频上传', description: '上传视频文件，限制100MB', auth: true, params: [
        { name: 'video', type: 'file', required: true, description: '要上传的视频文件（mp4, avi, mov）' },
      ] },
    ],
  },
  {
    name: '用户相关接口',
    apis: [
      { method: 'GET', path: '/api/users', title: '获取用户列表', params: [
        { name: 'page', type: 'int', required: false, description: '页码，默认1' },
        { name: 'limit', type: 'int', required: false, description: '每页数量，默认20' },
      ] },
      { method: 'GET', path: '/api/users/search', title: '搜索用户', params: [
        { name: 'keyword', type: 'string', required: true, description: '搜索关键词' },
      ] },
      { method: 'GET', path: '/api/users/:id', title: '获取用户详情', params: [
        { name: 'id', type: 'string', required: true, description: '知舟号' },
      ] },
      { method: 'GET', path: '/api/users/:id/posts', title: '获取用户发布的笔记', params: [
        { name: 'id', type: 'string', required: true, description: '知舟号' },
      ] },
      { method: 'GET', path: '/api/users/:id/collections', title: '获取用户收藏的笔记' },
      { method: 'POST', path: '/api/users/:id/follow', title: '关注用户', auth: true },
      { method: 'DELETE', path: '/api/users/:id/follow', title: '取消关注', auth: true },
      { method: 'GET', path: '/api/users/:id/following', title: '获取关注列表' },
      { method: 'GET', path: '/api/users/:id/followers', title: '获取粉丝列表' },
      { method: 'GET', path: '/api/users/:id/stats', title: '获取用户统计信息' },
    ],
  },
  {
    name: '笔记相关接口',
    apis: [
      { method: 'GET', path: '/api/posts', title: '获取笔记列表', params: [
        { name: 'page', type: 'int', required: false, description: '页码，默认1' },
        { name: 'limit', type: 'int', required: false, description: '每页数量，默认20' },
        { name: 'category', type: 'string', required: false, description: '分类ID筛选' },
        { name: 'status', type: 'int', required: false, description: '笔记状态筛选' },
      ] },
      { method: 'GET', path: '/api/posts/:id', title: '获取笔记详情' },
      { method: 'POST', path: '/api/posts', title: '创建笔记', auth: true, params: [
        { name: 'title', type: 'string', required: false, description: '笔记标题' },
        { name: 'content', type: 'string', required: false, description: '笔记内容' },
        { name: 'category_id', type: 'int', required: false, description: '分类ID' },
        { name: 'type', type: 'int', required: false, description: '笔记类型：1-图文，2-视频' },
        { name: 'images', type: 'array', required: false, description: '图片URL数组' },
        { name: 'tags', type: 'array', required: false, description: '标签名称数组' },
        { name: 'status', type: 'int', required: false, description: '状态：0=发布，1=草稿，2=待审核' },
      ] },
      { method: 'PUT', path: '/api/posts/:id', title: '更新笔记', auth: true },
      { method: 'DELETE', path: '/api/posts/:id', title: '删除笔记', auth: true },
      { method: 'POST', path: '/api/posts/:id/collect', title: '收藏笔记', auth: true },
      { method: 'DELETE', path: '/api/posts/:id/collect', title: '取消收藏', auth: true },
    ],
  },
  {
    name: '评论相关接口',
    apis: [
      { method: 'GET', path: '/api/posts/:id/comments', title: '获取评论列表' },
      { method: 'POST', path: '/api/posts/:id/comments', title: '发表评论', auth: true, params: [
        { name: 'content', type: 'string', required: true, description: '评论内容' },
        { name: 'parent_id', type: 'int', required: false, description: '父评论ID' },
      ] },
      { method: 'GET', path: '/api/comments/:id/replies', title: '获取子评论列表' },
      { method: 'DELETE', path: '/api/comments/:id', title: '删除评论', auth: true },
    ],
  },
  {
    name: '互动相关接口',
    apis: [
      { method: 'POST', path: '/api/likes', title: '点赞/取消点赞', auth: true, params: [
        { name: 'target_type', type: 'int', required: true, description: '目标类型（1-笔记, 2-评论）' },
        { name: 'target_id', type: 'int', required: true, description: '目标ID' },
      ] },
      { method: 'DELETE', path: '/api/likes', title: '取消点赞', auth: true },
    ],
  },
  {
    name: '搜索相关接口',
    apis: [
      { method: 'GET', path: '/api/search', title: '通用搜索', params: [
        { name: 'keyword', type: 'string', required: false, description: '搜索关键词' },
        { name: 'tag', type: 'string', required: false, description: '标签搜索' },
        { name: 'type', type: 'string', required: false, description: '搜索类型：all/posts/videos/users' },
      ] },
    ],
  },
  {
    name: '分类管理接口',
    apis: [
      { method: 'GET', path: '/api/categories', title: '获取分类列表' },
      { method: 'GET', path: '/api/admin/categories', title: '获取分类列表（管理员）', auth: true },
      { method: 'POST', path: '/api/admin/categories', title: '创建分类（管理员）', auth: true },
      { method: 'PUT', path: '/api/admin/categories/:id', title: '更新分类（管理员）', auth: true },
      { method: 'DELETE', path: '/api/admin/categories/:id', title: '删除分类（管理员）', auth: true },
      { method: 'DELETE', path: '/api/admin/categories', title: '批量删除分类（管理员）', auth: true },
    ],
  },
  {
    name: '标签相关接口',
    apis: [
      { method: 'GET', path: '/api/tags', title: '获取所有标签' },
      { method: 'GET', path: '/api/tags/hot', title: '获取热门标签' },
    ],
  },
  {
    name: '通知相关接口',
    apis: [
      { method: 'GET', path: '/api/notifications/comments', title: '获取评论通知', auth: true },
      { method: 'GET', path: '/api/notifications/likes', title: '获取点赞通知', auth: true },
      { method: 'GET', path: '/api/notifications/follows', title: '获取关注通知', auth: true },
      { method: 'GET', path: '/api/notifications/collections', title: '获取收藏通知', auth: true },
      { method: 'GET', path: '/api/notifications/unread-count', title: '获取未读通知数量', auth: true },
      { method: 'PUT', path: '/api/notifications/:id/read', title: '标记通知为已读', auth: true },
      { method: 'PUT', path: '/api/notifications/read-all', title: '标记所有通知为已读', auth: true },
      { method: 'DELETE', path: '/api/notifications/:id', title: '删除通知', auth: true },
    ],
  },
  {
    name: '管理员相关接口',
    apis: [
      { method: 'POST', path: '/api/auth/admin/login', title: '管理员登录', params: [
        { name: 'username', type: 'string', required: true, description: '管理员用户名' },
        { name: 'password', type: 'string', required: true, description: '管理员密码' },
      ] },
      { method: 'GET', path: '/api/auth/admin/me', title: '获取当前管理员信息', auth: true },
      { method: 'POST', path: '/api/auth/admin/refresh', title: '刷新管理员令牌', auth: true },
      { method: 'POST', path: '/api/auth/admin/logout', title: '管理员退出登录', auth: true },
      { method: 'GET', path: '/api/auth/admin/admins', title: '获取管理员列表（认证路由）', auth: true },
      { method: 'POST', path: '/api/auth/admin/admins', title: '创建管理员（认证路由）', auth: true },
      { method: 'PUT', path: '/api/auth/admin/admins/:id', title: '更新管理员（认证路由）', auth: true },
      { method: 'DELETE', path: '/api/auth/admin/admins/:id', title: '删除管理员（认证路由）', auth: true },
    ],
  },
  {
    name: '管理员 - 用户管理',
    apis: [
      { method: 'GET', path: '/api/admin/users', title: '获取用户列表（管理员）', auth: true },
      { method: 'POST', path: '/api/admin/users', title: '创建用户（管理员）', auth: true },
      { method: 'PUT', path: '/api/admin/users/:id', title: '更新用户（管理员）', auth: true },
      { method: 'DELETE', path: '/api/admin/users/:id', title: '删除用户（管理员）', auth: true },
      { method: 'DELETE', path: '/api/admin/users', title: '批量删除用户（管理员）', auth: true },
      { method: 'POST', path: '/api/admin/users/:id/ban', title: '封禁用户（管理员）', auth: true },
      { method: 'POST', path: '/api/admin/users/:id/unban', title: '解封用户（管理员）', auth: true },
    ],
  },
  {
    name: '管理员 - 笔记管理',
    apis: [
      { method: 'GET', path: '/api/admin/posts', title: '获取笔记列表（管理员）', auth: true },
      { method: 'GET', path: '/api/admin/posts/:id', title: '获取笔记详情（管理员）', auth: true },
      { method: 'POST', path: '/api/admin/posts', title: '创建笔记（管理员）', auth: true },
      { method: 'PUT', path: '/api/admin/posts/:id', title: '更新笔记（管理员）', auth: true },
      { method: 'DELETE', path: '/api/admin/posts/:id', title: '删除笔记（管理员）', auth: true },
      { method: 'DELETE', path: '/api/admin/posts', title: '批量删除笔记（管理员）', auth: true },
    ],
  },
  {
    name: '管理员 - 笔记审核',
    apis: [
      { method: 'GET', path: '/api/admin/posts-audit', title: '获取待审核笔记列表（管理员）', auth: true },
      { method: 'PUT', path: '/api/admin/posts-audit/:id/approve', title: '审核通过笔记（管理员）', auth: true },
      { method: 'PUT', path: '/api/admin/posts-audit/:id/reject', title: '拒绝发布笔记（管理员）', auth: true },
    ],
  },
  {
    name: '管理员 - 评论管理',
    apis: [
      { method: 'GET', path: '/api/admin/comments', title: '获取评论列表（管理员）', auth: true },
      { method: 'POST', path: '/api/admin/comments', title: '创建评论（管理员）', auth: true },
      { method: 'PUT', path: '/api/admin/comments/:id', title: '更新评论（管理员）', auth: true },
      { method: 'DELETE', path: '/api/admin/comments/:id', title: '删除评论（管理员）', auth: true },
      { method: 'DELETE', path: '/api/admin/comments', title: '批量删除评论（管理员）', auth: true },
    ],
  },
  {
    name: '管理员 - 其他管理',
    apis: [
      { method: 'GET', path: '/api/admin/tags', title: '获取标签列表（管理员）', auth: true },
      { method: 'POST', path: '/api/admin/tags', title: '创建标签（管理员）', auth: true },
      { method: 'PUT', path: '/api/admin/tags/:id', title: '更新标签（管理员）', auth: true },
      { method: 'DELETE', path: '/api/admin/tags/:id', title: '删除标签（管理员）', auth: true },
      { method: 'GET', path: '/api/admin/likes', title: '获取点赞列表（管理员）', auth: true },
      { method: 'GET', path: '/api/admin/collections', title: '获取收藏列表（管理员）', auth: true },
      { method: 'GET', path: '/api/admin/follows', title: '获取关注列表（管理员）', auth: true },
      { method: 'GET', path: '/api/admin/notifications', title: '获取通知列表（管理员）', auth: true },
      { method: 'GET', path: '/api/admin/sessions', title: '获取会话列表（管理员）', auth: true },
      { method: 'GET', path: '/api/admin/admin-sessions', title: '获取管理员会话列表（管理员）', auth: true },
      { method: 'GET', path: '/api/admin/admins', title: '获取管理员列表', auth: true },
      { method: 'GET', path: '/api/admin/audit', title: '获取认证申请列表（管理员）', auth: true },
      { method: 'PUT', path: '/api/admin/audit/:id/approve', title: '审核通过认证申请（管理员）', auth: true },
      { method: 'PUT', path: '/api/admin/audit/:id/reject', title: '审核拒绝认证申请（管理员）', auth: true },
      { method: 'GET', path: '/api/admin/monitor/activities', title: '获取系统活动监控', auth: true },
    ],
  },
]

export default function ApiDocs() {
  const [search, setSearch] = useState('')

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return apiGroups
    const q = search.toLowerCase()
    return apiGroups
      .map((g) => ({
        ...g,
        apis: g.apis.filter(
          (a) =>
            a.path.toLowerCase().includes(q) ||
            a.title.toLowerCase().includes(q) ||
            (a.description && a.description.toLowerCase().includes(q)),
        ),
      }))
      .filter((g) => g.apis.length > 0)
  }, [search])

  const highlightText = (text: string) => {
    if (!search.trim() || !text) return text
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} style={{ background: '#fff3cd', color: '#856404', padding: '1px 2px', borderRadius: 2 }}>{part}</mark> : part
    )
  }

  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set())

  const toggleExpand = (key: string) => {
    setExpandedSet((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const methodColor: Record<string, string> = {
    GET: '#22c55e', POST: '#3b82f6', PUT: '#f59e0b', DELETE: '#ef4444',
  }

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg, var(--primary-color), var(--primary-color-dark, var(--primary-color)))', color: '#fff', padding: 30, marginBottom: 0 }}>
        <h2 style={{ margin: '0 0 12px 0', fontSize: 26 }}>知舟图文社区 API 接口文档</h2>
        <div style={{ display: 'flex', gap: 24, fontSize: 13, opacity: 0.9, flexWrap: 'wrap' }}>
          <span>版本: v1.3.2</span>
          <span>基础URL: {import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/'}</span>
          <span>更新时间: 2026-02-27</span>
        </div>
      </div>

      {/* Sticky search */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 20px', background: 'var(--bg-color-primary)', borderBottom: '1px solid var(--border-color-primary)' }}>
        <div style={{ position: 'relative', maxWidth: 400, margin: '0 auto' }}>
          <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-color-tertiary)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="搜索API接口..."
            style={{
              width: '100%', padding: '10px 40px', border: '1px solid var(--border-color-primary)', borderRadius: 25, fontSize: 13, outline: 'none',
              background: 'var(--bg-color-secondary)', color: 'var(--text-color-primary)', boxSizing: 'border-box',
            }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-color-tertiary)' }}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* General info */}
      <div style={{ padding: 30, background: 'var(--bg-color-primary)' }}>
        <section style={{ marginBottom: 30 }}>
          <h3 style={{ background: 'var(--bg-color-secondary)', margin: 0, padding: '16px 24px', fontSize: 18, color: 'var(--text-color-primary)', borderBottom: '1px solid var(--border-color-primary)' }}>
            通用说明
          </h3>
          <div style={{ padding: 24 }}>
            <h4 style={{ color: 'var(--text-color-primary)', margin: '16px 0 10px' }}>响应格式</h4>
            <pre style={{ background: 'var(--bg-color-secondary)', border: '1px solid var(--border-color-primary)', borderRadius: 4, padding: 14, fontSize: 13, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
              {`{"code": 200, "message": "success", "data": {}}`}
            </pre>
            <h4 style={{ color: 'var(--text-color-primary)', margin: '16px 0 10px' }}>状态码说明</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '10px 0' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid var(--border-color-primary)', padding: 12, background: 'var(--bg-color-secondary)', textAlign: 'left' }}>状态码</th>
                  <th style={{ border: '1px solid var(--border-color-primary)', padding: 12, background: 'var(--bg-color-secondary)', textAlign: 'left' }}>说明</th>
                </tr>
              </thead>
              <tbody>
                {[{ code: 200, desc: '请求成功' }, { code: 400, desc: '请求参数错误' }, { code: 401, desc: '未授权，需要登录' }, { code: 403, desc: '禁止访问' }, { code: 404, desc: '资源不存在' }, { code: 500, desc: '服务器内部错误' }].map((s) => (
                  <tr key={s.code}>
                    <td style={{ border: '1px solid var(--border-color-primary)', padding: 10, color: 'var(--text-color-primary)' }}>{s.code}</td>
                    <td style={{ border: '1px solid var(--border-color-primary)', padding: 10, color: 'var(--text-color-secondary)' }}>{s.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h4 style={{ color: 'var(--text-color-primary)', margin: '16px 0 10px' }}>认证说明</h4>
            <p style={{ color: 'var(--text-color-secondary)' }}>需要认证的接口需要在请求头中携带JWT token：</p>
            <pre style={{ background: 'var(--bg-color-secondary)', border: '1px solid var(--border-color-primary)', borderRadius: 4, padding: 14, fontSize: 13, overflowX: 'auto' }}>
              Authorization: Bearer {'<your_jwt_token>'}
            </pre>
          </div>
        </section>

        {/* API groups */}
        {filteredGroups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-color-secondary)' }}>
            <p>未找到匹配的API接口</p>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <section key={group.name} style={{ marginBottom: 0, borderBottom: '1px solid var(--border-color-primary)' }}>
              <h3 style={{ background: 'var(--bg-color-secondary)', margin: 0, padding: '16px 24px', fontSize: 18, color: 'var(--text-color-primary)', borderBottom: '1px solid var(--border-color-primary)' }}>
                {group.name}
              </h3>
              {group.description && (
                <div style={{ padding: '10px 24px', borderLeft: '4px solid #3b82f6', background: '#f0f8ff', borderBottom: '1px solid var(--border-color-primary)' }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#495057' }}>{group.description}</p>
                </div>
              )}
              {group.apis.map((api, apiIdx) => {
                const expandKey = `${group.name}-${apiIdx}`
                const expanded = expandedSet.has(expandKey)
                return (
                  <div key={apiIdx} style={{ borderBottom: '1px solid var(--border-color-primary)' }}>
                    <div
                      onClick={() => toggleExpand(expandKey)}
                      style={{
                        display: 'flex', alignItems: 'center', padding: '14px 24px', cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      className="hover:bg-[var(--bg-color-secondary)]"
                    >
                      <span style={{
                        padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, color: '#fff',
                        background: methodColor[api.method] || '#6b7280', minWidth: 56, textAlign: 'center', marginRight: 12,
                      }}>
                        {api.method}
                      </span>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-color-primary)', marginRight: 12, minWidth: 200 }}>
                        {highlightText(api.path)}
                      </span>
                      <span style={{ flex: 1, color: 'var(--text-color-primary)', fontWeight: 500, fontSize: 13 }}>
                        {highlightText(api.title)}
                      </span>
                      <span style={{ color: 'var(--text-color-tertiary)', marginLeft: 8 }}>
                        {expanded ? <>&#9660;</> : <>&#9654;</>}
                      </span>
                    </div>
                    {expanded && (
                      <div style={{ padding: '16px 24px', background: 'var(--bg-color-secondary)', borderTop: '1px solid var(--border-color-primary)' }}>
                        {api.description && (
                          <div style={{ marginBottom: 12, color: '#495057', fontSize: 13 }}>
                            <strong>描述：</strong>{highlightText(api.description)}
                          </div>
                        )}
                        {api.auth && (
                          <div style={{ marginBottom: 12, color: 'var(--color-danger, #ef4444)', fontSize: 13 }}>
                            <strong>需要认证：</strong>是
                          </div>
                        )}
                        {api.params && api.params.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <strong style={{ fontSize: 13 }}>请求参数：</strong>
                            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0', fontSize: 13 }}>
                              <thead>
                                <tr>
                                  <th style={{ border: '1px solid var(--border-color-primary)', padding: '8px 10px', background: 'var(--bg-color-primary)', textAlign: 'left' }}>参数名</th>
                                  <th style={{ border: '1px solid var(--border-color-primary)', padding: '8px 10px', background: 'var(--bg-color-primary)', textAlign: 'left' }}>类型</th>
                                  <th style={{ border: '1px solid var(--border-color-primary)', padding: '8px 10px', background: 'var(--bg-color-primary)', textAlign: 'left' }}>必填</th>
                                  <th style={{ border: '1px solid var(--border-color-primary)', padding: '8px 10px', background: 'var(--bg-color-primary)', textAlign: 'left' }}>说明</th>
                                </tr>
                              </thead>
                              <tbody>
                                {api.params.map((param) => (
                                  <tr key={param.name}>
                                    <td style={{ border: '1px solid var(--border-color-primary)', padding: '6px 10px', color: 'var(--text-color-primary)' }}>{param.name}</td>
                                    <td style={{ border: '1px solid var(--border-color-primary)', padding: '6px 10px', color: 'var(--text-color-secondary)' }}>{param.type}</td>
                                    <td style={{ border: '1px solid var(--border-color-primary)', padding: '6px 10px', color: 'var(--text-color-secondary)' }}>{param.required ? '是' : '否'}</td>
                                    <td style={{ border: '1px solid var(--border-color-primary)', padding: '6px 10px', color: 'var(--text-color-secondary)' }}>{param.description}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {api.example && (
                          <div style={{ marginTop: 12 }}>
                            <strong style={{ fontSize: 13 }}>响应示例：</strong>
                            <pre style={{ background: 'var(--bg-color-primary)', border: '1px solid var(--border-color-primary)', borderRadius: 4, padding: 12, fontSize: 12, overflowX: 'auto', whiteSpace: 'pre-wrap', marginTop: 6 }}>
                              {api.example}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </section>
          ))
        )}
      </div>
    </div>
  )
}
