import request from '@/lib/request'

// zhizhou_be action endpoints for like/fav/unlike/unfav
export const postApi = {
  likePost(postId: number | string) {
    return request.post('/action/like', { entityType: 'POST', entityId: postId })
  },

  unlikePost(postId: number | string) {
    return request.post('/action/unlike', { entityType: 'POST', entityId: postId })
  },

  collectPost(postId: number | string) {
    return request.post('/action/fav', { entityType: 'POST', entityId: postId })
  },

  uncollectPost(postId: number | string) {
    return request.post('/action/unfav', { entityType: 'POST', entityId: postId })
  },
}

// Comment actions
export const commentApi = {
  likeComment(commentId: number | string) {
    return request.post('/action/like', { entityType: 'COMMENT', entityId: commentId })
  },

  unlikeComment(commentId: number | string) {
    return request.post('/action/unlike', { entityType: 'COMMENT', entityId: commentId })
  },
}
