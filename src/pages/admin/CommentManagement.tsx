import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/utils/toastManager'
import DataTable from '@/components/admin/DataTable'
import type { Column } from '@/components/admin/DataTable'
import { adminApi } from '@/lib/api/index'

interface Comment {
  id: number
  content: string
  user_id: number
  user_display_id: string
  post_id: number
  parent_id: number | null
  like_count: number
  created_at: string
}

export default function CommentManagement() {
  const [data, setData] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('asc')
  const [search, setSearch] = useState('')
  const [postIdFilter, setPostIdFilter] = useState('')

  const [editOpen, setEditOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Comment | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit: pageSize, sortField: sortDirection ? sortField : undefined, sortOrder: sortDirection || undefined }
      if (search) params.content = search
      if (postIdFilter) params.post_id = postIdFilter
      const res = await adminApi.getComments(params)
      if (res.success) {
        setData(Array.isArray(res.data) ? res.data : res.data?.data || [])
        setTotal(res.data?.pagination?.total || res.pagination?.total || 0)
      } else { toast.error(res.message || '加载失败') }
    } catch { toast.error('加载失败') }
    finally { setLoading(false) }
  }, [page, pageSize, sortField, sortDirection, search, postIdFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSort = (key: string, d: 'asc' | 'desc' | null) => { setSortField(key); setSortDirection(d) }

  const handleEdit = (item: Comment) => { setEditingItem(item); setEditContent(item.content); setEditOpen(true) }

  const handleEditSubmit = async () => {
    if (!editingItem) return
    setEditSubmitting(true)
    try {
      const res = await adminApi.updateComment(editingItem.id, { content: editContent })
      if (res.success) { toast.success('评论已更新'); setEditOpen(false); setEditingItem(null); fetchData() }
      else { toast.error(res.message || '更新失败') }
    } catch { toast.error('更新失败') } finally { setEditSubmitting(false) }
  }

  const handleDelete = async (ids: number[]) => {
    if (ids.length === 1) {
      if (!window.confirm('确定要删除该评论吗？此操作不可撤销。')) return
      try {
        const res = await adminApi.deleteComment(ids[0])
        if (res.success) { toast.success('评论已删除'); fetchData() } else { toast.error(res.message || '删除失败') }
      } catch { toast.error('删除失败') }
    } else {
      if (!window.confirm(`确定要删除选中的 ${ids.length} 条评论吗？`)) return
      try {
        const res = await adminApi.batchDeleteComments(ids)
        if (res.success) { toast.success(`已删除 ${ids.length} 条评论`); fetchData() } else { toast.error(res.message || '批量删除失败') }
      } catch { toast.error('批量删除失败') }
    }
  }

  const columns: Column<Comment>[] = [
    { key: 'id', title: 'ID', sortable: true },
    { key: 'content', title: '内容', render: (item) => <span style={{ maxWidth: 250, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.content}</span> },
    { key: 'user_display_id', title: '评论者知舟号' },
    { key: 'post_id', title: '笔记ID' },
    { key: 'parent_id', title: '父评论ID', render: (item) => item.parent_id || '-' },
    { key: 'like_count', title: '点赞数', sortable: true },
    { key: 'created_at', title: '评论时间', sortable: true },
  ]

  return (
    <>
      <DataTable
        columns={columns} data={data} loading={loading} total={total} page={page} pageSize={pageSize}
        onPageChange={setPage} onPageSizeChange={setPageSize} onSort={handleSort}
        sortField={sortField} sortDirection={sortDirection}
        onEdit={handleEdit} onDelete={handleDelete} onBatchDelete={handleDelete}
        onRefresh={fetchData} searchPlaceholder="搜索评论内容..." onSearch={setSearch} searchValue={search}
        extraActions={<input type="text" placeholder="笔记ID" value={postIdFilter} onChange={(e) => { setPostIdFilter(e.target.value); setPage(1) }}
          style={{ padding: '6px 10px', border: '1px solid var(--border-color-primary)', borderRadius: 999, fontSize: 12, background: 'var(--bg-color-primary)', color: 'var(--text-color-primary)', outline: 'none', height: 34, boxSizing: 'border-box' }} />}
      />
      {editOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-lg p-6 mx-4" style={{ background: 'var(--bg-color-primary)', border: '1px solid var(--border-color-primary)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-color-primary)' }}>编辑评论</h3>
            <textarea className="w-full px-3 py-2 border rounded-md text-sm outline-none box-border resize-none" rows={4}
              style={{ borderColor: 'var(--border-color-primary)', background: 'var(--bg-color-primary)', color: 'var(--text-color-primary)' }}
              value={editContent} onChange={(e) => setEditContent(e.target.value)} />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setEditOpen(false)} style={cancelBtnStyle}>取消</button>
              <button onClick={handleEditSubmit} disabled={editSubmitting} style={primaryBtnStyle}>{editSubmitting ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const cancelBtnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: 6, fontSize: 13, border: '1px solid var(--border-color-primary)', color: 'var(--text-color-secondary)', background: 'transparent', cursor: 'pointer' }
const primaryBtnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: 6, fontSize: 13, border: 'none', color: '#fff', background: 'var(--primary-color)', cursor: 'pointer' }
