import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/utils/toastManager'
import DataTable from '@/components/admin/DataTable'
import type { Column } from '@/components/admin/DataTable'
import { adminApi } from '@/lib/api/index'

interface User {
  id: number
  user_id: string
  nickname: string
  avatar: string
  email: string
  follow_count: number
  fans_count: number
  like_count: number
  is_active: boolean
  ban_status: number
  ban_reason?: string
  ban_end_time?: string
  ban_created_at?: string
  ban_status_display: string
  created_at: string
}

export default function UserManagement() {
  const [data, setData] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('asc')
  const [search, setSearch] = useState('')
  const [searchUserId, setSearchUserId] = useState('')
  const [banStatusFilter, setBanStatusFilter] = useState('')

  // Ban modal state
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [banTarget, setBanTarget] = useState<User | null>(null)
  const [banReason, setBanReason] = useState('')
  const [banDuration, setBanDuration] = useState('permanent')
  const [banSubmitting, setBanSubmitting] = useState(false)

  // Unban confirm
  const [unbanTarget, setUnbanTarget] = useState<User | null>(null)
  const [showUnbanConfirm, setShowUnbanConfirm] = useState(false)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = {
        page,
        size: pageSize,
        sortField: sortDirection ? sortField : undefined,
        sortOrder: sortDirection || undefined,
      }
      if (search) params.keyword = search
      if (searchUserId) params.user_display_id = searchUserId
      if (banStatusFilter) params.ban_status = banStatusFilter

      const res: any = await adminApi.getUsers(params)
      // Backend returns { items, total, page, size } directly (or wrapped in data)
      const body = res?.data || res
      setData(body?.items || [])
      setTotal(body?.total || 0)
    } catch (e: any) {
      toast.error(e?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, sortField, sortDirection, search, searchUserId, banStatusFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSort = (key: string, direction: 'asc' | 'desc' | null) => {
    setSortField(key)
    setSortDirection(direction)
  }

  const handleDelete = async (ids: number[]) => {
    if (ids.length === 1) {
      const user = data.find((u) => u.id === ids[0])
      if (!window.confirm(`确定要删除用户《${user?.nickname || user?.user_id || ids[0]}》吗？此操作不可撤销。`)) return
      try {
        await adminApi.deleteUser(ids[0])
        toast.success('用户已删除')
        fetchData()
      } catch (e: any) {
        toast.error(e?.message || '删除失败')
      }
    } else {
      if (!window.confirm(`确定要删除选中的 ${ids.length} 个用户吗？此操作不可撤销。`)) return
      try {
        await adminApi.batchDeleteUsers(ids)
        toast.success(`已删除 ${ids.length} 个用户`)
        fetchData()
      } catch (e: any) {
        toast.error(e?.message || '批量删除失败')
      }
    }
  }

  const handleBan = (user: User) => {
    const isBanned = user.ban_status === 0 || user.ban_status === 3
    if (isBanned) {
      setUnbanTarget(user)
      setShowUnbanConfirm(true)
    } else {
      setBanTarget(user)
      setBanReason('')
      setBanDuration('permanent')
      setBanDialogOpen(true)
    }
  }

  const handleBanSubmit = async () => {
    if (!banTarget) return
    setBanSubmitting(true)
    try {
      let endTime: string | null = null
      if (banDuration !== 'permanent') {
        const now = new Date()
        const durations: Record<string, number> = { '1h': 3600000, '1d': 86400000, '7d': 604800000, '30d': 2592000000, '1y': 31536000000 }
        const ms = durations[banDuration] || 0
        endTime = new Date(now.getTime() + ms).toISOString().replace('T', ' ').substring(0, 19)
      }
      const res = await adminApi.updateUser(banTarget.id, {}) // use ban endpoint implicitly
      // Actually call ban endpoint via raw fetch since adminApi may not have ban
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/admin/users/${banTarget.id}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: banReason, end_time: endTime }),
      })
      const result = await response.json()
      if (result.code === 200) {
        toast.success('用户已封禁')
        setBanDialogOpen(false)
        setBanTarget(null)
        fetchData()
      } else {
        toast.error(result.message || '封禁失败')
      }
    } catch {
      toast.error('封禁失败')
    } finally {
      setBanSubmitting(false)
    }
  }

  const handleUnban = async () => {
    if (!unbanTarget) return
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/admin/users/${unbanTarget.id}/unban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (result.code === 200) {
        toast.success('用户已解封')
        setShowUnbanConfirm(false)
        setUnbanTarget(null)
        fetchData()
      } else {
        toast.error(result.message || '解封失败')
      }
    } catch {
      toast.error('解封失败')
    }
  }

  const columns: Column<User>[] = [
    { key: 'id', title: 'ID', sortable: true },
    { key: 'user_id', title: '知舟号' },
    { key: 'nickname', title: '用户昵称' },
    { key: 'email', title: '邮箱' },
    { key: 'follow_count', title: '关注数' },
    { key: 'fans_count', title: '粉丝数', sortable: true },
    { key: 'like_count', title: '获赞数', sortable: true },
    { key: 'is_active', title: '账号状态', render: (item) => (item.is_active ? '正常' : '禁用') },
    { key: 'ban_status_display', title: '封禁状态' },
    { key: 'created_at', title: '注册时间', sortable: true },
  ]

  const rowActions = (item: User) => (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      <button
        onClick={() => handleBan(item)}
        style={actionBtnStyle}
        title={item.ban_status === 0 || item.ban_status === 3 ? '解封' : '封禁'}
      >
        {item.ban_status === 0 || item.ban_status === 3 ? '解封' : '封禁'}
      </button>
      <button onClick={() => handleDelete([item.id])} style={{ ...actionBtnStyle, color: 'var(--color-danger, #ef4444)' }} title="删除">
        删除
      </button>
    </div>
  )

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSort={handleSort}
        sortField={sortField}
        sortDirection={sortDirection}
        onDelete={handleDelete}
        onBatchDelete={handleDelete}
        onRefresh={fetchData}
        searchPlaceholder="搜索用户..."
        onSearch={setSearch}
        searchValue={search}
        hideEdit
      />

      {/* Ban dialog */}
      {banDialogOpen && banTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setBanDialogOpen(false)} />
          <div
            className="relative z-10 w-full max-w-md rounded-lg p-6 mx-4"
            style={{ background: 'var(--bg-color-primary)', border: '1px solid var(--border-color-primary)' }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-color-primary)' }}>
              封禁用户 - {banTarget.nickname || banTarget.user_id}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color-primary)' }}>封禁原因</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md text-sm outline-none box-border"
                  style={{ borderColor: 'var(--border-color-primary)', background: 'var(--bg-color-primary)', color: 'var(--text-color-primary)' }}
                  placeholder="请输入封禁原因"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color-primary)' }}>封禁时长</label>
                <select
                  className="w-full px-3 py-2 border rounded-md text-sm outline-none box-border"
                  style={{ borderColor: 'var(--border-color-primary)', background: 'var(--bg-color-primary)', color: 'var(--text-color-primary)' }}
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value)}
                >
                  <option value="1h">1 小时</option>
                  <option value="1d">1 天</option>
                  <option value="7d">7 天</option>
                  <option value="30d">30 天</option>
                  <option value="1y">1 年</option>
                  <option value="permanent">永久封禁</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setBanDialogOpen(false)}
                className="px-4 py-2 rounded-md text-sm border cursor-pointer"
                style={{ borderColor: 'var(--border-color-primary)', color: 'var(--text-color-secondary)', background: 'transparent' }}
              >
                取消
              </button>
              <button
                onClick={handleBanSubmit}
                disabled={banSubmitting || !banReason.trim()}
                className="px-4 py-2 rounded-md text-sm text-white cursor-pointer disabled:opacity-50"
                style={{ background: 'var(--color-danger, #ef4444)' }}
              >
                {banSubmitting ? '处理中...' : '确定封禁'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unban confirm */}
      {showUnbanConfirm && unbanTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowUnbanConfirm(false)} />
          <div
            className="relative z-10 w-full max-w-md rounded-lg p-6 mx-4"
            style={{ background: 'var(--bg-color-primary)', border: '1px solid var(--border-color-primary)' }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-color-primary)' }}>确认解封</h3>
            <p className="text-sm mb-2" style={{ color: 'var(--text-color-secondary)' }}>
              确定要解封用户《{unbanTarget.nickname || unbanTarget.user_id}》吗？
            </p>
            {unbanTarget.ban_reason && (
              <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
                封禁原因：{unbanTarget.ban_reason}
              </p>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowUnbanConfirm(false); setUnbanTarget(null) }}
                className="px-4 py-2 rounded-md text-sm border cursor-pointer"
                style={{ borderColor: 'var(--border-color-primary)', color: 'var(--text-color-secondary)', background: 'transparent' }}
              >
                取消
              </button>
              <button
                onClick={handleUnban}
                className="px-4 py-2 rounded-md text-sm text-white cursor-pointer"
                style={{ background: 'var(--primary-color)' }}
              >
                确认解封
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (() => {
        const confirmed = window.confirm(`确定要删除用户《${deleteTarget.nickname || deleteTarget.user_id}》吗？此操作不可撤销。`)
        if (confirmed) {
          handleDelete([deleteTarget.id])
        }
        setDeleteTarget(null)
        return null
      })()}
    </>
  )
}

const actionBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 12,
  padding: '3px 8px',
  borderRadius: 4,
  color: 'var(--color-primary, #3b82f6)',
}
