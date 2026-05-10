import { create } from 'zustand'

const STORAGE_KEY = 'searchHistory'
const MAX_ITEMS = 5

interface SearchHistoryState {
  searchHistory: string[]
  addSearchRecord: (keyword: string) => void
  removeSearchRecord: (keyword: string) => void
  clearSearchHistory: () => void
  getRecentSearches: () => string[]
}

function loadSearchHistory(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('加载搜索历史失败:', error)
  }
  return []
}

function saveSearchHistory(history: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch (error) {
    console.error('保存搜索历史失败:', error)
  }
}

export const useSearchHistoryStore = create<SearchHistoryState>((set, get) => ({
  searchHistory: loadSearchHistory(),

  addSearchRecord: (keyword: string) => {
    if (!keyword || !keyword.trim()) return

    const trimmedKeyword = keyword.trim()
    const { searchHistory } = get()

    // 移除已存在的相同记录
    const existingIndex = searchHistory.indexOf(trimmedKeyword)
    const updated = [...searchHistory]
    if (existingIndex > -1) {
      updated.splice(existingIndex, 1)
    }

    // 添加到开头
    updated.unshift(trimmedKeyword)

    // 保持最多5条记录
    const sliced = updated.slice(0, MAX_ITEMS)

    saveSearchHistory(sliced)
    set({ searchHistory: sliced })
  },

  removeSearchRecord: (keyword: string) => {
    const { searchHistory } = get()
    const index = searchHistory.indexOf(keyword)
    if (index > -1) {
      const updated = [...searchHistory]
      updated.splice(index, 1)
      saveSearchHistory(updated)
      set({ searchHistory: updated })
    }
  },

  clearSearchHistory: () => {
    saveSearchHistory([])
    set({ searchHistory: [] })
  },

  getRecentSearches: () => {
    return get().searchHistory.slice(0, MAX_ITEMS)
  },
}))
