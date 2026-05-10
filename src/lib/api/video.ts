import request from '@/lib/request'
import { apiConfig } from '@/config/api'
import type { AxiosProgressEvent } from 'axios'

/**
 * 视频上传API
 */
export const videoApi = {
  /**
   * 上传单个视频文件
   * @param file - 视频文件
   * @param onProgress - 上传进度回调
   * @param thumbnail - 缩略图文件（可选）
   * @returns 上传结果
   */
  async uploadVideo(
    file: File,
    onProgress?: (progress: number) => void,
    thumbnail: File | null = null
  ) {
    const formData = new FormData()
    formData.append('file', file)

    // 如果有缩略图，一起上传
    if (thumbnail) {
      formData.append('thumbnail', thumbnail)
    }

    try {
      const response: any = await request.post('/upload/video', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5分钟超时，适应大视频文件
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            onProgress(progress)
          }
        },
      })

      if (response.success) {
        return {
          success: true,
          data: response.data,
        }
      } else {
        console.error('视频上传API失败响应:', response)
        return {
          success: false,
          message: response.message || '视频上传失败',
        }
      }
    } catch (error: any) {
      console.error('视频上传失败:', error)
      return {
        success: false,
        message: error.response?.data?.message || error.message || '视频上传失败',
      }
    }
  },

  /**
   * 验证视频文件
   * @param file - 视频文件
   * @returns 验证结果
   */
  validateVideoFile(file: File) {
    const maxSize = apiConfig.upload.video?.maxFileSize || 100 * 1024 * 1024 // 100MB
    const allowedTypes = apiConfig.upload.video?.allowedTypes || [
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/webm',
    ]

    // 检查文件类型
    if (!file.type.startsWith('video/')) {
      return {
        valid: false,
        message: '请选择视频文件',
      }
    }

    // 检查具体的视频格式
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        message: '不支持的视频格式，请选择 MP4、AVI、MOV、WMV、FLV 或 WebM 格式',
      }
    }

    // 检查文件大小
    if (file.size > maxSize) {
      return {
        valid: false,
        message: `文件大小不能超过 ${this.formatFileSize(maxSize)}`,
      }
    }

    return {
      valid: true,
      message: '文件验证通过',
    }
  },

  /**
   * 格式化文件大小
   * @param bytes - 字节数
   * @returns 格式化后的文件大小
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  /**
   * 创建视频预览
   * @param file - 视频文件
   * @returns 预览URL
   */
  createVideoPreview(file: File): string {
    return URL.createObjectURL(file)
  },

  /**
   * 释放视频预览资源
   * @param url - 预览URL
   */
  revokeVideoPreview(url: string): void {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  },
}

export default videoApi
