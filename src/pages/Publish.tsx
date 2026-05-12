import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useUserStore } from '@/stores/user-store'
import { useAuthStore } from '@/stores/auth-store'
import { useNavigationStore } from '@/stores/navigation-store'
import { createPost, getPostDetail, updatePost } from '@/lib/api/posts'
import { getCategories } from '@/lib/api/categories'
import { DropdownSelect } from '@/components/DropdownSelect'
import { TagSelector } from '@/components/TagSelector'
import { EmojiPicker } from '@/components/EmojiPicker'
import TextImageModal from '@/components/TextImageModal'
import { toast } from '@/utils/toastManager'

const DEFAULT_AVATAR = '/avatar.png'

interface Category {
  id: number
  name: string
}

export default function Publish() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const userStore = useUserStore()
  const authStore = useAuthStore()
  const navigationStore = useNavigationStore()
  const contentTextareaRef = useRef<HTMLDivElement>(null)

  // Upload type
  const [uploadType, setUploadType] = useState<'image' | 'video'>('image')

  // Form state
  const [form, setForm] = useState({
    title: '',
    content: '',
    images: [] as string[],
    video: null as any,
    tags: [] as string[],
    category_id: null as number | null,
  })

  // Publish state
  const [isPublishing, setIsPublishing] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)

  // UI state
  const [showEmojiPanel, setShowEmojiPanel] = useState(false)
  const [showMentionPanel, setShowMentionPanel] = useState(false)
  const [showTextImageModal, setShowTextImageModal] = useState(false)

  // Data
  const [categories, setCategories] = useState<Category[]>([])
  const [uploadedImages, setUploadedImages] = useState<{ file: File; preview: string }[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string>('')

  // Edit mode
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)

  const isLoggedIn = userStore.isLoggedIn()

  // Validation
  const canPublish = useMemo(() => {
    if (!form.title.trim() || !form.content.trim() || !form.category_id) return false
    if (uploadType === 'image') return uploadedImages.length > 0
    if (uploadType === 'video') return !!(videoFile || videoPreview)
    return false
  }, [form.title, form.content, form.category_id, uploadType, uploadedImages, videoFile, videoPreview])

  const canSaveDraft = useMemo(() => {
    const hasContent = form.title.trim() || form.content.trim()
    if (!hasContent) return false
    if (uploadType === 'image') return uploadedImages.length > 0
    if (uploadType === 'video') return !!(videoFile || videoPreview)
    return false
  }, [form.title, form.content, uploadType, uploadedImages, videoFile, videoPreview])

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const response = await getCategories()
      if (response.success && response.data) {
        setCategories(
          response.data.map((cat: any) => ({ id: cat.id, name: cat.name })),
        )
      }
    } catch (error) {
      console.error('加载分类失败:', error)
    }
  }, [])

  // Load draft data
  const loadDraftData = useCallback(async (draftId: string) => {
    try {
      const response = await getPostDetail(draftId)
      if (response && response.originalData) {
        const draft = response.originalData
        setForm({
          title: response.title || '',
          content: draft.content || '',
          images: draft.images || [],
          video: null,
          tags: Array.isArray(draft.tags)
            ? draft.tags.map((t: any) => (typeof t === 'object' ? t.name : String(t)))
            : [],
          category_id: null,
        })

        if (response.video_url && response.cover_url) {
          setVideoPreview(response.video_url)
          setUploadType('video')
        } else if (draft.images?.length > 0) {
          setUploadType('image')
        }

        setCurrentDraftId(draftId)
        setIsEditMode(true)
        showMessage('草稿加载成功')
      } else {
        showMessage('草稿不存在或已被删除', 'error')
      }
    } catch (error) {
      console.error('加载草稿失败:', error)
      showMessage('加载草稿失败', 'error')
    }
  }, [])

  // Mount
  useEffect(() => {
    navigationStore.scrollToTop('instant')
    loadCategories()

    const draftId = searchParams.get('draftId')
    const mode = searchParams.get('mode')
    if (draftId && mode === 'edit') {
      loadDraftData(draftId)
    }
  }, [])

  const showMessage = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (type === 'error') toast.error(message)
    else if (type === 'info') toast.info(message)
    else toast.success(message)
  }

  // Image upload handlers
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + uploadedImages.length > 9) {
      showMessage('最多上传9张图片', 'error')
      return
    }
    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setUploadedImages((prev) => [...prev, ...newImages])
    e.target.value = ''
  }, [uploadedImages.length])

  const removeImage = useCallback((index: number) => {
    setUploadedImages((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  // Video upload handlers
  const handleVideoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setVideoFile(file)
    setVideoPreview(URL.createObjectURL(file))
    e.target.value = ''
  }, [])

  // Switch upload type
  const switchUploadType = useCallback((type: 'image' | 'video') => {
    if (uploadType === type) return
    if (type === 'image') {
      setVideoFile(null)
      if (videoPreview) URL.revokeObjectURL(videoPreview)
      setVideoPreview('')
      setForm((prev) => ({ ...prev, video: null }))
    } else {
      setUploadedImages((prev) => {
        prev.forEach((img) => URL.revokeObjectURL(img.preview))
        return []
      })
      setForm((prev) => ({ ...prev, images: [] }))
    }
    setUploadType(type)
  }, [uploadType, videoPreview])

  // Content handlers
  const handleContentInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      const text = e.currentTarget.textContent || ''
      setForm((prev) => ({ ...prev, content: text }))
    },
    [],
  )

  const handleEmojiSelect = useCallback((emoji: any) => {
    const el = contentTextareaRef.current
    const emojiChar = emoji.i || emoji.native || emoji
    if (el) {
      el.focus()
      // Insert at cursor
      const selection = window.getSelection()
      if (selection?.rangeCount) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        const textNode = document.createTextNode(emojiChar)
        range.insertNode(textNode)
        range.setStartAfter(textNode)
        range.setEndAfter(textNode)
        selection.removeAllRanges()
        selection.addRange(range)
      } else {
        el.textContent += emojiChar
      }
      setForm((prev) => ({ ...prev, content: el.textContent || '' }))
    }
    setShowEmojiPanel(false)
  }, [])

  // Text image generate handler
  const handleTextImageGenerate = useCallback((data: { text: string; template: any; imageFile: File; imageUrl: string }) => {
    setUploadedImages((prev) => {
      if (prev.length >= 9) {
        showMessage('最多上传9张图片', 'error')
        return prev
      }
      return [...prev, { file: data.imageFile, preview: data.imageUrl }]
    })
    setShowTextImageModal(false)
  }, [])

  // Publish
  const handlePublish = useCallback(async () => {
    if (!form.title.trim()) { showMessage('请输入标题', 'error'); return }
    if (!form.content.trim()) { showMessage('请输入内容', 'error'); return }
    if (!form.category_id) { showMessage('请选择分类', 'error'); return }

    if (uploadType === 'image' && uploadedImages.length === 0) {
      showMessage('请至少上传一张图片', 'error')
      return
    }
    if (uploadType === 'video' && !videoFile && !videoPreview) {
      showMessage('请选择视频文件', 'error')
      return
    }

    setIsPublishing(true)
    try {
      let mediaData: any = []

      if (uploadType === 'image') {
        // Upload images
        showMessage('正在上传图片...', 'info')
        // In a real app, this would use the upload API
        mediaData = uploadedImages.map((img) => ({ file: img.file, url: img.preview, name: img.file.name }))
      } else if (uploadType === 'video' && videoFile) {
        showMessage('正在上传视频...', 'info')
        mediaData = { file: videoFile, url: videoPreview, name: videoFile.name }
      }

      const postData = {
        title: form.title.trim(),
        content: form.content,
        images: uploadType === 'image' ? mediaData : [],
        video: uploadType === 'video' ? mediaData : null,
        tags: form.tags,
        category_id: form.category_id,
        type: uploadType === 'image' ? 1 : 2,
        status: 2, // pending review
      }

      showMessage('正在发布笔记...', 'info')

      let response
      if (isEditMode && currentDraftId) {
        response = await updatePost(Number(currentDraftId), postData)
      } else {
        response = await createPost(postData)
      }

      if (response.success) {
        showMessage('发布成功！')
        setTimeout(() => navigate('/post-management'), 1500)
      } else {
        showMessage(response.message || '发布失败', 'error')
      }
    } catch (err) {
      console.error('发布失败:', err)
      showMessage('发布失败，请重试', 'error')
    } finally {
      setIsPublishing(false)
    }
  }, [form, uploadType, uploadedImages, videoFile, videoPreview, isEditMode, currentDraftId, navigate])

  // Save draft
  const handleSaveDraft = useCallback(async () => {
    if (!form.title.trim() && !form.content.trim()) {
      showMessage('请输入标题或内容', 'error')
      return
    }
    if (uploadType === 'image' && uploadedImages.length === 0) {
      showMessage('请至少上传一张图片', 'error')
      return
    }
    if (uploadType === 'video' && !videoFile && !videoPreview) {
      showMessage('请选择视频文件', 'error')
      return
    }

    setIsSavingDraft(true)
    try {
      let mediaData: any = []
      if (uploadType === 'image') {
        mediaData = uploadedImages.map((img) => ({ file: img.file, url: img.preview, name: img.file.name }))
      } else if (uploadType === 'video' && videoFile) {
        mediaData = { file: videoFile, url: videoPreview, name: videoFile.name }
      }

      const draftData = {
        title: form.title.trim() || '',
        content: form.content || '',
        images: uploadType === 'image' ? mediaData : [],
        video: uploadType === 'video' ? mediaData : null,
        tags: form.tags || [],
        category_id: form.category_id || null,
        type: uploadType === 'image' ? 1 : 2,
        status: 1, // draft
      }

      let response
      if (isEditMode && currentDraftId) {
        response = await updatePost(Number(currentDraftId), draftData)
      } else {
        response = await createPost(draftData)
        if (response.success && response.data) {
          setCurrentDraftId(response.data.id)
          setIsEditMode(true)
        }
      }

      if (response.success) {
        showMessage('草稿保存成功！')
        setTimeout(() => navigate('/draft-box'), 1500)
      } else {
        showMessage(response.message || '草稿保存失败', 'error')
      }
    } catch (err) {
      console.error('草稿保存失败:', err)
      showMessage('草稿保存失败，请重试', 'error')
    } finally {
      setIsSavingDraft(false)
    }
  }, [form, uploadType, uploadedImages, videoFile, videoPreview, isEditMode, currentDraftId, navigate])

  if (!isLoggedIn) {
    return (
      <div className="publish-container">
        <div className="login-prompt">
          <h3>请先登录</h3>
          <p>登录后即可发布和管理笔记</p>
        </div>
        <style>{`
          .publish-container { min-height: 100vh; background: var(--bg-color-primary); color: var(--text-color-primary); padding-top: 72px; }
          .login-prompt { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; text-align: center; }
          .login-prompt h3 { color: var(--text-color-primary); font-size: 18px; font-weight: 600; margin: 0 0 8px 0; }
          .login-prompt p { color: var(--text-color-secondary); font-size: 14px; margin: 0 0 20px 0; line-height: 1.5; }
        `}</style>
      </div>
    )
  }

  return (
    <div className="publish-container">
      {/* Header */}
      <div className="publish-header">
        <div className="header-left">
          <h1 className="page-title">发布笔记</h1>
        </div>
        <div className="header-right">
          <button className="draft-box-btn" onClick={() => navigate('/draft-box')}>
            草稿箱
          </button>
          <button className="manage-btn" onClick={() => navigate('/post-management')}>
            笔记管理
          </button>
        </div>
      </div>

      <div className="publish-content">
        <form
          onSubmit={(e) => { e.preventDefault(); handlePublish() }}
          className="publish-form"
        >
          {/* Upload section */}
          <div className="upload-section">
            <div className="upload-tabs">
              <button
                type="button"
                className={`tab-btn${uploadType === 'image' ? ' active' : ''}`}
                onClick={() => switchUploadType('image')}
              >
                上传图文
              </button>
              <button
                type="button"
                className={`tab-btn${uploadType === 'video' ? ' active' : ''}`}
                onClick={() => switchUploadType('video')}
              >
                上传视频
              </button>
            </div>

            <div className="upload-content">
              {uploadType === 'image' ? (
                <div className="image-upload-area">
                  <div className="image-grid">
                    {uploadedImages.map((img, idx) => (
                      <div key={idx} className="image-item">
                        <img src={img.preview} alt={`图片${idx + 1}`} />
                        <button type="button" className="remove-btn" onClick={() => removeImage(idx)}>
                          &times;
                        </button>
                      </div>
                    ))}
                    {uploadedImages.length < 9 && (
                      <label className="image-add-btn">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageSelect}
                          style={{ display: 'none' }}
                        />
                        <span>+</span>
                      </label>
                    )}
                  </div>
                </div>
              ) : (
                <div className="video-upload-area">
                  {videoPreview ? (
                    <div className="video-preview">
                      <video src={videoPreview} controls style={{ width: '100%', maxHeight: 300 }} />
                      <button type="button" className="remove-btn" onClick={() => { setVideoFile(null); setVideoPreview('') }}>
                        &times;
                      </button>
                    </div>
                  ) : (
                    <label className="video-add-btn">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoSelect}
                        style={{ display: 'none' }}
                      />
                      <span>+ 选择视频</span>
                    </label>
                  )}
                </div>
              )}
            </div>

            {uploadType === 'image' && (
              <div className="text-image-section">
                <button type="button" className="text-image-btn" onClick={() => setShowTextImageModal(true)}>
                  文字配图
                </button>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="input-section">
            <input
              type="text"
              className="title-input"
              placeholder="请输入标题"
              maxLength={100}
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <div className="char-count">{form.title.length}/100</div>
          </div>

          {/* Content */}
          <div className="input-section">
            <div className="content-input-wrapper">
              <div
                ref={contentTextareaRef}
                className="content-textarea"
                contentEditable
                data-placeholder="请输入内容"
                onInput={handleContentInput}
                suppressContentEditableWarning
              />
              <div className="content-actions">
                <button type="button" className="mention-btn" onClick={() => setShowMentionPanel(!showMentionPanel)}>
                  @
                </button>
                <button type="button" className="emoji-btn" onClick={() => setShowEmojiPanel(!showEmojiPanel)}>
                  😊
                </button>
              </div>
            </div>
            <div className="char-count">{form.content.length}/2000</div>

            {showEmojiPanel && (
              <div className="emoji-panel-overlay" onClick={() => setShowEmojiPanel(false)}>
                <div className="emoji-panel" onClick={(e) => e.stopPropagation()}>
                  <EmojiPicker onSelect={handleEmojiSelect} native set="native" hideSkinTones hideSearch={false} />
                </div>
              </div>
            )}
          </div>

          {/* Category */}
          <div className="category-section">
            <div className="section-title">分类</div>
            <DropdownSelect
              value={form.category_id}
              options={categories}
              placeholder="请选择分类"
              labelKey="name"
              valueKey="id"
              maxWidth="300px"
              minWidth="200px"
              onChange={(data: { value: number }) => setForm((prev) => ({ ...prev, category_id: data.value }))}
            />
          </div>

          {/* Tags */}
          <div className="tag-section">
            <div className="section-title">标签 (最多10个)</div>
            <TagSelector
              value={form.tags}
              maxTags={10}
              onChange={(tags: string[]) => setForm((prev) => ({ ...prev, tags }))}
            />
          </div>
        </form>

        {/* Actions */}
        <div className="publish-actions">
          <button
            className="draft-btn"
            disabled={!canSaveDraft || isSavingDraft}
            onClick={handleSaveDraft}
          >
            {isSavingDraft ? '保存中...' : '存草稿'}
          </button>
          <button
            className="publish-btn"
            disabled={!canPublish || isPublishing}
            onClick={handlePublish}
          >
            {isPublishing ? '发布中...' : '发布'}
          </button>
        </div>
      </div>

      <style>{`
        .publish-container {
          min-height: 100vh;
          background: var(--bg-color-primary);
          color: var(--text-color-primary);
          padding-bottom: calc(48px + env(safe-area-inset-bottom, 0px));
          margin: 72px auto;
          min-width: 700px;
          max-width: 700px;
          transition: background-color 0.3s ease;
        }
        .publish-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          background: var(--bg-color-primary);
          border-bottom: 1px solid var(--border-color-primary);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .header-left { display: flex; align-items: center; gap: 0.75rem; }
        .header-right { display: flex; align-items: center; gap: 0.75rem; }
        .draft-box-btn, .manage-btn {
          display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem;
          background: var(--primary-color); color: white; border: none; border-radius: 6px;
          cursor: pointer; font-size: 0.9rem; font-weight: 500; transition: all 0.3s ease;
        }
        .draft-box-btn:hover, .manage-btn:hover { background: var(--primary-color-dark); }
        .page-title { font-size: 1.2rem; font-weight: 600; margin: 0; color: var(--text-color-primary); }
        .publish-content { padding: 1rem; max-width: 600px; margin: 0 auto; background-color: var(--bg-color-primary); }
        .publish-form { display: flex; flex-direction: column; gap: 1rem; }
        .upload-section { margin-bottom: 0.5rem; }
        .upload-tabs { display: flex; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color-primary); }
        .tab-btn { padding: 12px 24px; border: none; background: transparent; color: var(--text-color-secondary); font-size: 14px; font-weight: 500; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.3s ease; }
        .tab-btn:hover { color: var(--text-color-primary); }
        .tab-btn.active { color: var(--primary-color); border-bottom-color: var(--primary-color); }
        .upload-content { margin-bottom: 1rem; }
        .image-grid { display: flex; flex-wrap: wrap; gap: 8px; }
        .image-item { position: relative; width: 100px; height: 100px; border-radius: 8px; overflow: hidden; }
        .image-item img { width: 100%; height: 100%; object-fit: cover; }
        .image-add-btn, .video-add-btn { width: 100px; height: 100px; border: 2px dashed var(--border-color-primary); border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 32px; color: var(--text-color-secondary); transition: all 0.3s ease; }
        .image-add-btn:hover, .video-add-btn:hover { border-color: var(--primary-color); color: var(--primary-color); }
        .remove-btn { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; border: none; border-radius: 50%; background: rgba(0,0,0,0.5); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; line-height: 1; }
        .video-preview { position: relative; }
        .video-preview .remove-btn { position: absolute; top: 8px; right: 8px; }
        .video-add-btn { width: 100%; height: 200px; }
        .text-image-section { margin-top: 0.75rem; display: flex; justify-content: flex-start; }
        .text-image-btn { display: flex; align-items: center; padding: 0.4rem; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; }
        .text-image-btn:hover { background: var(--primary-color-dark); }
        .input-section { position: relative; }
        .title-input {
          width: 100%; padding: 10px; border: 1px solid var(--border-color-primary); border-radius: 8px;
          background: var(--bg-color-primary); color: var(--text-color-primary); font-size: 16px; font-weight: bold;
          transition: all 0.3s ease; box-sizing: border-box;
        }
        .title-input:focus { outline: none; border-color: var(--primary-color); }
        .title-input::placeholder { color: var(--text-color-secondary); }
        .content-input-wrapper { position: relative; border: 1px solid var(--border-color-primary); border-radius: 8px; background: var(--bg-color-primary); }
        .content-input-wrapper:focus-within { border-color: var(--primary-color); }
        .content-textarea {
          width: 100%; padding: 1rem; padding-bottom: 3rem; border: none; border-radius: 8px;
          background: transparent; color: var(--text-color-primary); font-size: 16px; line-height: 1.5;
          min-height: 120px; box-sizing: border-box; outline: none; caret-color: var(--primary-color);
        }
        .content-textarea:empty:before {
          content: attr(data-placeholder); color: var(--text-color-secondary); pointer-events: none;
        }
        .content-actions { position: absolute; bottom: 0.5rem; left: 1rem; display: flex; align-items: center; gap: 8px; }
        .emoji-btn, .mention-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: none; background: transparent; color: var(--text-color-secondary); border-radius: 50%; cursor: pointer; transition: all 0.3s ease; font-size: 18px; }
        .emoji-btn:hover, .mention-btn:hover { background: var(--bg-color-secondary); color: var(--text-color-primary); }
        .emoji-panel-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: transparent; display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn 0.2s ease; }
        .emoji-panel { background: var(--bg-color-primary); border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); overflow: hidden; animation: scaleIn 0.2s ease; max-width: 90vw; max-height: 80vh; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .char-count { position: absolute; bottom: 0.5rem; right: 0.75rem; font-size: 0.8rem; color: var(--text-color-secondary); background: var(--bg-color-primary); padding: 0.25rem; }
        .section-title { font-size: 0.9rem; font-weight: 500; color: var(--text-color-primary); margin-bottom: 0.75rem; }
        .category-section { margin-bottom: 1rem; }
        .publish-actions { display: flex; justify-content: center; align-items: center; gap: 1rem; padding: 2rem 1rem; margin-top: 2rem; background: var(--bg-color-primary); }
        .draft-btn { width: 20%; padding: 12px; background-color: var(--text-color-secondary); color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 500; cursor: pointer; transition: background-color 0.3s ease; display: flex; align-items: center; justify-content: center; }
        .draft-btn:hover:not(:disabled) { background: var(--text-color-primary); }
        .draft-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .publish-btn { width: 20%; padding: 12px; background-color: var(--primary-color); color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 500; cursor: pointer; transition: background-color 0.3s ease; display: flex; align-items: center; justify-content: center; }
        .publish-btn:hover:not(:disabled) { background: var(--primary-color-dark); }
        .publish-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        @media (max-width: 960px) { .publish-container { min-width: 100%; max-width: 100%; margin: 72px 0; } .publish-header { padding: 0.75rem 1rem; } .header-right { gap: 0.5rem; } .draft-box-btn, .manage-btn { padding: 0.4rem 0.8rem; font-size: 0.8rem; } .publish-content { padding: 0.75rem; } .publish-actions { padding: 1rem 0.75rem; } }
        @media (max-width: 480px) { .publish-actions { padding: 1rem 0.5rem; gap: 0.5rem; } }
      `}</style>

      {showTextImageModal && (
        <TextImageModal
          visible={showTextImageModal}
          onClose={() => setShowTextImageModal(false)}
          onGenerate={handleTextImageGenerate}
        />
      )}
    </div>
  )
}
