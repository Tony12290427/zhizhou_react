import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/utils/toastManager'
import DataTable from '@/components/admin/DataTable'
import type { Column } from '@/components/admin/DataTable'
import { adminApi } from '@/lib/api/index'

interface Like {
  id: number
  user_id: number
  user_display_id: string
  target_type: number
  target_id: number
  created_at: string
}

const TYPE_MAP: Record<number, string> = { 1: '笔记', 2: '评论' }

export default function LikeManagement() {
  const [data, setData] = useState<Like[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('asc')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit: pageSize, sortField: sortDirection ? sortField : undefined, sortOrder: sortDirection || undefined }
      if (search) params.user_display_id = search
      if (typeFilter) params.target_type = typeFilter
      const res = await adminApi.getLikes(params)
      if (res.success) {
        setData(Array.isArray(res.data) ? res.data : res.data?.data || [])
        setTotal(res.data?.pagination?.total || res.pagination?.total || 0)
      } else { toast.error(res.message || '加载失败') }
    } catch { toast.error('加载失败') } finally { setLoading(false) }
  }, [page, pageSize, sortField, sortDirection, search, typeFilter])

  useEffect(() => { fetchData() }, [fetchData])
  const handleSort = (key: string, d: 'asc' | 'desc' | null) => { setSortField(key); setSortDirection(d) }

  const handleDelete = async (ids: number[]) => {
    if (!window.confirm(ids.length === 1 ? '确定要删除该点赞记录吗？' : `确定要删除选中的 ${ids.length} 条点赞记录吗？`)) return
    try {
      const res = ids.length === 1 ? await adminApi.deleteLike(ids[0]) : await adminApi.batchDeleteLikes(ids)
      if (res.success) { toast.success('已删除'); fetchData() } else { toast.error(res.message || '删除失败') }
    } catch { toast.error('删除失败') }
  }

  const columns: Column<Like>[] = [
    { key: 'id', title: 'ID', sortable: true },
    { key: 'user_display_id', title: '用户知舟号' },
    { key: 'user_id', title: '用户ID' },
    { key: 'target_type', title: '目标类型', render: (item) => TYPE_MAP[item.target_type] || String(item.target_type) },
    { key: 'target_id', title: '目标ID' },
    { key: 'created_at', title: '点赞时间', sortable: true },
  ]

  return (
    <DataTable
      columns={columns} data={data} loading={loading} total={total} page={page} pageSize={pageSize}
      onPageChange={setPage} onPageSizeChange={setPageSize} onSort={handleSort}
      sortField={sortField} sortDirection={sortDirection}
      onDelete={handleDelete} onBatchDelete={handleDelete}
      onRefresh={fetchData} searchPlaceholder="搜索用户知舟号..." onSearch={setSearch} searchValue={search} hideEdit hideCreate
      extraActions={
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }} style={filterStyle}>
          <option value="">全部类型</option><option value="1">笔记</option><option value="2">评论</option>
        </select>
      }
    />
  )
}

const filterStyle: React.CSSProperties = { padding: '6px 10px', border: '1px solid var(--border-color-primary)', borderRadius: 999, fontSize: 12, background: 'var(--bg-color-primary)', color: 'var(--text-color-primary)', outline: 'none', height: 34, boxSizing: 'border-box' }
