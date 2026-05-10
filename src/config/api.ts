export const apiConfig = {
  baseURL: '/api/v1',
  timeout: 60000,

  defaultHeaders: {
    'Content-Type': 'application/json',
  },

  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },

  upload: {
    image: {
      maxFileSize: 10 * 1024 * 1024,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      maxCount: 9,
    },
    video: {
      maxFileSize: 100 * 1024 * 1024,
      allowedTypes: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'],
      maxCount: 1,
    },
  },
} as const

export default apiConfig
