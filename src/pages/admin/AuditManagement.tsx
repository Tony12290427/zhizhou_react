import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/utils/toastManager'
import DataTable from '@/components/admin/DataTable'
import type { Column } from '@/components/admin/DataTable'

interface Audit {
  id: number
  user_display_id: string
  nickname: string
  type: number
  real_name: string
  id_card: string
  contact_name: string
  contact_phone: string
  title: string
  description: string
  status: number
  created_at: string
}

const STATUS_MAP: Record<number, { text: string; color: string }> = {
  0: { text: '待审核', color: '#f59e0b' },
  1: { text: '已通过', color: '#22c55e' },
  2: { text: '已拒绝', color: '#ef4444' },
}

export default function AuditManagement() {
  const [data, setData] = useState<Audit[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('asc')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const query = new URLSearchParams()
      query.set('page', String(page))
      query.set('limit', String(pageSize))
      if (sortDirection) { query.set('sortField', sortField); query.set('sortOrder', sortDirection) }
      if (search) query.set('user_display_id', search)
      if (typeFilter) query.set('type', typeFilter)
      if (statusFilter) query.set('status', statusFilter)
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/admin/audit?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (result.code === 200) {
        setData(result.data?.data || result.data || [])
        setTotal(result.data?.pagination?.total || result.pagination?.total || 0)
      } else { toast.error(result.message || '加载失败') }
    } catch { toast.error('加载失败') } finally { setLoading(false) }
  }, [page, pageSize, sortField, sortDirection, search, typeFilter, statusFilter])

  useEffect(() => { fetchData() }, [fetchData])
  const handleSort = (key: string, d: 'asc' | 'desc' | null) => { setSortField(key); setSortDirection(d) }

  const doApproval = async (id: number, action: 'approve' | 'reject') => {
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/admin/audit/${id}/${action}`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}` },
      })
      const result = await res.json()
      if (result.code === 200) { toast.success(action === 'approve' ? '审核通过' : '已拒绝'); fetchData() }
      else { toast.error(result.message || '操作失败') }
    } catch { toast.error('操作失败') }
  }

  const handleDelete = async (ids: number[]) => {
    if (!window.confirm('确定要删除该认证申请吗？此操作不可撤销。')) return
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/admin/audit/${ids[0]}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      const result = await res.json()
      if (result.code === 200) { toast.success('已删除'); fetchData() } else { toast.error(result.message || '删除失败') }
    } catch { toast.error('删除失败') }
  }

  const columns: Column<Audit>[] = [
    { key: 'id', title: 'ID', sortable: true },
    { key: 'user_display_id', title: '用户知舟号' },
    { key: 'nickname', title: '用户昵称' },
    { key: 'type', title: '认证类型', render: (item) => item.type === 1 ? '官方认证' : item.type === 2 ? '个人认证' : '-' },
    { key: 'status', title: '审核状态', render: (item) => (
      <span style={{ color: STATUS_MAP[item.status]?.color }}>{STATUS_MAP[item.status]?.text || '-'}</span>
    )},
    { key: 'created_at', title: '申请时间', sortable: true },
  ]

  const rowActions = (item: Audit) => (
    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
      {item.status === 0 && (
        <>
          <button onClick={() => doApproval(item.id, 'approve')} style={{ ...actionBtnStyle, color: '#22c55e' }}>通过</button>
          <button onClick={() => doApproval(item.id, 'reject')} style={{ ...actionBtnStyle, color: '#f59e0b' }}>拒绝</button>
        </>
      )}
      <button onClick={() => handleDelete([item.id])} style={{ ...actionBtnStyle, color: 'var(--color-danger, #ef4444)' }}>删除</button>
    </div>
  )

  return (
    <DataTable
      columns={columns} data={data} loading={loading} total={total} page={page} pageSize={pageSize}
      onPageChange={setPage} onPageSizeChange={setPageSize} onSort={handleSort}
      sortField={sortField} sortDirection={sortDirection}
      onRefresh={fetchData} searchPlaceholder="搜索用户知舟号..." onSearch={setSearch} searchValue={search}
      hideCreate rowActions={rowActions}
      extraActions={
        <>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }} style={filterStyle}>
            <option value="">全部类型</option><option value="1">官方认证</option><option value="2">个人认证</option>
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} style={filterStyle}>
            <option value="">全部状态</option><option value="0">待审核</option><option value="1">已通过</option><option value="2">已拒绝</option>
          </select>
        </>
      }
    />
  )
}

const filterStyle: React.CSSProperties = { padding: '6px 10px', border: '1px solid var(--border-color-primary)', borderRadius: 999, fontSize: 12, background: 'var(--bg-color-primary)', color: 'var(--text-color-primary)', outline: 'none', height: 34, boxSizing: 'border-box' }
const actionBtnStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: '3px 8px', borderRadius: 4 }
