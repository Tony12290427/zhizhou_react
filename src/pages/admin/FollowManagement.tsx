import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/utils/toastManager'
import DataTable from '@/components/admin/DataTable'
import type { Column } from '@/components/admin/DataTable'
import { adminApi } from '@/lib/api/index'

interface Follow {
  id: number
  follower_id: number
  follower_display_id: string
  follower_nickname: string
  following_id: number
  following_display_id: string
  following_nickname: string
  created_at: string
}

export default function FollowManagement() {
  const [data, setData] = useState<Follow[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('asc')
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit: pageSize, sortField: sortDirection ? sortField : undefined, sortOrder: sortDirection || undefined }
      if (search) params.user_display_id = search
      const res = await adminApi.getFollows(params)
      if (res.success) {
        setData(Array.isArray(res.data) ? res.data : res.data?.data || [])
        setTotal(res.data?.pagination?.total || res.pagination?.total || 0)
      } else { toast.error(res.message || '加载失败') }
    } catch { toast.error('加载失败') } finally { setLoading(false) }
  }, [page, pageSize, sortField, sortDirection, search])

  useEffect(() => { fetchData() }, [fetchData])
  const handleSort = (key: string, d: 'asc' | 'desc' | null) => { setSortField(key); setSortDirection(d) }

  const handleDelete = async (ids: number[]) => {
    if (!window.confirm(ids.length === 1 ? '确定要删除该关注记录吗？' : `确定要删除选中的 ${ids.length} 条关注记录吗？`)) return
    try {
      const res = ids.length === 1 ? await adminApi.deleteFollow(ids[0]) : await adminApi.batchDeleteFollows(ids)
      if (res.success) { toast.success('已删除'); fetchData() } else { toast.error(res.message || '删除失败') }
    } catch { toast.error('删除失败') }
  }

  const columns: Column<Follow>[] = [
    { key: 'id', title: 'ID', sortable: true },
    { key: 'follower_display_id', title: '关注者知舟号' },
    { key: 'follower_nickname', title: '关注者昵称' },
    { key: 'follower_id', title: '关注者ID' },
    { key: 'following_display_id', title: '被关注者知舟号' },
    { key: 'following_nickname', title: '被关注者昵称' },
    { key: 'following_id', title: '被关注者ID' },
    { key: 'created_at', title: '关注时间', sortable: true },
  ]

  return (
    <DataTable
      columns={columns} data={data} loading={loading} total={total} page={page} pageSize={pageSize}
      onPageChange={setPage} onPageSizeChange={setPageSize} onSort={handleSort}
      sortField={sortField} sortDirection={sortDirection}
      onDelete={handleDelete} onBatchDelete={handleDelete}
      onRefresh={fetchData} searchPlaceholder="搜索用户知舟号..." onSearch={setSearch} searchValue={search} hideEdit hideCreate
    />
  )
}
