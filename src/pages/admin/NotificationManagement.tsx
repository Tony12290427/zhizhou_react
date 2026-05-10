import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/utils/toastManager'
import DataTable from '@/components/admin/DataTable'
import type { Column } from '@/components/admin/DataTable'
import { adminApi } from '@/lib/api/index'

interface Notification {
  id: number
  user_id: number
  user_display_id: string
  sender_id: number
  sender_display_id: string
  sender_nickname: string
  type: number
  title: string
  target_id: number | null
  is_read: boolean
  created_at: string
}

const TYPE_MAP: Record<number, string> = { 1: '点赞笔记', 2: '点赞评论', 3: '收藏笔记', 4: '评论笔记', 5: '回复评论', 6: '关注', 7: '评论提及', 8: '笔记提及' }

export default function NotificationManagement() {
  const [data, setData] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('asc')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [readFilter, setReadFilter] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit: pageSize, sortField: sortDirection ? sortField : undefined, sortOrder: sortDirection || undefined }
      if (search) params.user_display_id = search
      if (typeFilter) params.type = typeFilter
      if (readFilter) params.is_read = readFilter
      const res = await adminApi.getNotifications(params)
      if (res.success) {
        setData(Array.isArray(res.data) ? res.data : res.data?.data || [])
        setTotal(res.data?.pagination?.total || res.pagination?.total || 0)
      } else { toast.error(res.message || '加载失败') }
    } catch { toast.error('加载失败') } finally { setLoading(false) }
  }, [page, pageSize, sortField, sortDirection, search, typeFilter, readFilter])

  useEffect(() => { fetchData() }, [fetchData])
  const handleSort = (key: string, d: 'asc' | 'desc' | null) => { setSortField(key); setSortDirection(d) }

  const handleDelete = async (ids: number[]) => {
    if (!window.confirm(ids.length === 1 ? '确定要删除该通知吗？' : `确定要删除选中的 ${ids.length} 条通知吗？`)) return
    try {
      const res = ids.length === 1 ? await adminApi.deleteNotification(ids[0]) : await adminApi.batchDeleteNotifications(ids)
      if (res.success) { toast.success('已删除'); fetchData() } else { toast.error(res.message || '删除失败') }
    } catch { toast.error('删除失败') }
  }

  const columns: Column<Notification>[] = [
    { key: 'id', title: 'ID', sortable: true },
    { key: 'user_display_id', title: '接收者账号' },
    { key: 'sender_display_id', title: '发送者账号' },
    { key: 'sender_nickname', title: '发送者昵称' },
    { key: 'type', title: '通知类型', render: (item) => TYPE_MAP[item.type] || String(item.type) },
    { key: 'title', title: '标题', render: (item) => <span style={{ maxWidth: 150, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title || '-'}</span> },
    { key: 'is_read', title: '已读', render: (item) => item.is_read ? '是' : '否' },
    { key: 'created_at', title: '创建时间', sortable: true },
  ]

  return (
    <DataTable
      columns={columns} data={data} loading={loading} total={total} page={page} pageSize={pageSize}
      onPageChange={setPage} onPageSizeChange={setPageSize} onSort={handleSort}
      sortField={sortField} sortDirection={sortDirection}
      onDelete={handleDelete} onBatchDelete={handleDelete}
      onRefresh={fetchData} searchPlaceholder="搜索接收者知舟号..." onSearch={setSearch} searchValue={search} hideEdit hideCreate
      extraActions={
        <>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }} style={filterStyle}>
            <option value="">全部类型</option>
            {Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={readFilter} onChange={(e) => { setReadFilter(e.target.value); setPage(1) }} style={filterStyle}>
            <option value="">全部状态</option><option value="1">已读</option><option value="0">未读</option>
          </select>
        </>
      }
    />
  )
}

const filterStyle: React.CSSProperties = { padding: '6px 10px', border: '1px solid var(--border-color-primary)', borderRadius: 999, fontSize: 12, background: 'var(--bg-color-primary)', color: 'var(--text-color-primary)', outline: 'none', height: 34, boxSizing: 'border-box' }
