export interface Tag {
  id: number
  name: string
  use_count?: number
}

export interface PostImage {
  id?: number
  image_url: string
}

export interface PostVideo {
  id?: number
  cover_url: string
  video_url: string
}

export interface PostOriginalData {
  content: string
  images: string[]
  tags: Tag[]
  createdAt?: string
  userId?: number
}

export interface TransformedPost {
  id: number
  image: string
  title: string
  content: string
  images: string[]
  video_url?: string
  cover_url?: string
  videos?: PostVideo[]
  avatar: string
  author: string
  location: string
  view_count: number
  like_count: number
  comment_count: number
  collect_count: number
  liked: boolean
  collected: boolean
  verified: number
  author_verified?: number
  created_at: string
  path: string
  category: string | number
  type: number
  author_auto_id?: number
  author_account?: string
  user_id?: number
  status?: number
  originalData: PostOriginalData
  tags: Tag[]
  aspectRatio?: number

  // Compatibility aliases used in WaterfallFlow
  likeCount?: number
  collectCount?: number
  commentCount?: number
}
