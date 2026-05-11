import { useState, useCallback, useRef } from 'react'
import { useUserStore } from '@/stores/user-store'
import { imageUploadApi } from '@/lib/api'
import ContentEditableInput from '@/components/ContentEditableInput'
import { DropdownSelect } from '@/components/DropdownSelect'
import { EmojiPicker } from '@/components/EmojiPicker'
import { MbtiPicker } from '@/components/MbtiPicker'
import CropModal from '@/components/CropModal'
import { X } from 'lucide-react'
import { toast } from '@/utils/toastManager'

const DEFAULT_AVATAR = '/avatar.png'

interface EditProfileModalProps {
  visible: boolean
  onClose: () => void
  onSaved: (formData: any) => void
}

const GENDER_OPTIONS = [
  { label: '男', value: 1 },
  { label: '女', value: 2 },
  { label: '暂不设置', value: 0 },
]

const EDUCATION_OPTIONS = [
  { label: '高中及以下', value: '高中及以下' },
  { label: '大专', value: '大专' },
  { label: '本科', value: '本科' },
  { label: '硕士', value: '硕士' },
  { label: '博士', value: '博士' },
]

const MBTI_DIMENSIONS = [
  {
    key: 'EI',
    label: '外向/内向',
    options: [
      { value: 'E', label: 'E (外向)' },
      { value: 'I', label: 'I (内向)' },
    ],
  },
  {
    key: 'SN',
    label: '感觉/直觉',
    options: [
      { value: 'S', label: 'S (感觉)' },
      { value: 'N', label: 'N (直觉)' },
    ],
  },
  {
    key: 'TF',
    label: '思考/情感',
    options: [
      { value: 'T', label: 'T (思考)' },
      { value: 'F', label: 'F (情感)' },
    ],
  },
  {
    key: 'JP',
    label: '判断/感知',
    options: [
      { value: 'J', label: 'J (判断)' },
      { value: 'P', label: 'P (感知)' },
    ],
  },
]

const ZODIAC_OPTIONS = [
  { label: '白羊座', value: '白羊座' },
  { label: '金牛座', value: '金牛座' },
  { label: '双子座', value: '双子座' },
  { label: '巨蟹座', value: '巨蟹座' },
  { label: '狮子座', value: '狮子座' },
  { label: '处女座', value: '处女座' },
  { label: '天秤座', value: '天秤座' },
  { label: '天蝎座', value: '天蝎座' },
  { label: '射手座', value: '射手座' },
  { label: '摩羯座', value: '摩羯座' },
  { label: '水瓶座', value: '水瓶座' },
  { label: '双鱼座', value: '双鱼座' },
]

function sanitizeContent(content: string): string {
  if (!content) return ''
  const div = document.createElement('div')
  div.innerHTML = content
  return div.textContent || div.innerText || ''
}

export default function EditProfileModal({ visible, onClose, onSaved }: EditProfileModalProps) {
  const userStore = useUserStore()

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [nickname, setNickname] = useState(userStore.userInfo?.nickname || '')
  const [bio, setBio] = useState(userStore.userInfo?.bio || '')
  const [gender, setGender] = useState(userStore.userInfo?.gender || 0)
  const [zodiac, setZodiac] = useState((userStore.userInfo as any)?.zodiac || '')
  const [mbti, setMbti] = useState(userStore.userInfo?.mbti || '')
  const [education, setEducation] = useState(userStore.userInfo?.education || '')
  const [major, setMajor] = useState(userStore.userInfo?.major || '')
  const [interests, setInterests] = useState<string[]>(userStore.userInfo?.interests || [])
  const [interestInput, setInterestInput] = useState('')

  const [showEmojiPanel, setShowEmojiPanel] = useState(false)
  const [showCropModal, setShowCropModal] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate type
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      return
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过5MB')
      return
    }

    const url = URL.createObjectURL(file)
    setCropImageSrc(url)
    setShowCropModal(true)
    e.target.value = ''
  }, [])

  const handleCropConfirm = useCallback((blob: Blob) => {
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(blob))
    setShowCropModal(false)
  }, [])

  const handleSave = useCallback(async () => {
    if (saving) return
    setSaving(true)

    try {
      let avatarUrl = userStore.userInfo?.avatar || ''

      // Upload avatar if changed
      if (avatarFile) {
        setUploading(true)
        try {
          const uploadRes = await imageUploadApi.uploadCroppedImage(avatarFile, { filename: 'avatar.jpg' })
          if ((uploadRes as any).success && (uploadRes as any).url) {
            avatarUrl = (uploadRes as any).url
          }
        } catch (err) {
          console.error('头像上传失败:', err)
        } finally {
          setUploading(false)
        }
      }

      const formData: any = {
        nickname: nickname.trim(),
        bio: sanitizeContent(bio),
        gender,
        mbti,
        education,
        major: major.trim(),
        zodiac,
        interests,
      }

      if (avatarUrl) formData.avatar = avatarUrl

      // Update via API
      const result = await userStore.updateProfile(formData)

      if (result.success) {
        toast.success('资料更新成功')
        onSaved(formData)
      } else {
        toast.error(result.message || '保存失败，请重试')
      }
    } catch (error) {
      console.error('保存失败:', error)
      toast.error('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }, [saving, avatarFile, nickname, bio, gender, mbti, education, major, zodiac, interests, userStore, onSaved])

  const handleEmojiSelect = useCallback((emoji: any) => {
    const emojiChar = emoji.emoji || emoji.native || emoji.i
    setBio((prev) => prev + emojiChar)
    setShowEmojiPanel(false)
  }, [])

  const handleAddInterest = useCallback(() => {
    const val = interestInput.trim()
    if (!val) return
    if (interests.length >= 5) {
      toast.error('最多添加5个兴趣')
      return
    }
    if (val.length > 8) {
      toast.error('每个兴趣最多8个字符')
      return
    }
    if (interests.includes(val)) {
      toast.error('该兴趣已添加')
      return
    }
    setInterests((prev) => [...prev, val])
    setInterestInput('')
  }, [interestInput, interests])

  const removeInterest = useCallback((index: number) => {
    setInterests((prev) => prev.filter((_, i) => i !== index))
  }, [])

  if (!visible) return null

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="edit-profile-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>编辑资料</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Avatar */}
          <div className="form-group">
            <label className="form-label">头像</label>
            <div className="avatar-upload-area">
              <img
                src={avatarPreview || userStore.userInfo?.avatar || DEFAULT_AVATAR}
                alt="头像"
                className="avatar-preview"
                onClick={() => fileInputRef.current?.click()}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <button className="change-avatar-btn" onClick={() => fileInputRef.current?.click()}>
                更换头像
              </button>
            </div>
          </div>

          {/* Nickname */}
          <div className="form-group">
            <label className="form-label">昵称</label>
            <input
              type="text"
              className="form-input"
              placeholder="请输入昵称"
              maxLength={10}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            <span className="char-count">{nickname.length}/10</span>
          </div>

          {/* Bio */}
          <div className="form-group">
            <label className="form-label">简介</label>
            <div className="bio-input-wrapper">
              <ContentEditableInput
                value={bio}
                onChange={setBio}
                placeholder="介绍一下自己"
                className="bio-editor"
              />
              <button className="emoji-btn" onClick={() => setShowEmojiPanel(!showEmojiPanel)}>
                😊
              </button>
            </div>
            <span className="char-count">{sanitizeContent(bio).length}/200</span>
          </div>

          {/* Gender */}
          <div className="form-group">
            <label className="form-label">性别</label>
            <DropdownSelect
              value={gender}
              options={GENDER_OPTIONS}
              placeholder="请选择性别"
              onChange={(data) => setGender(data.value as number)}
            />
          </div>

          {/* Zodiac */}
          <div className="form-group">
            <label className="form-label">星座</label>
            <DropdownSelect
              value={zodiac}
              options={ZODIAC_OPTIONS}
              placeholder="请选择星座"
              onChange={(data) => setZodiac(String(data.value))}
            />
          </div>

          {/* MBTI */}
          <div className="form-group">
            <label className="form-label">MBTI</label>
            <MbtiPicker value={mbti} dimensions={MBTI_DIMENSIONS} onChange={setMbti} />
          </div>

          {/* Education */}
          <div className="form-group">
            <label className="form-label">学历</label>
            <DropdownSelect
              value={education}
              options={EDUCATION_OPTIONS}
              placeholder="请选择学历"
              onChange={(data) => setEducation(String(data.value))}
            />
          </div>

          {/* Major */}
          <div className="form-group">
            <label className="form-label">专业</label>
            <input
              type="text"
              className="form-input"
              placeholder="请输入专业"
              maxLength={11}
              value={major}
              onChange={(e) => setMajor(e.target.value)}
            />
          </div>

          {/* Interests */}
          <div className="form-group">
            <label className="form-label">兴趣 (最多5个)</label>
            <div className="interests-input-row">
              <input
                type="text"
                className="form-input interest-input"
                placeholder="输入兴趣后回车"
                maxLength={8}
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddInterest() } }}
              />
              <button className="add-interest-btn" onClick={handleAddInterest}>添加</button>
            </div>
            <div className="interests-tags">
              {interests.map((item, idx) => (
                <span key={idx} className="interest-tag">
                  {item}
                  <button className="remove-tag-btn" onClick={() => removeInterest(idx)}>&times;</button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>取消</button>
          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </button>
        </div>

        {/* Emoji panel */}
        {showEmojiPanel && (
          <div className="emoji-panel-overlay" onClick={() => setShowEmojiPanel(false)}>
            <div className="emoji-panel" onClick={(e) => e.stopPropagation()}>
              <EmojiPicker onSelect={handleEmojiSelect} />
            </div>
          </div>
        )}

        {/* Crop modal */}
        <CropModal
          visible={showCropModal}
          imageSrc={cropImageSrc}
          uploading={uploading}
          onClose={() => { setShowCropModal(false); URL.revokeObjectURL(cropImageSrc) }}
          onConfirm={handleCropConfirm}
        />
      </div>

      <style>{`
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background-color: var(--overlay-bg);
          display: flex; justify-content: center; align-items: center;
          z-index: 1000; padding: 1rem;
        }
        .edit-profile-modal {
          background: var(--bg-color-primary); border-radius: 12px;
          width: 100%; max-width: 520px; max-height: 85vh;
          display: flex; flex-direction: column; overflow: hidden;
          box-shadow: 0 4px 20px var(--shadow-color);
          position: relative;
        }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 24px; border-bottom: 1px solid var(--border-color-primary);
          flex-shrink: 0; background: var(--bg-color-primary);
        }
        .modal-header h3 { margin: 0; font-size: 1.15rem; font-weight: 600; color: var(--text-color-primary); }
        .close-btn {
          background: none; border: none; cursor: pointer; padding: 4px;
          color: var(--text-color-secondary); border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.3s ease;
        }
        .close-btn:hover { color: var(--text-color-primary); background-color: var(--bg-color-secondary); }
        .modal-body {
          flex: 1; overflow-y: auto; padding: 24px;
          display: flex; flex-direction: column; gap: 20px;
        }
        .form-group { position: relative; }
        .form-label { display: block; font-size: 14px; font-weight: 500; color: var(--text-color-primary); margin-bottom: 8px; }
        .form-input {
          width: 100%; padding: 10px 12px; border: 1px solid var(--border-color-primary);
          border-radius: 8px; background: var(--bg-color-primary); color: var(--text-color-primary);
          font-size: 14px; box-sizing: border-box; transition: border-color 0.3s ease;
        }
        .form-input:focus { outline: none; border-color: var(--primary-color); }
        .form-input::placeholder { color: var(--text-color-quaternary); }
        .char-count { position: absolute; right: 8px; bottom: 4px; font-size: 12px; color: var(--text-color-quaternary); }
        .avatar-upload-area { display: flex; align-items: center; gap: 16px; }
        .avatar-preview { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; cursor: pointer; border: 1px solid var(--border-color-primary); }
        .avatar-preview:hover { opacity: 0.8; }
        .change-avatar-btn {
          padding: 8px 16px; background: transparent; color: var(--primary-color);
          border: 1px solid var(--primary-color); border-radius: 6px;
          cursor: pointer; font-size: 14px; transition: all 0.3s ease;
        }
        .change-avatar-btn:hover { background: var(--primary-color); color: white; }
        .bio-input-wrapper { position: relative; border: 1px solid var(--border-color-primary); border-radius: 8px; }
        .bio-input-wrapper:focus-within { border-color: var(--primary-color); }
        .bio-input-wrapper .emoji-btn {
          position: absolute; right: 8px; bottom: 8px;
          width: 32px; height: 32px; border: none; background: transparent;
          color: var(--text-color-secondary); border-radius: 50%; cursor: pointer;
          font-size: 18px; display: flex; align-items: center; justify-content: center;
        }
        .bio-input-wrapper .emoji-btn:hover { background: var(--bg-color-secondary); }
        .interests-input-row { display: flex; gap: 8px; }
        .interest-input { flex: 1; }
        .add-interest-btn {
          padding: 10px 16px; background: var(--primary-color); color: white;
          border: none; border-radius: 8px; cursor: pointer; font-size: 14px;
          white-space: nowrap;
        }
        .add-interest-btn:hover { background: var(--primary-color-dark); }
        .interests-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
        .interest-tag {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 10px; background: var(--bg-color-secondary);
          border-radius: 16px; font-size: 13px; color: var(--text-color-primary);
        }
        .remove-tag-btn {
          background: none; border: none; cursor: pointer; padding: 0;
          font-size: 16px; line-height: 1; color: var(--text-color-quaternary);
        }
        .remove-tag-btn:hover { color: var(--text-color-primary); }
        .modal-footer {
          display: flex; align-items: center; justify-content: flex-end;
          gap: 12px; padding: 16px 24px; border-top: 1px solid var(--border-color-primary);
          flex-shrink: 0; background: var(--bg-color-primary);
        }
        .cancel-btn, .save-btn {
          padding: 10px 24px; border-radius: 8px; font-size: 15px;
          font-weight: 500; cursor: pointer; transition: all 0.3s ease; border: none;
        }
        .cancel-btn {
          background: var(--bg-color-primary); color: var(--text-color-secondary);
          border: 1px solid var(--border-color-primary);
        }
        .cancel-btn:hover { background: var(--bg-color-secondary); color: var(--text-color-primary); }
        .save-btn { background: var(--primary-color); color: white; }
        .save-btn:hover { background-color: var(--primary-color-dark); }
        .save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .emoji-panel-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: transparent; z-index: 1001; }
        .emoji-panel {
          position: absolute; bottom: 60px; left: 50%; transform: translateX(-50%);
          background: var(--bg-color-primary); border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2); overflow: hidden;
          z-index: 1002; max-width: 350px;
        }
      `}</style>
    </div>
  )
}
