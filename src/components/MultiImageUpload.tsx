import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react'
import { toast } from '@/utils/toastManager'
import { Trash2, Upload } from 'lucide-react'
import ImageViewer from '@/components/ImageViewer'
import { apiConfig } from '@/config/api'
import './MultiImageUpload.css'

// ---- Types ----

export interface ImageItem {
  id: string
  file: File | null
  preview: string
  uploaded: boolean
  url: string | null
}

export interface MultiImageUploadProps {
  value?: (string | ImageItem)[]
  maxImages?: number
  allowDeleteLast?: boolean
  onChange?: (images: ImageItem[]) => void
  onError?: (error: string) => void
}

export interface MultiImageUploadRef {
  uploadAllImages: () => Promise<string[]>
  getAllImageData: () => Promise<string[]>
  getImageCount: () => number
  reset: () => void
  syncWithUrls: (urls: string[]) => void
  removeImageById: (imageId: string) => void
  addFiles: (files: File[]) => Promise<void>
}

// ---- Helpers ----

function generateId(): string {
  return Date.now() + Math.random().toString(36).substring(2, 11)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}

function compressImage(
  file: File,
  maxSizeMB = 0.8,
  quality = 0.4
): Promise<File> {
  return new Promise((resolve) => {
    // GIF不作压缩
    if (file.type === 'image/gif') {
      resolve(file)
      return
    }
    // 小于阈值的文件不压缩
    if (file.size <= maxSizeMB * 1024 * 1024) {
      resolve(file)
      return
    }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      const compressQuality = 0.4
      const maxDimension = 1200

      let { width, height } = img
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height)
        width = Math.floor(width * ratio)
        height = Math.floor(height * ratio)
      }

      canvas.width = width
      canvas.height = height
      ctx?.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          } else {
            resolve(file)
          }
        },
        file.type,
        compressQuality
      )
    }

    img.onerror = () => resolve(file)
    img.src = URL.createObjectURL(file)
  })
}

// ---- Initialize image list from external value ----

function initializeImageList(images: (string | ImageItem)[]): ImageItem[] {
  return images.map((image) => {
    if (typeof image === 'string') {
      return {
        id: generateId(),
        file: null,
        preview: image,
        uploaded: true,
        url: image,
      }
    }
    if (image && (image as ImageItem).file) {
      return {
        id: (image as ImageItem).id || generateId(),
        file: (image as ImageItem).file,
        preview: (image as ImageItem).preview,
        uploaded: false,
        url: null,
      }
    }
    return image as ImageItem
  })
}

// ---- Component ----

const MultiImageUpload = forwardRef<MultiImageUploadRef, MultiImageUploadProps>(
  (
    {
      value = [],
      maxImages = 9,
      allowDeleteLast = false,
      onChange,
      onError,
    },
    ref
  ) => {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [imageList, setImageList] = useState<ImageItem[]>([])
    const [error, setError] = useState('')
    const [isDragOver, setIsDragOver] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [showImageViewer, setShowImageViewer] = useState(false)
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [viewerImages, setViewerImages] = useState<{ url: string; alt: string }[]>([])

    // Drag state
    const dragIndex = useRef(-1)
    const dragOverIndex = useRef(-1)

    // Touch state
    const touchStartIndex = useRef(-1)
    const touchStartX = useRef(0)
    const touchStartY = useRef(0)
    const touchCurrentY = useRef(0)
    const isTouchDragging = useRef(false)
    const isLongPressed = useRef(false)
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const longPressDelay = 300
    const touchThreshold = 10

    // Prevent circular updates
    const isInternalUpdate = useRef(false)

    // Sync from external value
    useEffect(() => {
      if (isInternalUpdate.current) return
      if (value && value.length > 0) {
        setImageList(initializeImageList(value))
      } else {
        setImageList([])
      }
    }, [value])

    // Sync to external value
    const emitChange = useCallback(
      (newList: ImageItem[]) => {
        isInternalUpdate.current = true
        onChange?.(newList)
        Promise.resolve().then(() => {
          isInternalUpdate.current = false
        })
      },
      [onChange]
    )

    const triggerFileInput = useCallback(() => {
      fileInputRef.current?.click()
    }, [])

    const addFiles = useCallback(
      async (files: FileList | File[]) => {
        const fileArray = Array.from(files)
        const remainingSlots = maxImages - imageList.length
        if (fileArray.length > remainingSlots) {
          const errorMsg = `最多只能再添加${remainingSlots}张图片`
          setError(errorMsg)
          onError?.(errorMsg)
          return
        }

        // Validate all files
        for (const file of fileArray) {
          const maxFileSize = apiConfig.upload.image.maxFileSize
          if (file.size > maxFileSize) {
            const errorMsg = `图片大小为 ${formatFileSize(file.size)}，超过 ${formatFileSize(maxFileSize)} 限制，请选择更小的图片`
            toast.error(errorMsg)
            setError(errorMsg)
            onError?.(errorMsg)
            return
          }

          const allowedTypes = apiConfig.upload.image.allowedTypes
          if (!allowedTypes.includes(file.type)) {
            const errorMsg = `${file.name}: 不支持的图片格式`
            setError(errorMsg)
            onError?.(errorMsg)
            return
          }
        }

        setError('')

        try {
          const newItems: ImageItem[] = []
          for (const file of fileArray) {
            const compressedFile = await compressImage(file)
            const preview = await fileToBase64(compressedFile)
            newItems.push({
              id: generateId(),
              file: compressedFile,
              preview,
              uploaded: false,
              url: null,
            })
          }
          setImageList((prev) => {
            const updated = [...prev, ...newItems]
            emitChange(updated)
            return updated
          })
        } catch (err) {
          console.error('处理图片失败:', err)
          const errorMsg = '处理图片失败，请重试'
          setError(errorMsg)
          onError?.(errorMsg)
        }
      },
      [imageList.length, maxImages, onError, emitChange]
    )

    const handleFileSelect = useCallback(
      async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (files && files.length > 0) {
          await addFiles(files)
        }
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      },
      [addFiles]
    )

    const handleFileDrop = useCallback(
      async (event: React.DragEvent) => {
        setIsDragOver(false)
        const files = event.dataTransfer.files
        if (files.length > 0) {
          await addFiles(files)
        }
      },
      [addFiles]
    )

    const removeImage = useCallback(
      (index: number) => {
        if (!allowDeleteLast && imageList.length <= 1) return
        setImageList((prev) => {
          const updated = [...prev]
          updated.splice(index, 1)
          emitChange(updated)
          return updated
        })
        setError('')
      },
      [allowDeleteLast, imageList.length, emitChange]
    )

    // ---- Drag and drop reorder ----

    const handleDragStart = useCallback(
      (index: number, event: React.DragEvent) => {
        dragIndex.current = index
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/html', (event.target as HTMLElement).outerHTML)
      },
      []
    )

    const handleDragEnter = useCallback((index: number) => {
      if (dragIndex.current !== -1 && dragIndex.current !== index) {
        dragOverIndex.current = index
      }
    }, [])

    const handleDragEnd = useCallback(() => {
      if (dragIndex.current !== -1 && dragOverIndex.current !== -1) {
        setImageList((prev) => {
          const updated = [...prev]
          const draggedItem = updated[dragIndex.current]
          updated.splice(dragIndex.current, 1)
          updated.splice(dragOverIndex.current, 0, draggedItem)
          emitChange(updated)
          return updated
        })
      }
      dragIndex.current = -1
      dragOverIndex.current = -1
    }, [emitChange])

    const handleDrop = useCallback(
      (event: React.DragEvent) => {
        event.preventDefault()
        handleDragEnd()
      },
      [handleDragEnd]
    )

    // ---- Touch handlers for mobile reorder ----

    const getTouchTargetIndex = useCallback(
      (clientX: number, clientY: number): number => {
        const elementAtPoint = document.elementFromPoint(clientX, clientY)
        if (!elementAtPoint) return -1

        const imageItem = elementAtPoint.closest('.image-item')
        if (!imageItem) return -1

        const uploadGrid = document.querySelector('.multi-image-upload .upload-grid')
        if (!uploadGrid) return -1

        const imageItems = uploadGrid.querySelectorAll('.image-item')
        return Array.from(imageItems).indexOf(imageItem)
      },
      []
    )

    const handleTouchStart = useCallback(
      (index: number, event: React.TouchEvent) => {
        const touch = event.touches[0]
        touchStartIndex.current = index
        touchStartX.current = touch.clientX
        touchStartY.current = touch.clientY
        touchCurrentY.current = touch.clientY
        isTouchDragging.current = false
        isLongPressed.current = false

        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current)
        }
        longPressTimer.current = setTimeout(() => {
          isLongPressed.current = true
          if (navigator.vibrate) {
            navigator.vibrate(50)
          }
        }, longPressDelay)
      },
      []
    )

    const handleTouchMove = useCallback(
      (event: React.TouchEvent) => {
        if (touchStartIndex.current === -1) return

        const touch = event.touches[0]
        touchCurrentY.current = touch.clientY
        const deltaX = Math.abs(touch.clientX - touchStartX.current)
        const deltaY = Math.abs(touchCurrentY.current - touchStartY.current)
        const totalDelta = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

        if (totalDelta > touchThreshold && longPressTimer.current) {
          clearTimeout(longPressTimer.current)
          longPressTimer.current = null
        }

        if (isLongPressed.current && totalDelta > touchThreshold && !isTouchDragging.current) {
          isTouchDragging.current = true
          dragIndex.current = touchStartIndex.current
        }

        if (isTouchDragging.current) {
          event.preventDefault()
          const targetIndex = getTouchTargetIndex(touch.clientX, touch.clientY)
          if (targetIndex !== -1 && targetIndex !== dragIndex.current) {
            dragOverIndex.current = targetIndex
          }
        }
      },
      [getTouchTargetIndex]
    )

    const handleTouchEnd = useCallback(
      (event: React.TouchEvent) => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current)
          longPressTimer.current = null
        }

        if (isTouchDragging.current && dragIndex.current !== -1) {
          const touch = event.changedTouches[0]
          let finalTargetIndex = -1
          if (touch) {
            finalTargetIndex = getTouchTargetIndex(touch.clientX, touch.clientY)
          }

          if (finalTargetIndex !== -1 && finalTargetIndex !== dragIndex.current) {
            setImageList((prev) => {
              const updated = [...prev]
              const draggedItem = updated[dragIndex.current]
              updated.splice(dragIndex.current, 1)
              updated.splice(finalTargetIndex, 0, draggedItem)
              emitChange(updated)
              return updated
            })
            if (navigator.vibrate) {
              navigator.vibrate(30)
            }
          }
        }

        touchStartIndex.current = -1
        touchStartX.current = 0
        touchStartY.current = 0
        touchCurrentY.current = 0
        isTouchDragging.current = false
        isLongPressed.current = false
        dragIndex.current = -1
        dragOverIndex.current = -1
      },
      [getTouchTargetIndex, emitChange]
    )

    // ---- Image Viewer ----

    const handleImagePreviewClick = useCallback(
      (index: number) => {
        const images = imageList.map((item, i) => ({
          url: item.preview,
          alt: `预览图片 ${i + 1}`,
        }))
        setViewerImages(images)
        setCurrentImageIndex(index)
        setShowImageViewer(true)
      },
      [imageList]
    )

    const handleImageViewerClose = useCallback(() => {
      setShowImageViewer(false)
    }, [])

    const handleImageViewerChange = useCallback((newIndex: number) => {
      setCurrentImageIndex(newIndex)
    }, [])

    // ---- Imperative methods ----

    const uploadAllImages = useCallback(async (): Promise<string[]> => {
      if (isUploading) return []

      const unuploadedImages = imageList.filter((item) => !item.uploaded && item.file)
      if (unuploadedImages.length === 0) {
        return imageList
          .filter((item) => item.uploaded && item.url && !item.url.startsWith('data:'))
          .map((item) => item.url!)
      }

      setIsUploading(true)
      setError('')

      try {
        // Upload via image upload API
        const { uploadImage } = await import('@/lib/api/upload')
        const urls: string[] = []

        for (let i = 0; i < imageList.length; i++) {
          const item = imageList[i]
          if (item.uploaded && item.url && !item.url.startsWith('data:')) {
            urls.push(item.url)
          } else if (!item.uploaded && item.file) {
            const result = await uploadImage(item.file)
            if (result.success && result.data?.url) {
              urls.push(result.data.url)
              setImageList((prev) => {
                const updated = [...prev]
                const idx = updated.findIndex((x) => x.id === item.id)
                if (idx !== -1) {
                  updated[idx] = { ...updated[idx], uploaded: true, url: result.data.url }
                }
                return updated
              })
            } else {
              throw new Error(result.message || '上传失败')
            }
          }
        }

        return urls
      } catch (err) {
        console.error('批量上传异常:', err)
        const errorMsg =
          '上传失败: ' + (err instanceof Error ? err.message : '未知错误')
        setError(errorMsg)
        throw err
      } finally {
        setIsUploading(false)
      }
    }, [imageList, isUploading])

    const getAllImageData = useCallback(async (): Promise<string[]> => {
      return imageList
        .filter((item) => item.uploaded && item.url && !item.url.startsWith('data:'))
        .map((item) => item.url!)
    }, [imageList])

    const getImageCount = useCallback((): number => {
      return imageList.length
    }, [imageList])

    const reset = useCallback(() => {
      setImageList([])
      setError('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }, [])

    const syncWithUrls = useCallback(
      (urls: string[]) => {
        isInternalUpdate.current = true

        if (!Array.isArray(urls) || urls.length === 0) {
          setImageList([])
          Promise.resolve().then(() => {
            isInternalUpdate.current = false
          })
          return
        }

        const uniqueUrls = [...new Set(urls.filter((url) => url && url.trim()))]
        const newImageList: ImageItem[] = []

        for (const url of uniqueUrls) {
          if (url && !url.startsWith('[待上传:')) {
            const existingImage = imageList.find(
              (item) => item.uploaded && item.url === url
            )
            if (existingImage) {
              newImageList.push(existingImage)
            } else {
              newImageList.push({
                id: generateId(),
                file: null,
                preview: url,
                uploaded: true,
                url: url,
              })
            }
          }
        }

        setImageList(newImageList)
        Promise.resolve().then(() => {
          isInternalUpdate.current = false
        })
      },
      [imageList]
    )

    const removeImageById = useCallback(
      (imageId: string) => {
        setImageList((prev) => {
          const updated = prev.filter((item) => item.id !== imageId)
          emitChange(updated)
          return updated
        })
      },
      [emitChange]
    )

    useImperativeHandle(ref, () => ({
      uploadAllImages,
      getAllImageData,
      getImageCount,
      reset,
      syncWithUrls,
      removeImageById,
      addFiles,
    }))

    // ---- Drag over handlers for upload zone ----

    const handleUploadDragOver = useCallback((event: React.DragEvent) => {
      event.preventDefault()
      if (!isUploading) {
        setIsDragOver(true)
      }
    }, [isUploading])

    const handleUploadDragLeave = useCallback(() => {
      setIsDragOver(false)
    }, [])

    const handleUploadDrop = useCallback(
      (event: React.DragEvent) => {
        event.preventDefault()
        if (!isUploading) {
          handleFileDrop(event)
        }
      },
      [isUploading, handleFileDrop]
    )

    // ---- Render ----

    const getImageItemClasses = (index: number): string => {
      const classes = ['image-item']
      if (dragIndex.current === index) classes.push('dragging')
      if (isTouchDragging.current && touchStartIndex.current === index) classes.push('touch-dragging')
      if (isLongPressed.current && touchStartIndex.current === index && !isTouchDragging.current) classes.push('long-pressing')
      return classes.join(' ')
    }

    const canRemove = allowDeleteLast || imageList.length > 1

    return (
      <div className="multi-image-upload">
        <div
          className="upload-grid"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {imageList.map((imageItem, index) => (
            <div
              key={imageItem.id}
              className={getImageItemClasses(index)}
              draggable
              onDragStart={(e) => handleDragStart(index, e)}
              onDragEnter={(e) => {
                e.preventDefault()
                handleDragEnter(index)
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(index, e)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div
                className="image-preview"
                onClick={() => handleImagePreviewClick(index)}
              >
                <img src={imageItem.preview} alt="预览图片" />
                <div className="image-overlay">
                  <div className="image-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeImage(index)
                      }}
                      className="action-btn remove-btn"
                      disabled={isUploading || !canRemove}
                    >
                      <Trash2 />
                    </button>
                  </div>
                  <div className="image-index">{index + 1}</div>
                </div>
              </div>
            </div>
          ))}

          {imageList.length < maxImages && (
            <div
              className={`upload-item${isDragOver ? ' drag-over' : ''}${isUploading ? ' uploading' : ''}`}
              onClick={() => !isUploading && triggerFileInput()}
              onDragOver={handleUploadDragOver}
              onDragLeave={handleUploadDragLeave}
              onDrop={handleUploadDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                disabled={isUploading}
              />
              <div className="upload-placeholder">
                <Upload className={`upload-icon${isUploading ? ' uploading' : ''}`} />
                <p>{isUploading ? '上传中...' : '添加图片'}</p>
                <p className="upload-hint">
                  {imageList.length}/{maxImages}
                </p>
                {!isUploading && <p className="drag-hint">或拖拽图片到此处</p>}
              </div>
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="upload-tips">
          <p>• 最多上传{maxImages}张图片</p>
          <p>• 支持 JPG、PNG、GIF 格式</p>
          <p>• 单张图片不超过5MB</p>
          <p className="drag-tip">
            • <span className="desktop-tip">拖拽图片可调整顺序</span>
            <span className="mobile-tip">长按图片可拖拽排序</span>
          </p>
        </div>

        {showImageViewer && (
          <ImageViewer
            visible={showImageViewer}
            images={viewerImages}
            initialIndex={currentImageIndex}
            imageType="post"
            onClose={handleImageViewerClose}
            onChange={handleImageViewerChange}
          />
        )}
      </div>
    )
  }
)

MultiImageUpload.displayName = 'MultiImageUpload'

export default MultiImageUpload
