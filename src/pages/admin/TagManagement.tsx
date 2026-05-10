import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/utils/toastManager'
import DataTable from '@/components/admin/DataTable'
import type { Column } from '@/components/admin/DataTable'
import { adminApi } from '@/lib/api/index'

interface Tag {
  id: number
  name: string
  use_count: number
  created_at: string
}

export default function TagManagement() {
  const [data, setData] = useState<Tag[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('asc')
  const [search, setSearch] = useState('')

  const [editOpen, setEditOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Tag | null>(null)
  const [editName, setEditName] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit: pageSize, sortField: sortDirection ? sortField : undefined, sortOrder: sortDirection || undefined }
      if (search) params.name = search
      const res = await adminApi.getTags(params)
      if (res.success) {
        setData(Array.isArray(res.data) ? res.data : res.data?.data || [])
        setTotal(res.data?.pagination?.total || res.pagination?.total || 0)
      } else { toast.error(res.message || '加载失败') }
    } catch { toast.error('加载失败') } finally { setLoading(false) }
  }, [page, pageSize, sortField, sortDirection, search])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSort = (key: string, d: 'asc' | 'desc' | null) => { setSortField(key); setSortDirection(d) }

  const handleCreate = () => { setCreateName(''); setCreateOpen(true) }
  const handleCreateSubmit = async () => {
    if (!createName.trim()) { toast.error('请输入标签名称'); return }
    setCreateSubmitting(true)
    try {
      const res = await adminApi.createTag({ name: createName.trim() })
      if (res.success) { toast.success('标签已创建'); setCreateOpen(false); fetchData() } else { toast.error(res.message || '创建失败') }
    } catch { toast.error('创建失败') } finally { setCreateSubmitting(false) }
  }

  const handleEdit = (item: Tag) => { setEditingItem(item); setEditName(item.name); setEditOpen(true) }
  const handleEditSubmit = async () => {
    if (!editingItem) return
    setEditSubmitting(true)
    try {
      const res = await adminApi.updateTag(editingItem.id, { name: editName.trim() })
      if (res.success) { toast.success('标签已更新'); setEditOpen(false); setEditingItem(null); fetchData() } else { toast.error(res.message || '更新失败') }
    } catch { toast.error('更新失败') } finally { setEditSubmitting(false) }
  }

  const handleDelete = async (ids: number[]) => {
    if (!window.confirm(ids.length === 1 ? '确定要删除该标签吗？' : `确定要删除选中的 ${ids.length} 个标签吗？`)) return
    try {
      const res = ids.length === 1 ? await adminApi.deleteTag(ids[0]) : await adminApi.batchDeleteTags(ids)
      if (res.success) { toast.success('标签已删除'); fetchData() } else { toast.error(res.message || '删除失败') }
    } catch { toast.error('删除失败') }
  }

  const columns: Column<Tag>[] = [
    { key: 'id', title: 'ID', sortable: true },
    { key: 'name', title: '标签名称' },
    { key: 'use_count', title: '使用次数', sortable: true },
    { key: 'created_at', title: '创建时间', sortable: true },
  ]

  return (
    <>
      <DataTable
        columns={columns} data={data} loading={loading} total={total} page={page} pageSize={pageSize}
        onPageChange={setPage} onPageSizeChange={setPageSize} onSort={handleSort}
        sortField={sortField} sortDirection={sortDirection}
        onCreate={handleCreate} onEdit={handleEdit} onDelete={handleDelete} onBatchDelete={handleDelete}
        onRefresh={fetchData} searchPlaceholder="搜索标签名称..." onSearch={setSearch} searchValue={search}
      />
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCreateOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-lg p-6 mx-4" style={{ background: 'var(--bg-color-primary)', border: '1px solid var(--border-color-primary)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-color-primary)' }}>新增标签</h3>
            <input type="text" className="w-full px-3 py-2 border rounded-md text-sm outline-none box-border" placeholder="请输入标签名称"
              style={{ borderColor: 'var(--border-color-primary)', background: 'var(--bg-color-primary)', color: 'var(--text-color-primary)' }}
              value={createName} onChange={(e) => setCreateName(e.target.value)} />
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
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-color-primary)' }}>编辑标签</h3>
            <input type="text" className="w-full px-3 py-2 border rounded-md text-sm outline-none box-border"
              style={{ borderColor: 'var(--border-color-primary)', background: 'var(--bg-color-primary)', color: 'var(--text-color-primary)' }}
              value={editName} onChange={(e) => setEditName(e.target.value)} />
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
