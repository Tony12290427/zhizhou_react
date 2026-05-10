import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Upload, Trash2, X } from 'lucide-react'
import { apiConfig } from '@/config/api'
import { useScrollLock } from '@/hooks/use-scroll-lock'
import './ImageUploadModal.css'

// ---- Types ----

export interface ImageUploadModalProps {
  visible: boolean
  modelValue?: ImageUploadItem[]
  onClose?: () => void
  onConfirm?: (images: ImageUploadItem[]) => void
}

export interface ImageUploadItem {
  id: string
  file: File | null
  preview: string
  uploaded: boolean
  url: string
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
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ---- Component ----

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  visible,
  modelValue = [],
  onClose,
  onConfirm,
}) => {
  const { lock, unlock } = useScrollLock()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [localImages, setLocalImages] = useState<ImageUploadItem[]>([])
  const [confirmedImages, setConfirmedImages] = useState<ImageUploadItem[]>([])
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const maxImages = 9

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

  // Sync confirmedImages from modelValue
  useEffect(() => {
    setConfirmedImages([...modelValue])
  }, [modelValue])

  // Lock/unlock scroll when visible
  useEffect(() => {
    if (visible) {
      setConfirmedImages([...modelValue])
      setLocalImages([])
      lock()
    } else {
      unlock()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const processFiles = useCallback(async (files: FileList | File[]) => {
    setError('')
    setIsUploading(true)

    try {
      const fileArray = Array.from(files)
      const validFiles: File[] = []

      for (const file of fileArray) {
        if (!file.type.startsWith('image/')) {
          setError('只能上传图片文件')
          continue
        }

        if (file.size > apiConfig.upload.image.maxFileSize) {
          setError(
            `图片大小不能超过${formatFileSize(apiConfig.upload.image.maxFileSize)}`
          )
          continue
        }

        const totalCount =
          confirmedImages.length + localImages.length + validFiles.length
        if (totalCount >= maxImages) {
          setError(
            `最多只能上传${maxImages}张图片，当前已有${confirmedImages.length}张`
          )
          break
        }

        validFiles.push(file)
      }

      for (const file of validFiles) {
        const preview = await fileToBase64(file)
        const imageItem: ImageUploadItem = {
          id: generateId(),
          file,
          preview,
          uploaded: false,
          url: '',
        }
        setLocalImages((prev) => [...prev, imageItem])
      }
    } catch (err) {
      console.error('处理文件失败:', err)
      setError('处理文件失败: ' + (err instanceof Error ? err.message : ''))
    } finally {
      setIsUploading(false)
    }
  }, [confirmedImages.length, localImages.length])

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (files && files.length > 0) {
        await processFiles(files)
      }
      event.target.value = ''
    },
    [processFiles]
  )

  const removeImage = useCallback((index: number) => {
    setLocalImages((prev) => {
      const updated = [...prev]
      updated.splice(index, 1)
      return updated
    })
  }, [])

  const handleConfirmUpload = useCallback(() => {
    const allImages = [...confirmedImages, ...localImages]
    onConfirm?.(allImages)
    setLocalImages([])
    onClose?.()
  }, [confirmedImages, localImages, onConfirm, onClose])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose?.()
      }
    },
    [onClose]
  )

  // ---- Drag reorder ----

  const handleDragStart = useCallback(
    (index: number, event: React.DragEvent) => {
      dragIndex.current = index
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData(
        'text/html',
        (event.target as HTMLElement).outerHTML
      )
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
      setLocalImages((prev) => {
        const updated = [...prev]
        const draggedItem = updated[dragIndex.current]
        updated.splice(dragIndex.current, 1)
        updated.splice(dragOverIndex.current, 0, draggedItem)
        return updated
      })
    }
    dragIndex.current = -1
    dragOverIndex.current = -1
  }, [])

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      handleDragEnd()
    },
    [handleDragEnd]
  )

  // ---- Touch reorder handlers ----

  const getTouchTargetIndex = useCallback(
    (clientX: number, clientY: number): number => {
      const elementAtPoint = document.elementFromPoint(clientX, clientY)
      if (!elementAtPoint) return -1

      const imageItem = elementAtPoint.closest('.image-item')
      if (!imageItem) return -1

      const uploadGrid = document.querySelector('.image-upload-modal .upload-grid')
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

      if (
        isLongPressed.current &&
        totalDelta > touchThreshold &&
        !isTouchDragging.current
      ) {
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
          setLocalImages((prev) => {
            const updated = [...prev]
            const draggedItem = updated[dragIndex.current]
            updated.splice(dragIndex.current, 1)
            updated.splice(finalTargetIndex, 0, draggedItem)
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
    [getTouchTargetIndex]
  )

  // ---- Render helpers ----

  const remainingSlots =
    maxImages - confirmedImages.length - localImages.length

  const getImageItemClasses = (index: number): string => {
    const classes = ['image-item']
    if (dragIndex.current === index) classes.push('dragging')
    if (
      isTouchDragging.current &&
      touchStartIndex.current === index
    )
      classes.push('touch-dragging')
    if (
      isLongPressed.current &&
      touchStartIndex.current === index &&
      !isTouchDragging.current
    )
      classes.push('long-pressing')
    return classes.join(' ')
  }

  return (
    <Dialog.Root open={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="image-upload-modal-overlay"
          onClick={() => onClose?.()}
        />
        <Dialog.Content
          className="image-upload-modal"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="image-upload-header">
            <Dialog.Title asChild>
              <h4>上传图片</h4>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="close-btn" onClick={() => onClose?.()}>
                <X width={16} height={16} />
              </button>
            </Dialog.Close>
          </div>

          <div className="image-upload-content">
            <div className="multi-image-upload">
              <div
                className="upload-grid"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                {/* Local images */}
                {localImages.map((imageItem, index) => (
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
                    <div className="image-preview">
                      <img src={imageItem.preview} alt="预览图片" />
                      <div className="image-overlay">
                        <div className="image-actions">
                          <button
                            onClick={() => removeImage(index)}
                            className="action-btn remove-btn"
                          >
                            <Trash2 width={12} height={12} />
                          </button>
                        </div>
                        <div className="image-index">{index + 1}</div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add button */}
                {remainingSlots > 0 && (
                  <div
                    className={`upload-item${isUploading ? ' uploading' : ''}`}
                    onClick={() => !isUploading && triggerFileInput()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                    <div className="upload-placeholder">
                      <Upload
                        className={`upload-icon${isUploading ? ' uploading' : ''}`}
                        width={24}
                        height={24}
                      />
                      <p>{isUploading ? '处理中...' : '添加图片'}</p>
                      <p className="upload-hint">
                        已有{confirmedImages.length}张，当前{localImages.length}
                        张，还能上传{remainingSlots}张
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="upload-tips">
                <p>
                  • 最多上传{maxImages}张图片（已确认
                  {confirmedImages.length}张）
                </p>
                <p>• 支持 JPG、PNG 格式</p>
                <p>• 单张图片不超过5MB</p>
                <p>• 长按图片可拖拽排序</p>
                {localImages.length > 0 && (
                  <p>
                    • 当前选择{localImages.length}
                    张，点击确认上传后才会显示在预览区域
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="image-upload-footer">
            <button className="cancel-btn" onClick={() => onClose?.()}>
              取消
            </button>
            <button
              className="confirm-btn"
              onClick={handleConfirmUpload}
              disabled={localImages.length === 0}
            >
              确认上传
              {localImages.length > 0 ? `(${localImages.length}张)` : ''}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default ImageUploadModal
