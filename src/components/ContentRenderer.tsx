import { useMemo, useCallback } from 'react'
import clsx from 'clsx'

interface ContentRendererProps {
  content?: string
  text?: string
  onImageClick?: (data: { images: string[]; index: number }) => void
  className?: string
}

const IMAGE_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHJ4PSI0IiBmaWxsPSIjZTVlN2ViIi8+PHRleHQgeD0iNTAiIHk9IjU1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOWNhM2FmIj7mnKrljYrlvb08L3RleHQ+PC9zdmc+'

export function ContentRenderer({
  content,
  text,
  onImageClick,
  className,
}: ContentRendererProps) {
  // Use content first, fall back to text
  const actualContent = content || text || ''

  // Parse content to extract images and text
  const parsedContent = useMemo(() => {
    if (!actualContent) return { text: '', images: [] as string[] }

    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = actualContent

    // Extract images
    const imgElements = tempDiv.querySelectorAll('img')
    const images = Array.from(imgElements).map((img) => img.src)

    // Remove img elements, keep mention-link HTML
    imgElements.forEach((img) => img.remove())

    let htmlContent = tempDiv.innerHTML

    // Protect mention links
    const mentionLinkRegex =
      /<a[^>]*class="[^"]*mention-link[^"]*"[^>]*>.*?<\/a>/g
    const mentionLinks: string[] = []
    let linkIndex = 0

    htmlContent = htmlContent.replace(mentionLinkRegex, (match: string) => {
      const placeholder = `__MENTION_LINK_${linkIndex}__`
      mentionLinks[linkIndex] = match
      linkIndex++
      return placeholder
    })

    // Handle other HTML tags
    htmlContent = htmlContent.replace(/<br\s*\/?>/gi, '\n')
    htmlContent = htmlContent.replace(/<\/div><div>/gi, '\n')
    htmlContent = htmlContent.replace(/<div>/gi, '')
    htmlContent = htmlContent.replace(/<\/div>/gi, '')
    htmlContent = htmlContent.replace(/<\/p><p>/gi, '\n')
    htmlContent = htmlContent.replace(/<p>/gi, '')
    htmlContent = htmlContent.replace(/<\/p>/gi, '')

    // Restore mention links
    mentionLinks.forEach((link, index) => {
      htmlContent = htmlContent.replace(`__MENTION_LINK_${index}__`, link)
    })

    return { text: htmlContent.trim(), images }
  }, [actualContent])

  const parsedText = parsedContent.text
  const images = parsedContent.images

  // Determine grid class based on image count
  const getGridClass = useCallback(() => {
    const count = images.length
    if (count === 1) return 'single'
    if (count === 2) return 'double'
    if (count === 3) return 'triple'
    if (count === 4) return 'quad'
    return 'multiple'
  }, [images])

  // Handle mention link clicks via event delegation
  const handleMentionClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('mention-link')) {
        e.preventDefault()
        const userId = target.getAttribute('data-user-id')
        if (userId) {
          const userUrl = `${window.location.origin}/user/${userId}`
          window.open(userUrl, '_blank')
        }
      }
    },
    []
  )

  const handleImageError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      e.currentTarget.src = IMAGE_PLACEHOLDER
    },
    []
  )

  return (
    <div className={clsx('content-renderer', className)}>
      {/* Text content */}
      {parsedText && (
        <div className="content-text">
          <span
            className="mention-text"
            dangerouslySetInnerHTML={{ __html: parsedText }}
            onClick={handleMentionClick}
          />
        </div>
      )}

      {/* Image content */}
      {images.length > 0 && (
        <div className="content-images">
          <div className={clsx('images-grid', getGridClass())}>
            {images.map((image, index) => (
              <div
                key={index}
                className="image-item"
                onClick={() => onImageClick?.({ images, index })}
              >
                <img
                  src={image}
                  alt={`图片${index + 1}`}
                  className="content-image"
                  onError={handleImageError}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .content-renderer {
          width: 100%;
        }
        .content-text {
          margin-bottom: 8px;
          line-height: 1.5;
          word-wrap: break-word;
        }
        .mention-text {
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .mention-text :global(.mention-link) {
          color: var(--text-color-tag);
          text-decoration: none;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.3s ease;
          background: none;
          border: none;
          padding: 0;
        }
        .mention-text :global(.mention-link:hover) {
          color: var(--text-color-tag);
          opacity: 0.8;
        }
        .mention-text :global(.mention-link:active) {
          color: var(--text-color-tag);
          opacity: 0.6;
        }
        .mention-text :global(.mention-link:focus) {
          outline: none;
          box-shadow: none;
          border: none;
        }
        .content-images {
          margin-top: 8px;
        }
        .images-grid {
          display: grid;
          gap: 4px;
          border-radius: 8px;
          overflow: hidden;
        }
        .images-grid.single {
          grid-template-columns: 1fr;
          max-width: 200px;
        }
        .images-grid.double {
          grid-template-columns: 1fr 1fr;
          max-width: 200px;
        }
        .images-grid.triple {
          grid-template-columns: 1fr 1fr 1fr;
          max-width: 240px;
        }
        .images-grid.quad {
          grid-template-columns: 1fr 1fr;
          max-width: 200px;
        }
        .images-grid.multiple {
          grid-template-columns: repeat(3, 1fr);
          max-width: 240px;
        }
        .image-item {
          position: relative;
          aspect-ratio: 1;
          cursor: pointer;
          border-radius: 4px;
          overflow: hidden;
          transition: transform 0.3s ease;
        }
        .image-item:hover {
          transform: scale(1.02);
        }
        .content-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        @media (max-width: 768px) {
          .images-grid.single, .images-grid.double, .images-grid.quad {
            max-width: 150px;
          }
          .images-grid.triple, .images-grid.multiple {
            max-width: 180px;
          }
        }
      `}</style>
    </div>
  )
}

export default ContentRenderer
