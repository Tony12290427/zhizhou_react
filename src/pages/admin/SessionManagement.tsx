import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/utils/toastManager'
import DataTable from '@/components/admin/DataTable'
import type { Column } from '@/components/admin/DataTable'
import { adminApi } from '@/lib/api/index'

interface Session {
  id: number
  user_id: number
  user_display_id: string
  user_agent: string
  is_active: boolean
  expires_at: string
  created_at: string
}

export default function SessionManagement() {
  const [data, setData] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('asc')
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit: pageSize, sortField: sortDirection ? sortField : undefined, sortOrder: sortDirection || undefined }
      if (search) params.user_display_id = search
      if (activeFilter) params.is_active = activeFilter
      const res = await adminApi.getSessions(params)
      if (res.success) {
        setData(Array.isArray(res.data) ? res.data : res.data?.data || [])
        setTotal(res.data?.pagination?.total || res.pagination?.total || 0)
      } else { toast.error(res.message || '加载失败') }
    } catch { toast.error('加载失败') } finally { setLoading(false) }
  }, [page, pageSize, sortField, sortDirection, search, activeFilter])

  useEffect(() => { fetchData() }, [fetchData])
  const handleSort = (key: string, d: 'asc' | 'desc' | null) => { setSortField(key); setSortDirection(d) }

  const handleDelete = async (ids: number[]) => {
    if (!window.confirm(ids.length === 1 ? '确定要删除该会话吗？' : `确定要删除选中的 ${ids.length} 个会话吗？`)) return
    try {
      const res = ids.length === 1 ? await adminApi.deleteSession(ids[0]) : await adminApi.batchDeleteSessions(ids)
      if (res.success) { toast.success('已删除'); fetchData() } else { toast.error(res.message || '删除失败') }
    } catch { toast.error('删除失败') }
  }

  const columns: Column<Session>[] = [
    { key: 'id', title: 'ID', sortable: true },
    { key: 'user_display_id', title: '用户知舟号' },
    { key: 'user_id', title: '用户ID' },
    { key: 'user_agent', title: '用户代理', render: (item) => <span style={{ maxWidth: 200, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.user_agent || '-'}</span> },
    { key: 'is_active', title: '活跃状态', render: (item) => item.is_active ? '是' : '否' },
    { key: 'expires_at', title: '过期时间', sortable: true },
    { key: 'created_at', title: '创建时间', sortable: true },
  ]

  return (
    <DataTable
      columns={columns} data={data} loading={loading} total={total} page={page} pageSize={pageSize}
      onPageChange={setPage} onPageSizeChange={setPageSize} onSort={handleSort}
      sortField={sortField} sortDirection={sortDirection}
      onDelete={handleDelete} onBatchDelete={handleDelete}
      onRefresh={fetchData} searchPlaceholder="搜索用户知舟号..." onSearch={setSearch} searchValue={search} hideEdit hideCreate
      extraActions={
        <select value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1) }} style={filterStyle}>
          <option value="">全部状态</option><option value="1">活跃</option><option value="0">非活跃</option>
        </select>
      }
    />
  )
}

const filterStyle: React.CSSProperties = { padding: '6px 10px', border: '1px solid var(--border-color-primary)', borderRadius: 999, fontSize: 12, background: 'var(--bg-color-primary)', color: 'var(--text-color-primary)', outline: 'none', height: 34, boxSizing: 'border-box' }
