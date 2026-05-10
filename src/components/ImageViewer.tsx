import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useScrollLock } from '@/hooks/use-scroll-lock'
import { getImageUrl } from '@/utils/imageUtils'
import './ImageViewer.css'

export type ImageType = 'post' | 'comment' | 'avatar'

export interface ImageViewerProps {
  visible: boolean
  images: (string | Record<string, unknown>)[]
  initialIndex?: number
  imageType?: ImageType
  userId?: number | string
  closeOnOverlay?: boolean
  onClose: () => void
  onChange?: (index: number) => void
}

const MIN_SWIPE_DISTANCE = 50
const SWIPE_THRESHOLD = 10

function getImageSrc(image: string | Record<string, unknown>): string {
  if (typeof image === 'string') {
    return image
  }
  if (typeof image === 'object' && image !== null) {
    const url =
      (image as Record<string, unknown>).url ||
      (image as Record<string, unknown>).src ||
      (image as Record<string, unknown>).image_url
    if (url && typeof url === 'string') {
      return url
    }
    if (
      (image as Record<string, unknown>).thumbnailUrl ||
      (image as Record<string, unknown>).hoverUrl
    ) {
      return getImageUrl(image as Record<string, unknown>, '')
    }
  }
  return ''
}

function getImageAlt(
  image: string | Record<string, unknown>,
  index: number,
  imageType: ImageType,
): string {
  if (
    typeof image === 'object' &&
    image !== null &&
    (image as Record<string, unknown>).alt &&
    typeof (image as Record<string, unknown>).alt === 'string'
  ) {
    return (image as Record<string, unknown>).alt as string
  }
  switch (imageType) {
    case 'avatar':
      return '用户头像'
    case 'comment':
      return `评论图片 ${index + 1}`
    case 'post':
    default:
      return `帖子图片 ${index + 1}`
  }
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  visible,
  images,
  initialIndex = 0,
  imageType = 'post',
  userId: _userId,
  closeOnOverlay = true,
  onClose,
  onChange,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const preloadedImages = useRef(new Set<number>())
  const imageListLength = images.length

  // Touch gesture state
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchEndX = useRef(0)
  const touchEndY = useRef(0)

  const { lock, unlock } = useScrollLock()

  // Scroll lock: lock when visible, unlock when hidden
  useEffect(() => {
    if (visible) {
      lock()
      const idx = Math.max(0, Math.min(initialIndex, imageListLength - 1))
      setCurrentIndex(idx)
      // Preload adjacent images after index is set
      requestAnimationFrame(() => {
        preloadAdjacentImages(idx)
      })
    } else {
      unlock()
      preloadedImages.current.clear()
    }
  }, [visible, initialIndex, imageListLength, lock, unlock])

  // Emit onChange when currentIndex changes
  useEffect(() => {
    if (visible) {
      onChange?.(currentIndex)
      preloadAdjacentImages(currentIndex)
    }
  }, [currentIndex, visible, onChange])

  // Preload adjacent images
  const preloadAdjacentImages = useCallback(
    (index: number) => {
      const indicesToPreload: number[] = []
      if (index > 0) indicesToPreload.push(index - 1)
      if (index < imageListLength - 1) indicesToPreload.push(index + 1)

      indicesToPreload.forEach((i) => {
        if (!preloadedImages.current.has(i)) {
          const img = new Image()
          img.src = getImageSrc(images[i])
          img.onload = () => {
            preloadedImages.current.add(i)
          }
        }
      })
    },
    [images, imageListLength],
  )

  const handleImageError = useCallback(
    (index: number) => {
      console.warn(`图片加载失败: ${getImageSrc(images[index])}`)
    },
    [images],
  )

  const prevImage = useCallback(
    (event?: React.MouseEvent | React.KeyboardEvent) => {
      if (event) {
        event.preventDefault()
        event.stopPropagation()
      }
      setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev))
    },
    [],
  )

  const nextImage = useCallback(
    (event?: React.MouseEvent | React.KeyboardEvent) => {
      if (event) {
        event.preventDefault()
        event.stopPropagation()
      }
      setCurrentIndex((prev) =>
        prev < imageListLength - 1 ? prev + 1 : prev,
      )
    },
    [imageListLength],
  )

  const closeViewer = useCallback(() => {
    onClose()
  }, [onClose])

  const handleOverlayClick = useCallback(() => {
    if (closeOnOverlay) {
      closeViewer()
    }
  }, [closeOnOverlay, closeViewer])

  const handleImageClick = useCallback(
    (event: React.MouseEvent) => {
      const rect = event.currentTarget.getBoundingClientRect()
      const clickX = event.clientX - rect.left
      const clickY = event.clientY - rect.top

      const safeZoneWidth = 100
      const centerY = rect.height / 2
      const safeZoneHeight = 100

      const isInLeftSafeZone =
        clickX < safeZoneWidth &&
        Math.abs(clickY - centerY) < safeZoneHeight / 2
      const isInRightSafeZone =
        clickX > rect.width - safeZoneWidth &&
        Math.abs(clickY - centerY) < safeZoneHeight / 2

      if (!isInLeftSafeZone && !isInRightSafeZone && closeOnOverlay) {
        closeViewer()
      }
    },
    [closeOnOverlay, closeViewer],
  )

  // Keyboard navigation
  const handleKeydown = useCallback(
    (event: KeyboardEvent) => {
      const activeElement = document.activeElement
      if (
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          (activeElement as HTMLElement).contentEditable === 'true')
      ) {
        return
      }

      switch (event.key) {
        case 'Escape':
          event.preventDefault()
          event.stopPropagation()
          closeViewer()
          break
        case 'ArrowLeft':
          event.preventDefault()
          event.stopPropagation()
          prevImage()
          break
        case 'ArrowRight':
          event.preventDefault()
          event.stopPropagation()
          nextImage()
          break
      }
    },
    [closeViewer, prevImage, nextImage],
  )

  // Keyboard event listener on mount/unmount (capture phase)
  useEffect(() => {
    document.addEventListener('keydown', handleKeydown, true)
    return () => {
      document.removeEventListener('keydown', handleKeydown, true)
    }
  }, [handleKeydown])

  // Touch gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touchMoveX = e.touches[0].clientX
      const touchMoveY = e.touches[0].clientY

      const deltaX = Math.abs(touchMoveX - touchStartX.current)
      const deltaY = Math.abs(touchMoveY - touchStartY.current)

      if (deltaX > deltaY && deltaX > SWIPE_THRESHOLD) {
        e.preventDefault()
      }
    },
    [],
  )

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      touchEndX.current = e.changedTouches[0].clientX
      touchEndY.current = e.changedTouches[0].clientY

      const deltaX = touchEndX.current - touchStartX.current
      const deltaY = touchEndY.current - touchStartY.current

      if (
        Math.abs(deltaX) > Math.abs(deltaY) &&
        Math.abs(deltaX) > MIN_SWIPE_DISTANCE
      ) {
        if (deltaX > 0) {
          prevImage()
        } else {
          nextImage()
        }
      }

      touchStartX.current = 0
      touchStartY.current = 0
    },
    [prevImage, nextImage],
  )

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="image-viewer-overlay"
          onClick={handleOverlayClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <div className="image-viewer-container" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button
              type="button"
              className="close-btn"
              onClick={(e) => {
                e.stopPropagation()
                closeViewer()
              }}
              aria-label="关闭图片查看器"
            >
              <X width={24} height={24} />
            </button>

            {/* Image counter (shown when multiple images) */}
            {imageListLength > 1 && (
              <div className="image-counter">
                {currentIndex + 1} / {imageListLength}
              </div>
            )}

            {/* Image content area */}
            <div
              className="image-content"
              onClick={handleImageClick}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div
                className="image-slider"
                style={{
                  transform: `translateX(-${currentIndex * 100}%)`,
                }}
              >
                {images.map((image, index) => (
                  <div key={index} className="image-slide">
                    <img
                      src={getImageSrc(image)}
                      alt={getImageAlt(image, index, imageType)}
                      className="viewer-image"
                      onLoad={() => preloadAdjacentImages(index)}
                      onError={() => handleImageError(index)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation buttons (shown when multiple images) */}
            {imageListLength > 1 && (
              <>
                <button
                  type="button"
                  className={`nav-btn prev-btn${currentIndex === 0 ? ' disabled' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    prevImage(e)
                  }}
                  disabled={currentIndex === 0}
                  aria-label="上一张图片"
                >
                  <ChevronLeft width={24} height={24} />
                </button>
                <button
                  type="button"
                  className={`nav-btn next-btn${currentIndex === imageListLength - 1 ? ' disabled' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    nextImage(e)
                  }}
                  disabled={currentIndex === imageListLength - 1}
                  aria-label="下一张图片"
                >
                  <ChevronRight width={24} height={24} />
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ImageViewer
