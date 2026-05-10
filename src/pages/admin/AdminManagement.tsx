import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/utils/toastManager'
import DataTable from '@/components/admin/DataTable'
import type { Column } from '@/components/admin/DataTable'
import { adminApi } from '@/lib/api/index'

interface Admin {
  id: number
  username: string
  password?: string
  created_at: string
}

export default function AdminManagement() {
  const [data, setData] = useState<Admin[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('asc')
  const [search, setSearch] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [createUsername, setCreateUsername] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Admin | null>(null)
  const [editPassword, setEditPassword] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit: pageSize, sortField: sortDirection ? sortField : undefined, sortOrder: sortDirection || undefined }
      if (search) params.search = search
      // Use admin route
      const res = await adminApi.getAdmins(params)
      if (res && res.success) {
        setData(Array.isArray(res.data) ? res.data : res.data?.data || [])
        setTotal(res.data?.pagination?.total || res.pagination?.total || 0)
      } else {
        // Try auth route
        const res2 = await adminApi.getAdminsAuth(params)
        if (res2 && res2.success) {
          setData(Array.isArray(res2.data) ? res2.data : res2.data?.data || [])
          setTotal(res2.data?.pagination?.total || res2.pagination?.total || 0)
        } else {
          toast.error(res?.message || res2?.message || '加载失败')
        }
      }
    } catch { toast.error('加载失败') } finally { setLoading(false) }
  }, [page, pageSize, sortField, sortDirection, search])

  useEffect(() => { fetchData() }, [fetchData])
  const handleSort = (key: string, d: 'asc' | 'desc' | null) => { setSortField(key); setSortDirection(d) }

  const handleCreate = () => { setCreateUsername(''); setCreatePassword(''); setCreateOpen(true) }
  const handleCreateSubmit = async () => {
    if (!createUsername.trim() || !createPassword.trim()) { toast.error('请填写完整'); return }
    setCreateSubmitting(true)
    try {
      const res = await adminApi.createAdminAuth({ username: createUsername.trim(), password: createPassword })
      if (res.success) { toast.success('管理员已创建'); setCreateOpen(false); fetchData() } else { toast.error(res.message || '创建失败') }
    } catch { toast.error('创建失败') } finally { setCreateSubmitting(false) }
  }

  const handleEdit = (item: Admin) => { setEditingItem(item); setEditPassword(''); setEditOpen(true) }
  const handleEditSubmit = async () => {
    if (!editingItem || !editPassword.trim()) { toast.error('请输入新密码'); return }
    setEditSubmitting(true)
    try {
      const res = await adminApi.updateAdminAuth(editingItem.id, { password: editPassword })
      if (res.success) { toast.success('密码已更新'); setEditOpen(false); setEditingItem(null); fetchData() } else { toast.error(res.message || '更新失败') }
    } catch { toast.error('更新失败') } finally { setEditSubmitting(false) }
  }

  const handleDelete = async (ids: number[]) => {
    if (!window.confirm(ids.length === 1 ? '确定要删除该管理员吗？' : `确定要删除选中的 ${ids.length} 个管理员吗？`)) return
    try {
      const res = ids.length === 1 ? await adminApi.deleteAdminAuth(ids[0]) : await adminApi.batchDeleteAdminsAuth(ids)
      if (res.success) { toast.success('已删除'); fetchData() } else { toast.error(res.message || '删除失败') }
    } catch { toast.error('删除失败') }
  }

  const columns: Column<Admin>[] = [
    { key: 'id', title: 'ID', sortable: true },
    { key: 'username', title: '账号' },
    { key: 'created_at', title: '创建时间', sortable: true },
  ]

  return (
    <>
      <DataTable
        columns={columns} data={data} loading={loading} total={total} page={page} pageSize={pageSize}
        onPageChange={setPage} onPageSizeChange={setPageSize} onSort={handleSort}
        sortField={sortField} sortDirection={sortDirection}
        onCreate={handleCreate} onEdit={handleEdit} onDelete={handleDelete} onBatchDelete={handleDelete}
        onRefresh={fetchData} searchPlaceholder="搜索账号..." onSearch={setSearch} searchValue={search}
      />
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCreateOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-lg p-6 mx-4" style={{ background: 'var(--bg-color-primary)', border: '1px solid var(--border-color-primary)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-color-primary)' }}>新增管理员</h3>
            <div className="space-y-3">
              <input type="text" className="w-full px-3 py-2 border rounded-md text-sm outline-none box-border" placeholder="账号"
                style={{ borderColor: 'var(--border-color-primary)', background: 'var(--bg-color-primary)', color: 'var(--text-color-primary)' }}
                value={createUsername} onChange={(e) => setCreateUsername(e.target.value)} />
              <input type="password" className="w-full px-3 py-2 border rounded-md text-sm outline-none box-border" placeholder="密码"
                style={{ borderColor: 'var(--border-color-primary)', background: 'var(--bg-color-primary)', color: 'var(--text-color-primary)' }}
                value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} />
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
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-color-primary)' }}>修改密码 - {editingItem.username}</h3>
            <input type="password" className="w-full px-3 py-2 border rounded-md text-sm outline-none box-border" placeholder="新密码"
              style={{ borderColor: 'var(--border-color-primary)', background: 'var(--bg-color-primary)', color: 'var(--text-color-primary)' }}
              value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
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
