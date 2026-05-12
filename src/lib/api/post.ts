import request from '@/lib/request'

// zhizhou_be action endpoints for like/fav/unlike/unfav
// Backend counter uses entityType="knowpost" for all post-related operations
export const postApi = {
  likePost(postId: number | string) {
    return request.post('/action/like', { entityType: 'knowpost', entityId: postId })
  },

  unlikePost(postId: number | string) {
    return request.post('/action/unlike', { entityType: 'knowpost', entityId: postId })
  },

  collectPost(postId: number | string) {
    return request.post('/action/fav', { entityType: 'knowpost', entityId: postId })
  },

  uncollectPost(postId: number | string) {
    return request.post('/action/unfav', { entityType: 'knowpost', entityId: postId })
  },
}

// Comment actions
export const commentApi = {
  likeComment(commentId: number | string) {
    return request.post('/action/like', { entityType: 'knowcomment', entityId: commentId })
  },

  unlikeComment(commentId: number | string) {
    return request.post('/action/unlike', { entityType: 'knowcomment', entityId: commentId })
  },
}
