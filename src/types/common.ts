export type ThemeMode = 'system' | 'light' | 'dark'

export type ThemeColor = 'red' | 'blue' | 'green' | 'purple' | 'orange'

export type FollowButtonType = 'follow' | 'unfollow' | 'mutual' | 'back'

export type NotificationType =
  | 1  // like post
  | 2  // like comment
  | 3  // collect
  | 4  // comment
  | 5  // reply
  | 6  // follow
  | 7  // @ in comment
  | 8  // @ in post

export interface Notification {
  id: number
  user_id: number
  sender_id: number
  type: NotificationType
  title: string
  target_id: number
  comment_id?: number
  is_read: boolean
  created_at: string
  senderInfo?: {
    nickname: string
    avatar: string
    user_id: string
  }
}

export interface SearchTab {
  id: string
  label: string
}

export interface Channel {
  id: number
  name: string
  category_title: string
  post_count?: number
}
