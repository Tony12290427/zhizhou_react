export interface Comment {
  id: number
  post_id: number
  user_id: number
  parent_id: number | null
  content: string
  like_count: number
  created_at: string
  userInfo?: CommentUserInfo
  isLiked?: boolean
  replies?: Comment[]
  replyData?: ReplyData
}

export interface CommentUserInfo {
  id: number
  nickname: string
  avatar: string
  user_id: string
  verified?: number
}

export interface ReplyData {
  comments: Comment[]
  hasMore: boolean
  loading: boolean
  page: number
  total: number
  expanded: boolean
}

export interface PostComments {
  comments: Comment[]
  loading: boolean
  loaded: boolean
  error?: string
  hasMore: boolean
  page: number
  total: number
}
