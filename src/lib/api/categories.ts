// zhizhou_be has no categories endpoint — return empty data silently
export async function getCategories(_params?: Record<string, unknown>) {
  return { success: true, data: [] }
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
