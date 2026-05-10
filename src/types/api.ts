export interface ApiResponse<T = unknown> {
  success: boolean
  code?: number
  message: string
  data: T
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  pages: number
}

export interface PaginatedData<T> {
  data: T[]
  pagination: PaginationMeta
}

export interface PaginatedResponse<T> {
  posts?: T[]
  hasMore?: boolean
  users?: T[]
  total?: number
  [key: string]: unknown
}
