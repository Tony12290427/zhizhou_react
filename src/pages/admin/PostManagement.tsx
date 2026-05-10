import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/utils/toastManager'
import DataTable from '@/components/admin/DataTable'
import type { Column } from '@/components/admin/DataTable'
import { adminApi } from '@/lib/api/index'

interface Post {
  id: number
  title: string
  user_display_id: string
  category: string
  type: number
  status: number
  view_count: number
  like_count: number
  collect_count: number
  comment_count: number
  created_at: string
}

const STATUS_MAP: Record<number, string> = { 0: '已发布', 1: '草稿', 2: '待审核', 3: '未过审' }
const TYPE_MAP: Record<number, string> = { 1: '图文', 2: '视频' }

export default function PostManagement() {
  const [data, setData] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('asc')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Post | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editStatus, setEditStatus] = useState(0)
  const [editSubmitting, setEditSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = {
        page,
        size: pageSize,
        sortField: sortDirection ? sortField : undefined,
        sortOrder: sortDirection || undefined,
      }
      if (search) params.title = search
      if (statusFilter) params.status = statusFilter
      if (typeFilter) params.type = typeFilter

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
  }, [page, pageSize, sortField, sortDirection, search, statusFilter, typeFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSort = (key: string, direction: 'asc' | 'desc' | null) => {
    setSortField(key)
    setSortDirection(direction)
  }

  const handleEdit = (post: Post) => {
    setEditingItem(post)
    setEditTitle(post.title)
    setEditStatus(post.status)
    setEditOpen(true)
  }

  const handleEditSubmit = async () => {
    if (!editingItem) return
    setEditSubmitting(true)
    try {
      await adminApi.updatePost(editingItem.id, { title: editTitle, status: editStatus })
      toast.success('笔记已更新')
      setEditOpen(false)
      setEditingItem(null)
      fetchData()
    } catch {
      toast.error('更新失败')
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDelete = async (ids: number[]) => {
    if (ids.length === 1) {
      if (!window.confirm(`确定要删除该笔记吗？此操作不可撤销。`)) return
      try {
        await adminApi.deletePost(ids[0])
        toast.success('笔记已删除')
        fetchData()
      } catch (e: any) { toast.error(e?.message || '删除失败') }
    } else {
      if (!window.confirm(`确定要删除选中的 ${ids.length} 篇笔记吗？此操作不可撤销。`)) return
      try {
        await adminApi.batchDeletePosts(ids)
        toast.success(`已删除 ${ids.length} 篇笔记`)
        fetchData()
      } catch (e: any) { toast.error(e?.message || '批量删除失败') }
    }
  }

  const columns: Column<Post>[] = [
    { key: 'id', title: 'ID', sortable: true },
    { key: 'title', title: '标题' },
    { key: 'user_display_id', title: '知舟号' },
    { key: 'category', title: '分类' },
    { key: 'type', title: '类型', render: (item) => TYPE_MAP[item.type] || '-' },
    { key: 'status', title: '状态', render: (item) => (
      <span style={{ color: item.status === 2 ? '#f59e0b' : item.status === 3 ? '#ef4444' : item.status === 1 ? '#6b7280' : '#22c55e' }}>
        {STATUS_MAP[item.status] || '-'}
      </span>
    )},
    { key: 'view_count', title: '浏览', sortable: true },
    { key: 'like_count', title: '点赞', sortable: true },
    { key: 'collect_count', title: '收藏', sortable: true },
    { key: 'comment_count', title: '评论', sortable: true },
    { key: 'created_at', title: '发布时间', sortable: true },
  ]

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
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBatchDelete={handleDelete}
        onRefresh={fetchData}
        searchPlaceholder="搜索标题..."
        onSearch={setSearch}
        searchValue={search}
        extraActions={
          <>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              style={filterSelectStyle}
            >
              <option value="">全部状态</option>
              <option value="0">已发布</option>
              <option value="1">草稿</option>
              <option value="2">待审核</option>
              <option value="3">未过审</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
              style={filterSelectStyle}
            >
              <option value="">全部类型</option>
              <option value="1">图文</option>
              <option value="2">视频</option>
            </select>
          </>
        }
      />

      {/* Edit Modal */}
      {editOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditOpen(false)} />
          <div
            className="relative z-10 w-full max-w-md rounded-lg p-6 mx-4"
            style={{ background: 'var(--bg-color-primary)', border: '1px solid var(--border-color-primary)' }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-color-primary)' }}>
              编辑笔记 - ID: {editingItem.id}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color-primary)' }}>标题</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md text-sm outline-none box-border"
                  style={{ borderColor: 'var(--border-color-primary)', background: 'var(--bg-color-primary)', color: 'var(--text-color-primary)' }}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color-primary)' }}>状态</label>
                <select
                  className="w-full px-3 py-2 border rounded-md text-sm outline-none box-border"
                  style={{ borderColor: 'var(--border-color-primary)', background: 'var(--bg-color-primary)', color: 'var(--text-color-primary)' }}
                  value={editStatus}
                  onChange={(e) => setEditStatus(Number(e.target.value))}
                >
                  <option value={0}>已发布</option>
                  <option value={1}>草稿</option>
                  <option value={2}>待审核</option>
                  <option value={3}>未过审</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditOpen(false)} style={cancelBtnStyle}>取消</button>
              <button onClick={handleEditSubmit} disabled={editSubmitting} style={primaryBtnStyle}>
                {editSubmitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const filterSelectStyle: React.CSSProperties = {
  padding: '6px 10px',
  border: '1px solid var(--border-color-primary)',
  borderRadius: 999,
  fontSize: 12,
  background: 'var(--bg-color-primary)',
  color: 'var(--text-color-primary)',
  outline: 'none',
  height: 34,
  boxSizing: 'border-box',
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 6,
  fontSize: 13,
  border: '1px solid var(--border-color-primary)',
  color: 'var(--text-color-secondary)',
  background: 'transparent',
  cursor: 'pointer',
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 6,
  fontSize: 13,
  border: 'none',
  color: '#fff',
  background: 'var(--primary-color)',
  cursor: 'pointer',
}
