// zhizhou_be has no categories endpoint — use static categories
const STATIC_CATEGORIES = [
  { id: 1, name: '技术' },
  { id: 2, name: '生活' },
  { id: 3, name: '美食' },
  { id: 4, name: '旅行' },
  { id: 5, name: '学习' },
  { id: 6, name: '数码' },
  { id: 7, name: '娱乐' },
  { id: 8, name: '其他' },
]

export async function getCategories(_params?: Record<string, unknown>) {
  return { success: true, data: STATIC_CATEGORIES }
}

export async function getCategoryDetail(_categoryId: number) {
  return { success: false, data: null, message: 'Categories not available in zhizhou_be' }
}

export async function createCategory(_data: Record<string, unknown>) {
  return { success: false, data: null, message: 'Categories not available in zhizhou_be' }
}

export async function updateCategory(_categoryId: number, _data: Record<string, unknown>) {
  return { success: false, data: null, message: 'Categories not available in zhizhou_be' }
}

export async function deleteCategory(_categoryId: number) {
  return { success: false, data: null, message: 'Categories not available in zhizhou_be' }
}
