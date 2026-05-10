import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/utils/toastManager'
import DataTable from '@/components/admin/DataTable'
import type { Column } from '@/components/admin/DataTable'
import { adminApi } from '@/lib/api/index'

interface PostAuditItem {
  id: number
  title: string
  user_display_id: string
  nickname: string
  status: number
  content: string
  created_at: string
}

export default function PostAudit() {
  const [data, setData] = useState<PostAuditItem[]>([])
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
      const params: Record<string, unknown> = {
        page,
        size: pageSize,
        sortField: sortDirection ? sortField : undefined,
        sortOrder: sortDirection || undefined,
        status: 'DRAFT', // pending / to-audit posts
      }
      if (search) params.keyword = search

      const res: any = await adminApi.getPosts(params)
      // Backend returns { items, total, page, size } directly (or wrapped in data)
      const body = res?.data || res
      setData(body?.items || [])
      setTotal(body?.total || 0)
    } catch (e: any) {
      toast.error(e?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, sortField, sortDirection, search])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSort = (key: string, direction: 'asc' | 'desc' | null) => { setSortField(key); setSortDirection(direction) }

  const handleApprove = async (id: number) => {
    try {
      await adminApi.auditPost(id, 'approve')
      toast.success('审核通过')
      fetchData()
    } catch (e: any) { toast.error(e?.message || '操作失败') }
  }

  const handleReject = async (id: number) => {
    try {
      await adminApi.auditPost(id, 'reject')
      toast.success('已拒绝发布')
      fetchData()
    } catch (e: any) { toast.error(e?.message || '操作失败') }
  }

  const handleDelete = async (ids: number[]) => {
    if (!window.confirm('确定要删除该笔记吗？此操作不可撤销。')) return
    try {
      await adminApi.deletePost(ids[0])
      toast.success('笔记已删除')
      fetchData()
    } catch (e: any) { toast.error(e?.message || '删除失败') }
  }

  const columns: Column<PostAuditItem>[] = [
    { key: 'id', title: 'ID', sortable: true },
    { key: 'title', title: '标题' },
    { key: 'user_display_id', title: '知舟号' },
    { key: 'nickname', title: '用户昵称' },
    { key: 'created_at', title: '发起时间', sortable: true },
  ]

  const rowActions = (item: PostAuditItem) => (
    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
      <button onClick={() => handleApprove(item.id)} style={{ ...actionBtnStyle, color: '#22c55e' }} title="审核通过">通过</button>
      <button onClick={() => handleReject(item.id)} style={{ ...actionBtnStyle, color: '#f59e0b' }} title="拒绝">拒绝</button>
      <button onClick={() => handleDelete([item.id])} style={{ ...actionBtnStyle, color: 'var(--color-danger, #ef4444)' }} title="删除">删除</button>
    </div>
  )

  return (
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
      onRefresh={fetchData}
      searchPlaceholder="搜索标题或内容..."
      onSearch={setSearch}
      searchValue={search}
      hideCreate
      rowActions={rowActions}
    />
  )
}

const actionBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: '3px 8px', borderRadius: 4,
}
