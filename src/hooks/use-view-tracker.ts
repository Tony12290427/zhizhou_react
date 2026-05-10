import { useEffect } from 'react'

/**
 * 浏览量防重复工具
 * 基于Cookie实现防止短时间内重复刷浏览量
 */

// Cookie有效期（毫秒）- 1小时
const VIEW_COOKIE_DURATION = 60 * 60 * 1000

/**
 * 设置Cookie
 */
function setCookie(name: string, value: string, expires: number) {
  const date = new Date()
  date.setTime(date.getTime() + expires)
  const expiresStr = `expires=${date.toUTCString()}`
  document.cookie = `${name}=${value}; ${expiresStr}; path=/; SameSite=Lax`
}

/**
 * 获取Cookie
 */
function getCookie(name: string): string | null {
  const nameEQ = `${name}=`
  const cookies = document.cookie.split(';')

  for (let cookie of cookies) {
    cookie = cookie.trim()
    if (cookie.indexOf(nameEQ) === 0) {
      return cookie.substring(nameEQ.length)
    }
  }
  return null
}

/**
 * 检查是否已经浏览过该帖子
 */
function hasViewedPost(postId: number): boolean {
  const cookieName = `post_viewed_${postId}`
  const viewedTime = getCookie(cookieName)

  if (!viewedTime) {
    return false
  }

  // 检查是否在有效期内
  const currentTime = Date.now()
  const lastViewTime = parseInt(viewedTime, 10)

  if (isNaN(lastViewTime)) {
    return false
  }

  return currentTime - lastViewTime < VIEW_COOKIE_DURATION
}

/**
 * 标记帖子为已浏览
 */
function markPostAsViewed(postId: number) {
  const cookieName = `post_viewed_${postId}`
  const currentTime = Date.now().toString()

  setCookie(cookieName, currentTime, VIEW_COOKIE_DURATION)
}

/**
 * 页面浏览追踪 Hook
 * 用法：useViewTracker(postId)
 *
 * 组件挂载时检查并记录浏览量，防止短时间内重复计数
 */
export function useViewTracker(postId: number) {
  useEffect(() => {
    if (!hasViewedPost(postId)) {
      markPostAsViewed(postId)
    }
  }, [postId])
}
