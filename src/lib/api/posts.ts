import request from '@/lib/request'
import type { TransformedPost } from '@/types/post'

const DEFAULT_POST_IMAGE = '/zhizhou-placeholder.jpg'
const DEFAULT_AVATAR = '/avatar.png'

/**
 * Transform zhizhou_be KnowPost response to frontend TransformedPost format.
 * Actual zhizhou_be fields: id, title, description, coverImage, tags[], tagJson,
 *   authorAvatar, authorNickname, likeCount, favoriteCount, liked, faved, isTop,
 *   page/size/hasMore (pagination)
 */
export function transformPostData(backendPost: Record<string, any>): TransformedPost {
  // coverImage is a single URL; wrap in array for the images field
  const coverImage = backendPost.coverImage
  const images = coverImage ? [coverImage] : (backendPost.imgUrls || backendPost.images || [])
  const likeCount = backendPost.likeCount ?? backendPost.like_count ?? 0
  const favCount = backendPost.favoriteCount ?? backendPost.favCount ?? backendPost.collect_count ?? 0
  const liked = backendPost.liked ?? false
  const commentCount = backendPost.commentCount ?? backendPost.comment_count ?? 0
  const faved = backendPost.faved ?? backendPost.collected ?? false
  const authorNickname = backendPost.authorNickname || backendPost.nickname || '匿名用户'
  const authorAvatar = backendPost.authorAvatar || backendPost.user_avatar || DEFAULT_AVATAR
  // authorId is only in detail endpoint; feed items don't have it
  const authorId = backendPost.authorId ?? backendPost.user_id ?? backendPost.author_auto_id ?? 0

  // Tags: prefer tags array, fallback to tagJson string
  let tags = backendPost.tags || []
  if (!Array.isArray(tags) && backendPost.tagJson) {
    try { tags = JSON.parse(backendPost.tagJson) } catch { tags = [] }
  }

  return {
    id: backendPost.id,
    image: coverImage || images[0] || DEFAULT_POST_IMAGE,
    title: backendPost.title || '',
    content: backendPost.description || backendPost.content || '',
    images,
    video_url: backendPost.video_url,
    cover_url: backendPost.cover_url,
    videos: backendPost.videos || [],
    avatar: authorAvatar,
    author: authorNickname,
    location: backendPost.location || '',
    view_count: backendPost.viewCount ?? backendPost.view_count ?? 0,
    like_count: likeCount,
    comment_count: backendPost.commentCount ?? backendPost.comment_count ?? 0,
    collect_count: favCount,
    likeCount,
    collectCount: favCount,
    commentCount,
    liked,
    collected: faved,
    verified: backendPost.verified || 0,
    author_verified: backendPost.verified || 0,
    created_at: backendPost.createdAt || backendPost.created_at,
    path: `/post?id=${backendPost.id}`,
    category: backendPost.category || backendPost.categoryId || 'general',
    type: 1, // zhizhou_be only supports image-text posts (no video)
    author_auto_id: authorId,
    author_account: backendPost.authorSlug || String(authorId || ''),
    user_id: backendPost.user_id || authorId,
    tags: (backendPost.tags || []).map((t: any) => typeof t === 'string' ? { id: 0, name: t } : t),
    status: backendPost.status ?? (backendPost.publishedAt ? 0 : 1),
    originalData: {
      content: backendPost.description || backendPost.content || '',
      images,
      tags: backendPost.tags || [],
      createdAt: backendPost.createdAt || backendPost.created_at,
      userId: authorId,
    },
  }
}

interface GetPostListParams {
  page?: number
  limit?: number
  category?: string
  searchKeyword?: string
  searchTag?: string
  userId?: number | string
  type?: string
  sort?: string
  status?: string
}

interface GetPostListResult {
  posts: TransformedPost[]
  pagination: { page: number; limit: number; total: number; pages: number }
  hasMore: boolean
}

/**
 * Get post list for zhizhou_be.
 * Routes by type:
 * - 'collections' → GET /knowposts/faved?page=&size=
 * - 'likes' → GET /knowposts/liked?page=&size=
 * - 'posts' (own) → GET /knowposts/mine?page=&size=
 * - 'following' → GET /knowposts/following?page=&size=
 * - default (feed) → GET /knowposts/feed?page=&size=
 * - search → GET /search?keyword=&tag=
 */
export async function getPostList(params: GetPostListParams = {}): Promise<GetPostListResult> {
  const { page = 1, limit = 20, searchKeyword, searchTag, userId, type } = params

  try {
    let data: any

    if (userId && type === 'collections') {
      data = await request.get('/knowposts/faved', { params: { page, size: limit } })
    } else if (userId && type === 'likes') {
      data = await request.get('/knowposts/liked', { params: { page, size: limit } })
    } else if (type === 'posts' && userId) {
      data = await request.get('/knowposts/mine', { params: { page, size: limit } })
    } else if (type === 'following') {
      data = await request.get('/knowposts/following', { params: { page, size: limit } })
    } else if (searchKeyword || searchTag) {
      data = await request.get('/search', {
        params: { keyword: searchKeyword || '', tag: searchTag || '', page, size: limit },
      })
    } else if (userId) {
      // User profile posts — use feed with userId filter if available, else mine
      data = await request.get('/knowposts/mine', { params: { page, size: limit } })
    } else {
      // Default: public feed
      data = await request.get('/knowposts/feed', { params: { page, size: limit } })
    }

    // zhizhou_be pagination: { items[], page, size, hasMore }
    const items = data?.items || data?.data || data?.content || []
    const total = data?.total ?? items.length
    const hasMoreFromApi = data?.hasMore ?? (page * limit < total)

    return {
      posts: items.map(transformPostData),
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
      hasMore: hasMoreFromApi,
    }
  } catch (error) {
    console.error('Failed to fetch posts:', error)
  }

  return {
    posts: [],
    pagination: { page, limit, total: 0, pages: 0 },
    hasMore: false,
  }
}

/**
 * Get post detail from zhizhou_be
 */
export async function getPostDetail(postId: number | string): Promise<TransformedPost | null> {
  try {
    const data: any = await request.get(`/knowposts/detail/${postId}`)
    if (data?.id) {
      return transformPostData(data)
    }
  } catch (error) {
    console.error('Failed to fetch post detail:', error)
  }
  return null
}

export async function likePost(_postId: number) {
  throw new Error('Use postApi.likePost from @/lib/api/post instead')
}

export async function unlikePost(_postId: number) {
  throw new Error('Use postApi.unlikePost from @/lib/api/post instead')
}

export async function collectPost(_postId: number) {
  throw new Error('Use postApi.collectPost from @/lib/api/post instead')
}

export async function uncollectPost(_postId: number) {
  throw new Error('Use postApi.uncollectPost from @/lib/api/post instead')
}

// Presigned URL upload helper
async function uploadViaPresign(file: File): Promise<string> {
  const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '.png'
  const presign: any = await request.post('/storage/presign', {
    scene: 'posts',
    postId: 'draft',
    contentType: file.type || 'image/png',
    ext,
  })
  const uploadUrl = presign.putUrl || presign.url || presign.uploadUrl
  if (!uploadUrl) {
    throw new Error('No presigned upload URL returned')
  }
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  })
  return presign.publicUrl || presign.fileUrl || uploadUrl.split('?')[0] || ''
}

export async function createPost(postData: Record<string, unknown>): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    // Step 1: Create draft
    const draft: any = await request.post('/knowposts/drafts')
    const postId = draft?.id
    if (!postId) return { success: false, message: '创建草稿失败' }

    // Step 2: Upload images via presigned URLs
    const imageUrls: string[] = []
    const images = (postData.images as any[]) || []
    for (const img of images) {
      if (img.file instanceof File) {
        try {
          const url = await uploadViaPresign(img.file)
          imageUrls.push(url)
        } catch (e: any) {
          console.error('Image upload failed:', img.file.name, e)
        }
      } else if (typeof img.url === 'string') {
        imageUrls.push(img.url)
      }
    }

    // Step 3: Upload video via presigned URL
    let videoUrl: string | null = null
    const video = postData.video as any
    if (video) {
      if (video.file instanceof File) {
        try {
          videoUrl = await uploadViaPresign(video.file)
        } catch (e: any) {
          console.error('Video upload failed:', video.file.name, e)
        }
      } else if (typeof video.url === 'string') {
        videoUrl = video.url
      }
    }

    // Step 4: Update post metadata
    const tags = (postData.tags as string[]) || []
    await request.patch(`/knowposts/${postId}`, {
      title: postData.title,
      description: String(postData.content || '').substring(0, 200),
      tags: JSON.stringify(tags),
      imgUrls: JSON.stringify(imageUrls),
      videoUrl: videoUrl || null,
      category: postData.category_id || 'general',
    })

    // Step 5: Confirm content (file upload metadata — send correct DTO fields)
    if (imageUrls.length > 0) {
      await request.post(`/knowposts/${postId}/content/confirm`, {
        objectKey: imageUrls[0].split('/uploads/')[1] || '',
        etag: '',
        size: 0,
        sha256: '',
      })
    }

    // Step 6: Publish
    await request.post(`/knowposts/${postId}/publish`)
    return { success: true, data: { id: postId }, message: '发布成功' }
  } catch (error: any) {
    console.error('Publish failed:', error)
    const msg = error?.response?.data?.message || error?.message || '发布失败'
    return { success: false, message: msg }
  }
}

export async function getUserPosts(params: Record<string, unknown> = {}) {
  try {
    const data: any = await request.get('/knowposts/mine', {
      params: {
        page: params.page || 1,
        size: params.limit || 10,
      },
    })
    const posts = (data?.items || data?.data || []).map(transformPostData)
    return { success: true, data: { posts, pagination: { page: Number(params.page) || 1, pages: Math.ceil((data?.total || posts.length) / (Number(params.limit) || 10)), total: data?.total || posts.length } } }
  } catch {
    return { success: false, data: { posts: [], pagination: { page: 1, pages: 1, total: 0 } } }
  }
}

export async function updatePost(postId: number, data: Record<string, unknown>) {
  try {
    await request.patch(`/knowposts/${postId}`, {
      title: data.title,
      description: String(data.content || '').substring(0, 200),
      tags: JSON.stringify(data.tags || []),
    })
    return { success: true, data: { id: postId } }
  } catch (error: any) {
    return { success: false, message: error?.message || '更新失败' }
  }
}

export async function deletePost(postId: number) {
  try {
    await request.delete(`/knowposts/${postId}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error?.message || '删除失败' }
  }
}

export async function getDraftPosts(params: Record<string, unknown> = {}) {
  try {
    const { page = 1, limit = 20 } = params as any
    const data: any = await request.get('/knowposts/mine', { params: { page, size: limit } })
    const items = data?.items || []
    const total = data?.total ?? items.length
    return {
      success: true,
      data: {
        posts: items.map(transformPostData),
        pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
      },
    }
  } catch (error) {
    console.error('Failed to fetch drafts:', error)
    return { success: false, message: '获取草稿失败' }
  }
}
