import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/utils/toastManager'
import DataTable from '@/components/admin/DataTable'
import type { Column } from '@/components/admin/DataTable'
import { categoryApi } from '@/lib/api/index'

interface Category {
  id: number
  name: string
  category_title: string
  post_count: number
  created_at: string
}

export default function CategoryManagement() {
  const [data, setData] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('asc')
  const [search, setSearch] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createTitle, setCreateTitle] = useState('')
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Category | null>(null)
  const [editName, setEditName] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const query = new URLSearchParams()
      query.set('page', String(page))
      query.set('limit', String(pageSize))
      if (sortDirection) { query.set('sortField', sortField); query.set('sortOrder', sortDirection) }
      if (search) query.set('name', search)
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/admin/categories?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (result.code === 200) {
        setData(result.data?.data || result.data || [])
        setTotal(result.data?.pagination?.total || result.pagination?.total || 0)
      } else { toast.error(result.message || '加载失败') }
    } catch { toast.error('加载失败') } finally { setLoading(false) }
  }, [page, pageSize, sortField, sortDirection, search])

  useEffect(() => { fetchData() }, [fetchData])
  const handleSort = (key: string, d: 'asc' | 'desc' | null) => { setSortField(key); setSortDirection(d) }

  const handleCreate = () => { setCreateName(''); setCreateTitle(''); setCreateOpen(true) }
  const handleCreateSubmit = async () => {
    if (!createName.trim() || !createTitle.trim()) { toast.error('请填写完整'); return }
    setCreateSubmitting(true)
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/admin/categories`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: createName.trim(), category_title: createTitle.trim() }),
      })
      const result = await res.json()
      if (result.code === 200) { toast.success('分类已创建'); setCreateOpen(false); fetchData() } else { toast.error(result.message || '创建失败') }
    } catch { toast.error('创建失败') } finally { setCreateSubmitting(false) }
  }

  const handleEdit = (item: Category) => { setEditingItem(item); setEditName(item.name); setEditTitle(item.category_title); setEditOpen(true) }
  const handleEditSubmit = async () => {
    if (!editingItem) return
    setEditSubmitting(true)
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/admin/categories/${editingItem.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editName.trim(), category_title: editTitle.trim() }),
      })
      const result = await res.json()
      if (result.code === 200) { toast.success('分类已更新'); setEditOpen(false); setEditingItem(null); fetchData() } else { toast.error(result.message || '更新失败') }
    } catch { toast.error('更新失败') } finally { setEditSubmitting(false) }
  }

  const handleDelete = async (ids: number[]) => {
    if (!window.confirm(ids.length === 1 ? '确定要删除该分类吗？' : `确定要删除选中的 ${ids.length} 个分类吗？`)) return
    try {
      const token = localStorage.getItem('admin_token')
      if (ids.length === 1) {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/admin/categories/${ids[0]}`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
        })
        const result = await res.json()
        if (result.code === 200) { toast.success('分类已删除'); fetchData() } else { toast.error(result.message || '删除失败') }
      } else {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/admin/categories`, {
          method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ids }),
        })
        const result = await res.json()
        if (result.code === 200) { toast.success(`已删除 ${ids.length} 个分类`); fetchData() } else { toast.error(result.message || '批量删除失败') }
      }
    } catch { toast.error('删除失败') }
  }

  const columns: Column<Category>[] = [
    { key: 'id', title: 'ID', sortable: true },
    { key: 'name', title: '分类名称' },
    { key: 'category_title', title: '英文标题' },
    { key: 'post_count', title: '笔记数量', sortable: true },
    { key: 'created_at', title: '创建时间', sortable: true },
  ]

  return (
    <>
      <DataTable
        columns={columns} data={data} loading={loading} total={total} page={page} pageSize={pageSize}
        onPageChange={setPage} onPageSizeChange={setPageSize} onSort={handleSort}
        sortField={sortField} sortDirection={sortDirection}
        onCreate={handleCreate} onEdit={handleEdit} onDelete={handleDelete} onBatchDelete={handleDelete}
        onRefresh={fetchData} searchPlaceholder="搜索分类名称..." onSearch={setSearch} searchValue={search}
      />
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCreateOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-lg p-6 mx-4" style={{ background: 'var(--bg-color-primary)', border: '1px solid var(--border-color-primary)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-color-primary)' }}>新增分类</h3>
            <div className="space-y-3">
              <input type="text" className="w-full px-3 py-2 border rounded-md text-sm outline-none box-border" placeholder="分类名称"
                style={{ borderColor: 'var(--border-color-primary)', background: 'var(--bg-color-primary)', color: 'var(--text-color-primary)' }}
                value={createName} onChange={(e) => setCreateName(e.target.value)} />
              <input type="text" className="w-full px-3 py-2 border rounded-md text-sm outline-none box-border" placeholder="英文标题（用于URL）"
                style={{ borderColor: 'var(--border-color-primary)', background: 'var(--bg-color-primary)', color: 'var(--text-color-primary)' }}
                value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setCreateOpen(false)} style={cancelBtnStyle}>取消</button>
              <button onClick={handleCreateSubmit} disabled={createSubmitting} style={primaryBtnStyle}>{createSubmitting ? '创建中...' : '创建'}</button>
            </div>
          </div>
        </div>
      )}
      {editOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-lg p-6 mx-4" style={{ background: 'var(--bg-color-primary)', border: '1px solid var(--border-color-primary)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-color-primary)' }}>编辑分类</h3>
            <div className="space-y-3">
              <input type="text" className="w-full px-3 py-2 border rounded-md text-sm outline-none box-border" placeholder="分类名称"
                style={{ borderColor: 'var(--border-color-primary)', background: 'var(--bg-color-primary)', color: 'var(--text-color-primary)' }}
                value={editName} onChange={(e) => setEditName(e.target.value)} />
              <input type="text" className="w-full px-3 py-2 border rounded-md text-sm outline-none box-border" placeholder="英文标题"
                style={{ borderColor: 'var(--border-color-primary)', background: 'var(--bg-color-primary)', color: 'var(--text-color-primary)' }}
                value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
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
