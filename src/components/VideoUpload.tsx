import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react'
import { toast } from '@/utils/toastManager'
import { Upload, Check, Image, Edit } from 'lucide-react'
import { apiConfig } from '@/config/api'
import { generateVideoThumbnail, blobToFile, generateThumbnailFilename } from '@/utils/videoThumbnail'
import './VideoUpload.css'

// ---- Types ----

export interface VideoData {
  file: File | null
  preview: string
  name: string
  size: number
  uploaded: boolean
  url: string | null
  thumbnail: File | null
  thumbnailDataUrl: string | null
  coverUrl?: string | null
}

export interface VideoUploadProps {
  value?: string | { url: string; coverUrl?: string }
  maxSize?: number
  onChange?: (value: string) => void
  onError?: (error: string) => void
  onStateChange?: (event: { type: 'video' | 'cover'; hasChanges: boolean }) => void
}

export interface VideoUploadRef {
  getVideoData: () => (VideoData & { customCover: string | null; customCoverFile: File | null }) | null
  reset: () => void
  removeVideo: () => void
  startUpload: () => Promise<{ success: boolean; message?: string; data?: { url: string; coverUrl?: string } }>
  customCoverFile: File | null
  uploadCustomCover: () => Promise<string | null>
}

// ---- Helpers ----

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

// ---- Component ----

const VideoUpload = forwardRef<VideoUploadRef, VideoUploadProps>(
  (
    {
      value = '',
      maxSize = apiConfig.upload.video.maxFileSize,
      onChange,
      onError,
      onStateChange,
    },
    ref
  ) => {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const coverInputRef = useRef<HTMLInputElement>(null)
    const [videoData, setVideoData] = useState<VideoData | null>(null)
    const [customCover, setCustomCover] = useState<string | null>(null)
    const [customCoverFile, setCustomCoverFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [isDragOver, setIsDragOver] = useState(false)
    const [error, setError] = useState('')

    // Sync from external value
    useEffect(() => {
      if (!value && videoData) {
        setVideoData(null)
        setCustomCover(null)
        setCustomCoverFile(null)
        setError('')
      } else if (value && !videoData) {
        if (typeof value === 'object' && (value as { url: string }).url) {
          const obj = value as { url: string; coverUrl?: string }
          setVideoData({
            file: null,
            preview: obj.url,
            url: obj.url,
            coverUrl: obj.coverUrl,
            uploaded: true,
            name: '已上传的视频',
            size: 0,
            thumbnail: null,
            thumbnailDataUrl: null,
          })
        } else if (typeof value === 'string') {
          setVideoData({
            file: null,
            preview: value,
            url: value,
            uploaded: true,
            name: '已上传的视频',
            size: 0,
            thumbnail: null,
            thumbnailDataUrl: null,
          })
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value])

    // ---- Validation ----

    const validateVideoFile = useCallback(
      (file: File): { valid: boolean; message?: string } => {
        if (!file.type.startsWith('video/')) {
          return { valid: false, message: '请选择视频文件' }
        }
        if (file.size > maxSize) {
          return {
            valid: false,
            message: `文件大小不能超过${formatFileSize(maxSize)}`,
          }
        }
        return { valid: true }
      },
      [maxSize]
    )

    const validateCoverFile = useCallback((file: File): { valid: boolean; message?: string } => {
      if (!file.type.startsWith('image/')) {
        return { valid: false, message: '请选择图片文件' }
      }
      const maxCoverSize = apiConfig.upload.image.maxFileSize
      if (file.size > maxCoverSize) {
        return {
          valid: false,
          message: `封面图片大小不能超过${formatFileSize(apiConfig.upload.image.maxFileSize)}`,
        }
      }
      return { valid: true }
    }, [])

    // ---- File handlers ----

    const handleFile = useCallback(
      async (file: File) => {
        if (!file) return

        const validation = validateVideoFile(file)
        if (!validation.valid) {
          setError(validation.message || '')
          onError?.(validation.message || '')
          return
        }

        const preview = URL.createObjectURL(file)
        const currentCustomCover = customCover
        const currentCustomCoverFile = customCoverFile

        setVideoData({
          file,
          preview,
          name: file.name,
          size: file.size,
          uploaded: false,
          url: null,
          thumbnail: null,
          thumbnailDataUrl: null,
        })

        setError('')
        if (!currentCustomCover) {
          setCustomCover(null)
          setCustomCoverFile(null)
        }

        onChange?.(file.name)
        onStateChange?.({ type: 'video', hasChanges: true })

        // Generate thumbnail
        try {
          const result = await generateVideoThumbnail(file, {
            useOriginalSize: true,
            quality: 0.8,
            seekTime: 1,
          })

          if (result.success && result.blob) {
            const thumbnailFile = blobToFile(result.blob, generateThumbnailFilename(file.name))
            setVideoData((prev) => {
              if (!prev) return null
              return {
                ...prev,
                thumbnail: thumbnailFile,
                thumbnailDataUrl: result.dataUrl || null,
              }
            })
          } else {
            console.warn('视频缩略图生成失败:', result.error)
            toast.warning('缩略图生成失败，但不影响视频上传')
          }
        } catch (err) {
          console.error('生成视频缩略图异常:', err)
          toast.warning('缩略图生成异常，但不影响视频上传')
        }
      },
      [customCover, customCoverFile, maxSize, onChange, onError, onStateChange, validateVideoFile]
    )

    const handleCoverFile = useCallback(
      async (file: File) => {
        if (!file) return

        const validation = validateCoverFile(file)
        if (!validation.valid) {
          setError(validation.message || '')
          toast.error(validation.message || '')
          return
        }

        try {
          const previewUrl = URL.createObjectURL(file)
          setCustomCover(previewUrl)
          setCustomCoverFile(file)
          onStateChange?.({ type: 'cover', hasChanges: true })
        } catch (err) {
          console.error('处理封面图片失败:', err)
          setError('处理封面图片失败')
          toast.error('处理封面图片失败')
        }
      },
      [onStateChange, validateCoverFile]
    )

    const triggerFileInput = useCallback(() => {
      fileInputRef.current?.click()
    }, [])

    const triggerCoverInput = useCallback(
      (event: React.MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
        coverInputRef.current?.click()
      },
      []
    )

    const handleFileSelect = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (files && files.length > 0) {
          handleFile(files[0])
        }
      },
      [handleFile]
    )

    const handleCoverSelect = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (files && files.length > 0) {
          handleCoverFile(files[0])
        }
      },
      [handleCoverFile]
    )

    const handleFileDrop = useCallback(
      (event: React.DragEvent) => {
        setIsDragOver(false)
        const files = event.dataTransfer.files
        if (files && files.length > 0) {
          handleFile(files[0])
        }
      },
      [handleFile]
    )

    // ---- Upload ----

    const uploadCustomCover = useCallback(async (): Promise<string | null> => {
      if (!customCoverFile) return null

      try {
        const { uploadImage } = await import('@/lib/api/upload')
        const result = await uploadImage(customCoverFile)
        if (result.success && result.data?.url) {
          return result.data.url
        }
        console.error('封面图片上传失败:', result.message)
        return null
      } catch (err) {
        console.error('封面图片上传异常:', err)
        return null
      }
    }, [customCoverFile])

    const startUpload = useCallback(async () => {
      if (!videoData || !videoData.file) {
        return { success: false, message: '没有视频文件' }
      }

      setIsUploading(true)
      setUploadProgress(0)

      try {
        let thumbnailToUpload: File | null = null
        if (customCoverFile) {
          thumbnailToUpload = customCoverFile
        } else if (videoData.thumbnail) {
          thumbnailToUpload = videoData.thumbnail
        }

        // Use the upload API
        const { videoApi } = await import('@/lib/api/video')

        const result = await videoApi.uploadVideo(
          videoData.file,
          (progress: number) => {
            setUploadProgress(progress)
          },
          thumbnailToUpload
        )

        if (result.success) {
          setIsUploading(false)
          setVideoData((prev) => {
            if (!prev) return null
            return {
              ...prev,
              uploaded: true,
              url: result.data.url,
              coverUrl: result.data.coverUrl,
            }
          })

          if (customCoverFile && result.data?.coverUrl) {
            setCustomCover(result.data.coverUrl)
          }

          onChange?.(result.data.url)
          toast.success('视频上传成功')
          return result
        } else {
          setIsUploading(false)
          const errorMsg = result.message || '视频上传失败'
          setError(errorMsg)
          onError?.(errorMsg)
          toast.error(errorMsg)
          return result
        }
      } catch (err) {
        console.error('视频上传失败:', err)
        setIsUploading(false)
        const errorMsg = '视频上传失败，请重试'
        setError(errorMsg)
        onError?.(errorMsg)
        toast.error(errorMsg)
        return { success: false, message: errorMsg }
      }
    }, [videoData, customCoverFile, onChange, onError])

    const removeVideo = useCallback(() => {
      if (videoData?.preview) {
        URL.revokeObjectURL(videoData.preview)
      }
      if (customCover && customCover.startsWith('blob:')) {
        URL.revokeObjectURL(customCover)
      }

      setVideoData(null)
      setCustomCover(null)
      setCustomCoverFile(null)
      setError('')
      setUploadProgress(0)
      onChange?.('')

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (coverInputRef.current) {
        coverInputRef.current.value = ''
      }
    }, [videoData, customCover, onChange])

    const getVideoData = useCallback(() => {
      if (!videoData) return null
      return {
        ...videoData,
        customCover,
        customCoverFile,
      }
    }, [videoData, customCover, customCoverFile])

    const reset = useCallback(() => {
      removeVideo()
    }, [removeVideo])

    useImperativeHandle(ref, () => ({
      getVideoData,
      reset,
      removeVideo,
      startUpload,
      customCoverFile,
      uploadCustomCover,
    }))

    // ---- Render helpers ----

    const handleAreaClick = useCallback(() => {
      if (!isUploading && !videoData) {
        triggerFileInput()
      }
    }, [isUploading, videoData, triggerFileInput])

    const hasVideo = videoData && !isUploading

    return (
      <div className="video-upload">
        <div
          className={`upload-area${isDragOver ? ' drag-over' : ''}${isUploading ? ' uploading' : ''}${hasVideo ? ' has-video' : ''}`}
          onClick={handleAreaClick}
          onDragOver={(e) => {
            e.preventDefault()
            if (!isUploading) setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            if (!isUploading) handleFileDrop(e)
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={isUploading}
          />
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverSelect}
            style={{ display: 'none' }}
          />

          {/* Success state */}
          {hasVideo && (
            <div className="video-success" onClick={triggerFileInput}>
              <div
                className={`video-thumbnail${customCover ? ' custom-cover' : ''}`}
                onClick={triggerCoverInput}
              >
                {customCover || videoData?.thumbnailDataUrl || videoData?.coverUrl ? (
                  <img
                    src={customCover || videoData?.thumbnailDataUrl || videoData?.coverUrl || ''}
                    alt="视频缩略图"
                    className="thumbnail-image"
                  />
                ) : (
                  <div className="thumbnail-placeholder">
                    <Upload width={24} height={24} />
                  </div>
                )}
                <div className="cover-overlay">
                  <Edit width={16} height={16} />
                  <span>自定义封面</span>
                </div>
              </div>

              <div className="video-info">
                <div className="success-text">
                  <div className="success-icon">
                    <Check width={14} height={14} />
                  </div>
                  上传成功
                </div>
                {customCover && (
                  <div className="cover-status">
                    <Image width={12} height={12} />
                    已设置自定义封面
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upload placeholder */}
          {!hasVideo && !isUploading && (
            <div className="upload-placeholder">
              <Upload className="upload-icon" />
              <p>添加视频</p>
              <p className="upload-hint">支持 MP4、MOV、AVI 格式</p>
              <p className="upload-hint">文件大小不超过100MB</p>
              <p className="drag-hint">或拖拽视频到此处</p>
            </div>
          )}

          {/* Upload progress */}
          {isUploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: uploadProgress + '%' }}
                />
              </div>
              <p className="progress-text">{Math.floor(uploadProgress)}%</p>
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="upload-tips">
          <p>• 支持 MP4、MOV、AVI 格式</p>
          <p>
            • 文件大小不超过{formatFileSize(apiConfig.upload.video.maxFileSize)}
          </p>
          <p>• 建议视频时长不超过5分钟</p>
          {hasVideo && <p>• 点击缩略图可自定义封面</p>}
        </div>
      </div>
    )
  }
)

VideoUpload.displayName = 'VideoUpload'

export default VideoUpload
