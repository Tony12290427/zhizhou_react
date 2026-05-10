export interface UserInfo {
  id: number
  user_id: string
  nickname: string
  avatar: string
  bio: string
  email?: string
  location?: string
  follow_count: number
  fans_count: number
  like_count: number
  is_active: boolean
  created_at: string
  updated_at?: string
  gender?: string
  zodiac_sign?: string
  mbti?: string
  education?: string
  major?: string
  interests?: string[]
  verified: number
  verified_title?: string

  isFollowing?: boolean
  followStatus?: FollowStatus

  ban?: BanInfo | null
}

export interface FollowStatus {
  isFollowing: boolean
  isFollowed: boolean
  isMutual: boolean
}

export interface BanInfo {
  end_time: string
  reason: string
  created_at: string
  status?: number
}

export interface UserStats {
  followCount: number
  fansCount: number
  postCount: number
  likeCount: number
  collectCount: number
}
