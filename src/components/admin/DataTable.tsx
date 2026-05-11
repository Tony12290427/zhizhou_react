import { useState, useCallback, type ReactNode } from 'react'
import { Search, X, Plus, Trash2, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react'

export interface Column<T> {
  key: string
  title: string
  render?: (item: T) => ReactNode
  sortable?: boolean
  width?: string
}

export interface DataTableProps<T extends { id: number | string }> {
  columns: Column<T>[]
  data: T[]
  loading: boolean
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onSort: (key: string, direction: 'asc' | 'desc' | null) => void
  sortField?: string
  sortDirection?: 'asc' | 'desc' | null
  onCreate?: () => void
  onEdit?: (item: T) => void
  onDelete?: (ids: number[]) => void
  onBatchDelete?: (ids: number[]) => void
  onRefresh?: () => void
  createLabel?: string
  searchPlaceholder?: string
  onSearch?: (keyword: string) => void
  searchValue?: string
  extraActions?: ReactNode
  hideCreate?: boolean
  hideEdit?: boolean
  hideDelete?: boolean
  rowActions?: (item: T) => ReactNode
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export default function DataTable<T extends { id: number | string }>({
  columns,
  data,
  loading,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onSort,
  sortField,
  sortDirection,
  onCreate,
  onEdit,
  onDelete,
  onBatchDelete,
  onRefresh,
  createLabel = '新增',
  searchPlaceholder = '搜索...',
  onSearch,
  searchValue = '',
  extraActions,
  hideCreate = false,
  hideEdit = false,
  hideDelete = false,
  rowActions,
}: DataTableProps<T>) {
  const [batchMode, setBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<(number | string)[]>([])
  const [localSearch, setLocalSearch] = useState(searchValue)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const allSelected = data.length > 0 && selectedIds.length === data.length

  const handleSort = useCallback(
    (key: string) => {
      if (sortField === key) {
        if (sortDirection === 'asc') {
          onSort(key, 'desc')
        } else if (sortDirection === 'desc') {
          onSort(key, null)
        } else {
          onSort(key, 'asc')
        }
      } else {
        onSort(key, 'asc')
      }
    },
    [sortField, sortDirection, onSort],
  )

  const toggleBatchMode = useCallback(() => {
    setBatchMode((prev) => {
      if (prev) setSelectedIds([])
      return !prev
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(data.map((item) => item.id))
    }
  }, [allSelected, data])

  const toggleSelectOne = useCallback((id: number | string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))
  }, [])

  const handleSearch = useCallback(() => {
    onSearch?.(localSearch)
  }, [localSearch, onSearch])

  const handleClearSearch = useCallback(() => {
    setLocalSearch('')
    onSearch?.('')
  }, [onSearch])

  const handleBatchDelete = useCallback(() => {
    if (selectedIds.length === 0) return
    onBatchDelete?.(selectedIds.map(Number))
    setSelectedIds([])
    setBatchMode(false)
  }, [selectedIds, onBatchDelete])

  const getPageNumbers = useCallback((): (number | string)[] => {
    const pages: (number | string)[] = []
    const current = page
    const total = totalPages

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i)
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i)
        pages.push('...')
        pages.push(total)
      } else if (current >= total - 3) {
        pages.push(1)
        pages.push('...')
        for (let i = total - 4; i <= total; i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = current - 1; i <= current + 1; i++) pages.push(i)
        pages.push('...')
        pages.push(total)
      }
    }
    return pages
  }, [page, totalPages])

  const formatDate = (val: unknown): string => {
    if (!val) return '-'
    try {
      return new Date(val as string).toLocaleString('zh-CN')
    } catch {
      return String(val)
    }
  }

  const getSortIcon = (key: string) => {
    if (sortField !== key) {
      return (
        <span className="dt-sort-icons">
          <ChevronUp size={10} className="dt-sort-icon" />
          <ChevronDown size={10} className="dt-sort-icon" />
        </span>
      )
    }
    if (sortDirection === 'asc') {
      return (
        <span className="dt-sort-icons">
          <ChevronUp size={10} className="dt-sort-icon dt-sort-active" />
          <ChevronDown size={10} className="dt-sort-icon" />
        </span>
      )
    }
    if (sortDirection === 'desc') {
      return (
        <span className="dt-sort-icons">
          <ChevronUp size={10} className="dt-sort-icon" />
          <ChevronDown size={10} className="dt-sort-icon dt-sort-active" />
        </span>
      )
    }
    return (
      <span className="dt-sort-icons">
        <ChevronUp size={10} className="dt-sort-icon" />
        <ChevronDown size={10} className="dt-sort-icon" />
      </span>
    )
  }

  return (
    <div className="dt-root">
      {/* Header: search + actions */}
      <div className="dt-header">
        <div className="dt-header-left">
          {onSearch && (
            <div className="dt-search-bar">
              <div className="dt-search-input-wrap">
                <Search size={14} className="dt-search-icon" />
                <input
                  type="text"
                  className="dt-search-input"
                  placeholder={searchPlaceholder}
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch()
                  }}
                />
                {localSearch && (
                  <button className="dt-search-clear" onClick={handleClearSearch} type="button">
                    <X size={14} />
                  </button>
                )}
              </div>
              <button className="dt-btn dt-btn-outline dt-btn-sm" onClick={handleSearch} type="button">
                筛选
              </button>
              {localSearch && (
                <button className="dt-btn dt-btn-outline dt-btn-sm" onClick={handleClearSearch} type="button">
                  清空
                </button>
              )}
            </div>
          )}
        </div>
        <div className="dt-header-actions">
          {onBatchDelete && !batchMode && (
            <button className="dt-btn dt-btn-danger" onClick={toggleBatchMode} type="button">
              <Trash2 size={14} />
              批量删除
            </button>
          )}
          {batchMode && (
            <>
              <button
                className="dt-btn dt-btn-danger"
                onClick={handleBatchDelete}
                disabled={selectedIds.length === 0}
                type="button"
              >
                <Trash2 size={14} />
                确认删除 ({selectedIds.length})
              </button>
              <button className="dt-btn dt-btn-outline" onClick={toggleBatchMode} type="button">
                取消
              </button>
            </>
          )}
          {onCreate && !hideCreate && (
            <button className="dt-btn dt-btn-primary" onClick={onCreate} type="button">
              <Plus size={14} />
              {createLabel}
            </button>
          )}
          {onRefresh && (
            <button className="dt-btn dt-btn-secondary" onClick={onRefresh} type="button">
              <RefreshCw size={14} />
              刷新
            </button>
          )}
          {extraActions}
        </div>
      </div>

      {/* Table */}
      <div className="dt-table-wrap">
        <table className="dt-table">
          <thead>
            <tr>
              {batchMode && (
                <th className="dt-th-checkbox">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={col.sortable !== false ? 'dt-th-sortable' : ''}
                  onClick={() => {
                    if (col.sortable !== false) handleSort(col.key)
                  }}
                >
                  <div className="dt-th-content">
                    <span>{col.title}</span>
                    {col.sortable !== false && getSortIcon(col.key)}
                  </div>
                </th>
              ))}
              {(onEdit || onDelete || rowActions) && <th className="dt-th-actions">操作</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (batchMode ? 1 : 0) + (onEdit || onDelete || rowActions ? 1 : 0)}
                  className="dt-td-loading"
                >
                  <div className="dt-loading-spinner">
                    <div className="dt-spinner" />
                    <span>加载中...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (batchMode ? 1 : 0) + (onEdit || onDelete || rowActions ? 1 : 0)}
                  className="dt-td-empty"
                >
                  暂无数据
                </td>
              </tr>
            ) : (
              data.map((item, rowIdx) => (
                <tr key={item.id ?? rowIdx}>
                  {batchMode && (
                    <td className="dt-td-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelectOne(item.id)}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className="dt-td">
                      {col.render ? col.render(item) : formatCellValue(item, col.key, formatDate)}
                    </td>
                  ))}
                  {(onEdit || onDelete || rowActions) && (
                    <td className="dt-td dt-td-actions">
                      {rowActions ? (
                        rowActions(item)
                      ) : (
                        <div className="dt-action-icons">
                          {onEdit && !hideEdit && (
                            <button
                              className="dt-icon-btn"
                              onClick={() => onEdit(item)}
                              title="编辑"
                              type="button"
                            >
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                          )}
                          {onDelete && !hideDelete && (
                            <button
                              className="dt-icon-btn dt-icon-btn-danger"
                              onClick={() => onDelete([Number(item.id)])}
                              title="删除"
                              type="button"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="dt-pagination">
          <div className="dt-pagination-info">
            共 {total} 条记录，第 {page} / {totalPages} 页
          </div>
          <div className="dt-pagination-controls">
            <button
              className="dt-btn dt-btn-outline dt-btn-sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              type="button"
            >
              上一页
            </button>
            <div className="dt-page-numbers">
              {getPageNumbers().map((p, i) =>
                typeof p === 'string' ? (
                  <span key={`ellipsis-${i}`} className="dt-page-ellipsis">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    className={`dt-btn dt-btn-sm ${p === page ? 'dt-btn-primary' : 'dt-btn-outline'}`}
                    onClick={() => onPageChange(p)}
                    type="button"
                  >
                    {p}
                  </button>
                ),
              )}
            </div>
            <button
              className="dt-btn dt-btn-outline dt-btn-sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              type="button"
            >
              下一页
            </button>
          </div>
          <div className="dt-page-size-selector">
            <span>每页</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="dt-page-size-select"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>条</span>
          </div>
        </div>
      )}

      <style>{`
        .dt-root {
          --dt-bg: var(--color-surface, #fff);
          --dt-bg-secondary: var(--color-surface-secondary, #f9fafb);
          --dt-border: var(--color-border, #e5e7eb);
          --dt-text: var(--color-text, #111827);
          --dt-text-secondary: var(--color-text-secondary, #6b7280);
          --dt-primary: var(--color-primary, #3b82f6);
          --dt-primary-dark: var(--color-primary-dark, #2563eb);
          --dt-danger: var(--color-danger, #ef4444);
          --dt-danger-dark: var(--color-danger-dark, #dc2626);
          --dt-radius: var(--radius-md, 8px);
          background: var(--dt-bg);
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
        }
        .dt-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 16px 24px;
          border-bottom: 1px solid var(--dt-border);
          background: var(--dt-bg-secondary);
          gap: 16px;
          flex-shrink: 0;
          flex-wrap: wrap;
        }
        .dt-header-left {
          display: flex;
          flex: 1;
          min-width: 0;
        }
        .dt-header-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
          flex-wrap: wrap;
        }
        .dt-search-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .dt-search-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .dt-search-icon {
          position: absolute;
          left: 10px;
          color: var(--dt-text-secondary);
          pointer-events: none;
        }
        .dt-search-input {
          padding: 6px 32px 6px 32px;
          border: 1px solid var(--dt-border);
          border-radius: 999px;
          font-size: 13px;
          min-width: 180px;
          height: 34px;
          color: var(--dt-text);
          background: var(--dt-bg);
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.3s;
        }
        .dt-search-input:focus {
          border-color: var(--dt-primary);
        }
        .dt-search-clear {
          position: absolute;
          right: 6px;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--dt-text-secondary);
          padding: 2px;
          display: flex;
          align-items: center;
          border-radius: 50%;
        }
        .dt-search-clear:hover {
          background: var(--dt-bg-secondary);
          color: var(--dt-text);
        }

        .dt-btn {
          padding: 7px 14px;
          border: none;
          border-radius: var(--dt-radius);
          cursor: pointer;
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.3s;
          font-weight: 500;
          white-space: nowrap;
        }
        .dt-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .dt-btn-sm {
          padding: 5px 10px;
          font-size: 12px;
        }
        .dt-btn-primary {
          background: var(--dt-primary);
          color: #fff;
        }
        .dt-btn-primary:hover:not(:disabled) {
          background: var(--dt-primary-dark);
        }
        .dt-btn-secondary {
          background: var(--dt-text-secondary);
          color: #fff;
        }
        .dt-btn-secondary:hover:not(:disabled) {
          opacity: 0.85;
        }
        .dt-btn-outline {
          background: transparent;
          color: var(--dt-text-secondary);
          border: 1px solid var(--dt-border);
        }
        .dt-btn-outline:hover:not(:disabled) {
          background: var(--dt-bg-secondary);
        }
        .dt-btn-danger {
          background: var(--dt-danger);
          color: #fff;
        }
        .dt-btn-danger:hover:not(:disabled) {
          background: var(--dt-danger-dark);
        }

        .dt-table-wrap {
          flex: 1;
          overflow: auto;
          min-height: 0;
        }
        .dt-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: auto;
        }
        .dt-table th,
        .dt-table td {
          padding: 10px 14px;
          text-align: left;
          border-bottom: 1px solid var(--dt-border);
          word-break: break-all;
          vertical-align: top;
          font-size: 13px;
        }
        .dt-table th {
          background: var(--dt-bg-secondary);
          font-weight: 600;
          color: var(--dt-text);
          position: sticky;
          top: 0;
          z-index: 1;
        }
        .dt-table tbody tr:hover {
          background: var(--dt-bg-secondary);
        }
        .dt-th-sortable {
          cursor: pointer;
          user-select: none;
        }
        .dt-th-content {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
        }
        .dt-sort-icons {
          display: flex;
          flex-direction: column;
          gap: 0;
          flex-shrink: 0;
        }
        .dt-sort-icon {
          color: var(--dt-text-secondary);
          opacity: 0.4;
          transition: opacity 0.15s;
        }
        .dt-sort-active {
          opacity: 1;
          color: var(--dt-primary);
        }
        .dt-th-checkbox,
        .dt-td-checkbox {
          width: 44px;
          text-align: center;
          padding: 10px 6px !important;
        }
        .dt-th-checkbox input,
        .dt-td-checkbox input {
          cursor: pointer;
          transform: scale(1.15);
          accent-color: var(--dt-primary);
        }
        .dt-th-actions {
          width: 80px;
          text-align: center;
          white-space: nowrap;
        }
        .dt-td-actions {
          text-align: center;
          white-space: nowrap;
        }
        .dt-td-loading,
        .dt-td-empty {
          text-align: center;
          padding: 48px 16px !important;
          color: var(--dt-text-secondary);
          font-size: 14px;
        }
        .dt-loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .dt-spinner {
          width: 28px;
          height: 28px;
          border: 3px solid var(--dt-border);
          border-top-color: var(--dt-primary);
          border-radius: 50%;
          animation: dt-spin 0.8s linear infinite;
        }
        @keyframes dt-spin {
          to { transform: rotate(360deg); }
        }
        .dt-action-icons {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
        .dt-icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          color: var(--dt-text-secondary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .dt-icon-btn:hover {
          background: var(--dt-bg-secondary);
          color: var(--dt-primary);
        }
        .dt-icon-btn-danger:hover {
          color: var(--dt-danger);
        }

        .dt-pagination {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 8px 24px;
          border-top: 1px solid var(--dt-border);
          background: var(--dt-bg-secondary);
          flex-shrink: 0;
        }
        .dt-pagination-info {
          color: var(--dt-text-secondary);
          font-size: 13px;
          user-select: none;
        }
        .dt-pagination-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .dt-page-numbers {
          display: flex;
          gap: 4px;
        }
        .dt-page-ellipsis {
          padding: 4px 6px;
          color: var(--dt-text-secondary);
          user-select: none;
        }
        .dt-page-size-selector {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--dt-text-secondary);
        }
        .dt-page-size-select {
          padding: 3px 6px;
          border: 1px solid var(--dt-border);
          border-radius: 4px;
          font-size: 12px;
          background: var(--dt-bg);
          color: var(--dt-text);
          outline: none;
        }

        /* responsive */
        @media (max-width: 768px) {
          .dt-header {
            padding: 12px 12px;
            flex-direction: column;
          }
          .dt-header-actions {
            width: 100%;
            justify-content: flex-end;
          }
          .dt-search-input {
            min-width: 120px;
          }
          .dt-table th,
          .dt-table td {
            padding: 8px 10px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  )
}

function formatCellValue<T>(item: T, key: string, formatDate: (v: unknown) => string): ReactNode {
  const val = (item as Record<string, unknown>)[key]
  if (val === null || val === undefined) return '-'
  if (typeof val === 'boolean') return val ? '是' : '否'
  if (val instanceof Date || (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val))) {
    return formatDate(val)
  }
  if (Array.isArray(val)) return val.join(', ')
  return String(val)
}
