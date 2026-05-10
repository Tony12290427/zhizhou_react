import { useState, useRef, useCallback, useEffect } from 'react'
import ContentEditableInput from '@/components/ContentEditableInput'
import { EmojiPicker } from '@/components/EmojiPicker'
import { DropdownSelect } from '@/components/DropdownSelect'

const FRAMES_DIR = '/frames'

interface Template {
  id: number
  name: string
  src: string
}

interface TextImageModalProps {
  visible: boolean
  onClose: () => void
  onGenerate: (data: { text: string; template: Template; imageFile: File; imageUrl: string }) => void
}

const FONT_OPTIONS = [
  { label: '微软雅黑', value: '微软雅黑' },
  { label: '宋体', value: '宋体' },
  { label: '楷体', value: '楷体' },
  { label: '黑体', value: '黑体' },
  { label: '仿宋', value: 'FangSong' },
  { label: '华文细黑', value: 'STXihei' },
  { label: '华文彩云', value: 'STCaiyun' },
  { label: '华文楷体', value: 'STKaiti' },
  { label: '华文宋体', value: 'STSong' },
  { label: '华文黑体', value: 'STHeiti' },
  { label: '华文仿宋', value: 'STFangsong' },
  { label: '华文隶书', value: 'STLiti' },
]

const FRAME_FILES = [
  'frame (1).jpg',
  'frame (2).jpg',
  'frame (3).jpg',
  'frame (4).jpg',
  'frame (6).jpg',
  'frame (7).jpg',
  'frame (8).jpg',
  'frame (9).png',
]

function processText(text: string): string[] {
  if (!text) return []

  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = text

  const brElements = tempDiv.querySelectorAll('br')
  brElements.forEach((br) => br.replaceWith('\n'))

  const divElements = tempDiv.querySelectorAll('div')
  divElements.forEach((div) => {
    div.insertAdjacentText('beforebegin', '\n')
  })

  let cleanText = tempDiv.textContent || tempDiv.innerText || ''
  cleanText = cleanText.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')

  const lines = cleanText.split('\n')
  return lines.filter((line) => line.trim().length > 0)
}

function calculateOptimalFontSize(text: string): number {
  if (!text) return 30
  const lines = processText(text)
  const maxLineLength = Math.max(...lines.map((line) => line.length))
  if (maxLineLength <= 5) return 55
  if (maxLineLength <= 7) return 45
  if (maxLineLength === 8) return 40
  if (maxLineLength === 9) return 35
  return 30
}

export default function TextImageModal({ visible, onClose, onGenerate }: TextImageModalProps) {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  const [inputText, setInputText] = useState('')
  const [showEmojiPanel, setShowEmojiPanel] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [previewImage, setPreviewImage] = useState('')
  const [selectedFont, setSelectedFont] = useState('微软雅黑')
  const [textColor, setTextColor] = useState('#000000')
  const [strokeColor, setStrokeColor] = useState('#ffffff')
  const [templates, setTemplates] = useState<Template[]>([])
  const fontSizeRef = useRef(40)

  useEffect(() => {
    const templateList: Template[] = FRAME_FILES.map((filename, index) => ({
      id: index + 1,
      name: `模版${index + 1}`,
      src: `${FRAMES_DIR}/${filename}`,
    }))
    setTemplates(templateList)
  }, [])

  useEffect(() => {
    if (visible) {
      setInputText('')
      setSelectedTemplate(null)
      setPreviewImage('')
      setShowEmojiPanel(false)
      setTextColor('#000000')
      setStrokeColor('#ffffff')
      setSelectedFont('微软雅黑')
    }
  }, [visible])

  const drawCanvas = useCallback(async (): Promise<void> => {
    const canvas = previewCanvasRef.current
    if (!canvas || !selectedTemplate) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = selectedTemplate.src
      })

      const canvasRatio = canvas.width / canvas.height
      const imgRatio = img.width / img.height

      let drawWidth: number, drawHeight: number, offsetX: number, offsetY: number

      if (imgRatio > canvasRatio) {
        drawHeight = canvas.height
        drawWidth = drawHeight * imgRatio
        offsetX = (canvas.width - drawWidth) / 2
        offsetY = 0
      } else {
        drawWidth = canvas.width
        drawHeight = drawWidth / imgRatio
        offsetX = 0
        offsetY = (canvas.height - drawHeight) / 2
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)

      if (inputText.trim()) {
        const lines = processText(inputText)
        const currentFontSize = calculateOptimalFontSize(inputText)
        fontSizeRef.current = currentFontSize

        ctx.font = `bold ${currentFontSize}px ${selectedFont}, Arial, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.lineWidth = 3

        const lineHeight = currentFontSize + 10
        const totalHeight = lines.length * lineHeight
        const startY = (canvas.height - totalHeight) / 2 + lineHeight / 2

        lines.forEach((line, index) => {
          if (line && typeof line === 'string') {
            const y = startY + index * lineHeight
            const x = canvas.width / 2

            ctx.strokeStyle = strokeColor
            ctx.strokeText(line, x, y)

            ctx.fillStyle = textColor
            ctx.fillText(line, x, y)
          }
        })
      }
    } catch (error) {
      console.error('绘制canvas失败:', error)
    }
  }, [inputText, selectedTemplate, selectedFont, textColor, strokeColor])

  const handleGenerate = useCallback(async () => {
    const canvas = previewCanvasRef.current
    if (!canvas || !inputText.trim() || !selectedTemplate) return

    try {
      await drawCanvas()

      await new Promise<void>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            setPreviewImage(url)
          }
          resolve()
        }, 'image/png', 0.9)
      })
    } catch (error) {
      console.error('生成图片失败:', error)
    }
  }, [drawCanvas, inputText, selectedTemplate])

  // Auto-regenerate on text/color/font changes
  useEffect(() => {
    if (inputText.trim() && selectedTemplate) {
      handleGenerate()
    } else if (!inputText.trim()) {
      setPreviewImage('')
    }
  }, [inputText, textColor, strokeColor, selectedFont])

  const selectTemplate = useCallback(
    (template: Template) => {
      setSelectedTemplate(template)
      setPreviewImage('')
      if (inputText.trim()) {
        // Trigger regeneration
        setTimeout(() => handleGenerate(), 0)
      }
    },
    [inputText, handleGenerate],
  )

  const handleUpload = useCallback(async () => {
    if (!previewImage) return
    const canvas = previewCanvasRef.current
    if (!canvas) return

    try {
      await drawCanvas()

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `text-image-${Date.now()}.png`, {
            type: 'image/png',
          })
          onGenerate({
            text: inputText,
            template: selectedTemplate!,
            imageFile: file,
            imageUrl: previewImage,
          })
        }
      }, 'image/png', 0.9)
    } catch (error) {
      console.error('上传图片失败:', error)
    }
  }, [previewImage, drawCanvas, inputText, selectedTemplate, onGenerate])

  const handleEmojiSelect = useCallback((emoji: any) => {
    const emojiChar = emoji.emoji || emoji.i || emoji.native || emoji
    setInputText((prev) => prev + emojiChar)
    setShowEmojiPanel(false)
  }, [])

  const placeholderText = (() => {
    const hasText = inputText.trim()
    const hasTemplate = selectedTemplate
    if (!hasText && !hasTemplate) return '请输入文字并选择模版'
    if (hasTemplate && !hasText) return '请输入文字内容'
    if (hasText && !hasTemplate) return '请选择模版'
    return '图片生成中...'
  })()

  const handleOverlayMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose()
      }
    },
    [onClose],
  )

  if (!visible) return null

  return (
    <div className="text-image-modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <div className="text-image-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">文字配图</h3>
          <button className="close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="main-content">
            {/* 左侧预览区域 */}
            <div className="preview-section">
              <div className={`preview-container${previewImage ? ' has-image' : ''}`}>
                {!previewImage ? (
                  <div className="preview-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <p>{placeholderText}</p>
                  </div>
                ) : (
                  <img src={previewImage} className="preview-image" alt="生成的图片" />
                )}
                <canvas
                  ref={previewCanvasRef}
                  className="hidden-canvas"
                  width={400}
                  height={600}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* 右侧控制区域 */}
            <div className="controls-section">
              <div className="font-controls">
                <div className="color-controls">
                  <div className="control-group">
                    <label className="control-label">文字颜色</label>
                    <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="color-picker" />
                  </div>
                  <div className="control-group">
                    <label className="control-label">描边颜色</label>
                    <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="color-picker" />
                  </div>
                </div>
                <div className="control-group">
                  <label className="control-label">字体</label>
                  <DropdownSelect
                    value={selectedFont}
                    options={FONT_OPTIONS}
                    placeholder="选择字体"
                    minWidth="120px"
                    maxWidth="200px"
                    size="small"
                    onChange={(data) => setSelectedFont(String(data.value))}
                  />
                </div>
              </div>

              <div className="input-emoji-container">
                <div className="input-section">
                  <div className="content-input-wrapper">
                    <ContentEditableInput
                      value={inputText}
                      onChange={setInputText}
                      placeholder="输入文字内容"
                      className="content-textarea-wrapper"
                    />
                    <div className="content-actions">
                      <button className="emoji-btn" onClick={() => setShowEmojiPanel(!showEmojiPanel)}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                          <line x1="9" y1="9" x2="9.01" y2="9" />
                          <line x1="15" y1="9" x2="15.01" y2="9" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {showEmojiPanel && (
                    <div className="emoji-panel-overlay" onClick={() => setShowEmojiPanel(false)}>
                      <div className="emoji-panel" onClick={(e) => e.stopPropagation()}>
                        <EmojiPicker onSelect={handleEmojiSelect} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="template-section">
                <div className="section-title">选择模版</div>
                <div className="template-scroll-container">
                  <div className="template-list">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className={`template-item${selectedTemplate?.id === template.id ? ' active' : ''}`}
                        onClick={() => selectTemplate(template)}
                      >
                        <img src={template.src} alt={template.name} className="template-image" />
                        <span className="template-name">{template.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>取消</button>
          <button className="upload-btn" disabled={!previewImage} onClick={handleUpload}>上传</button>
        </div>
      </div>

      <style>{`
        .text-image-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--overlay-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .text-image-modal {
          background: var(--bg-color-primary);
          border-radius: 8px;
          width: 100%;
          max-width: 700px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 20px var(--shadow-color);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 30px;
          border-bottom: 1px solid var(--border-color-primary);
          flex-shrink: 0;
          background: var(--bg-color-primary);
        }

        .modal-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-color-primary);
          margin: 0;
        }

        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 5px;
          color: var(--text-color-secondary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          color: var(--text-color-primary);
          background-color: var(--bg-color-secondary);
        }

        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 30px;
          display: flex;
          flex-direction: column;
          gap: 30px;
          background: var(--bg-color-primary);
        }

        .main-content {
          display: flex;
          flex-direction: row;
          gap: 30px;
          flex: 1;
        }

        .preview-section {
          flex: 0 0 300px;
          text-align: center;
        }

        .controls-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-width: 0;
        }

        .input-emoji-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          flex: 1;
        }

        .preview-container {
          width: 100%;
          border: 2px dashed var(--border-color-primary);
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-color-primary);
          min-height: 400px;
          overflow: hidden;
          position: relative;
        }

        .preview-container.has-image {
          border: none;
        }

        .preview-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: var(--text-color-secondary);
        }

        .preview-placeholder p {
          margin: 0;
          font-size: 18px;
        }

        .preview-image {
          max-width: 100%;
          max-height: 400px;
          border-radius: 8px;
          object-fit: contain;
          display: block;
          margin: 0 auto;
        }

        .hidden-canvas {
          display: none !important;
        }

        .input-section {
          position: relative;
        }

        .content-input-wrapper {
          position: relative;
          border: 1px solid var(--border-color-primary);
          border-radius: 8px;
          background: var(--bg-color-primary);
          transition: all 0.2s ease;
        }

        .content-input-wrapper:focus-within {
          border-color: var(--primary-color);
        }

        .content-actions {
          position: absolute;
          bottom: 0.5rem;
          left: 1rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .emoji-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          color: var(--text-color-secondary);
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .emoji-btn:hover {
          background: var(--bg-color-secondary);
          color: var(--text-color-primary);
        }

        .emoji-panel-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: timFadeIn 0.2s ease;
        }

        .emoji-panel {
          background: var(--bg-color-primary);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          animation: timScaleIn 0.2s ease;
          max-width: 90vw;
          max-height: 80vh;
        }

        @keyframes timFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes timScaleIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }

        .font-controls {
          background: var(--bg-color-primary);
          border-radius: 8px;
          padding: 8px 10px;
          border: 1px solid var(--border-color-primary);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .control-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .control-group:last-child {
          margin-bottom: 0;
        }

        .control-label {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-color-primary);
          margin: 0;
        }

        .color-controls {
          display: flex;
          flex-direction: row;
          gap: 16px;
        }

        .color-picker {
          width: 25px;
          height: 25px;
          box-shadow: 0 0 0 2px var(--border-color-primary);
          border-radius: 50%;
          cursor: pointer;
          background: none;
          padding: 0;
        }

        .color-picker::-webkit-color-swatch-wrapper {
          padding: 0;
          border: none;
          border-radius: 6px;
        }

        .color-picker::-webkit-color-swatch {
          border: none;
          border-radius: 6px;
        }

        .template-section {
          flex-shrink: 0;
        }

        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-color-primary);
        }

        .template-scroll-container {
          overflow-x: auto;
          scrollbar-width: thin;
        }

        .template-scroll-container::-webkit-scrollbar {
          height: 6px;
        }

        .template-scroll-container::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 3px;
        }

        .template-scroll-container::-webkit-scrollbar-thumb {
          background: var(--border-color-primary);
          border-radius: 3px;
        }

        .template-scroll-container::-webkit-scrollbar-thumb:hover {
          background: var(--text-color-quaternary);
        }

        .template-list {
          display: flex;
          gap: 12px;
          padding: 8px 12px;
        }

        .template-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
          width: 80px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .template-item:hover .template-image {
          scale: 1.05;
          border: 1px solid var(--primary-color-shadow);
        }

        .template-item.active .template-image {
          scale: 1.05;
          border: 1px solid var(--primary-color);
        }

        .template-image {
          width: 80px;
          height: 120px;
          object-fit: cover;
          border-radius: 8px;
          border: 1px solid var(--border-color-primary);
          user-select: none;
        }

        .template-name {
          display: block;
          font-size: 12px;
          color: var(--text-color-secondary);
          font-weight: 500;
          margin: 4px 0 0 0;
          user-select: none;
        }

        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 16px;
          padding: 8px 30px;
          border-top: 1px solid var(--border-color-primary);
          background: var(--bg-color-primary);
          flex-shrink: 0;
        }

        .cancel-btn,
        .upload-btn {
          padding: 10px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          min-width: 80px;
        }

        .cancel-btn {
          background: var(--bg-color-primary);
          color: var(--text-color-secondary);
          border: 1px solid var(--border-color-primary);
        }

        .cancel-btn:hover {
          background: var(--bg-color-secondary);
          color: var(--text-color-primary);
        }

        .upload-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .upload-btn {
          background: var(--primary-color);
          color: white;
        }

        .upload-btn:hover {
          background-color: var(--primary-color-dark);
        }

        @media (max-width: 768px) {
          .color-controls {
            flex-direction: row;
            gap: 24px;
          }
        }

        @media (max-width: 640px) {
          .text-image-modal {
            margin: 0.5rem;
            max-width: none;
          }

          .modal-header,
          .modal-body,
          .modal-footer {
            padding: 1rem;
          }

          .main-content {
            flex-direction: column;
            gap: 20px;
          }

          .preview-section {
            flex: none;
          }

          .preview-container {
            min-height: 250px;
          }

          .preview-image {
            max-height: 300px;
          }

          .template-item {
            width: 100px;
          }

          .template-image {
            width: 100px;
          }
        }
      `}</style>
    </div>
  )
}
