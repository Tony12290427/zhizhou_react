import React, { useEffect, useCallback, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useChangePasswordStore } from '@/stores/change-password-store'
import { useScrollLock } from '@/hooks/use-scroll-lock'
import { toast } from '@/utils/toastManager'

export function ChangePasswordModal() {
  const { visible, close, changePassword } = useChangePasswordStore()
  const { lock, unlock } = useScrollLock()
  const [isAnimating, setIsAnimating] = useState(false)
  const [loading, setLoading] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (visible) {
      lock()
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true)
        })
      })
    } else {
      setIsAnimating(false)
    }
  }, [visible, lock])

  const handleClose = useCallback(() => {
    if (loading) return
    setIsAnimating(false)
    setTimeout(() => {
      unlock()
      close()
    }, 200)
  }, [loading, unlock, close])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) handleClose()
    },
    [handleClose]
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!currentPassword) {
        toast.error('请输入当前密码')
        return
      }
      if (!newPassword) {
        toast.error('请输入新密码')
        return
      }
      if (newPassword.length < 6) {
        toast.error('新密码至少需要6位')
        return
      }
      if (newPassword !== confirmPassword) {
        toast.error('两次输入的新密码不一致')
        return
      }

      setLoading(true)

      try {
        const result = await changePassword(currentPassword, newPassword)

        if (result.success) {
          toast.success('密码修改成功')
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
          setLoading(false)
          handleClose()
        } else {
          const errorMessage = result.message || ''
          if (
            errorMessage.includes('当前密码') ||
            errorMessage.includes('密码错误') ||
            errorMessage.includes('密码不正确')
          ) {
            toast.error('当前密码输入错误，请检查后重新输入')
            setCurrentPassword('')
          } else if (
            errorMessage.includes('新密码不能与') ||
            errorMessage.includes('相同')
          ) {
            toast.error('新密码不能与当前密码相同')
          } else {
            toast.error(errorMessage || '密码修改失败，请重试')
          }
        }
      } catch (error: any) {
        console.error('密码修改失败:', error)
        toast.error('网络错误，请重试')
      } finally {
        setLoading(false)
      }
    },
    [currentPassword, newPassword, confirmPassword, changePassword, handleClose]
  )

  return (
    <Dialog.Root open={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={`auth-modal-overlay ${isAnimating ? 'animating' : ''}`}
        />
        <Dialog.Content
          className={`auth-modal ${isAnimating ? 'scale-in' : ''}`}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <Dialog.Close asChild>
            <button className="close-btn">
              <X size={16} />
            </button>
          </Dialog.Close>

          <div className="auth-content">
            <div className="auth-header">
              <h2 className="auth-title">修改密码</h2>
              <p className="auth-subtitle">为了您的账户安全，请谨慎设置新密码</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label">当前密码</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="请输入当前密码"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">新密码</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="请输入新密码（至少6位）"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">确认新密码</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="请再次输入新密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading && <span className="loading-spinner" />}
                  {loading ? '修改中...' : '修改密码'}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      <style>{`
        .auth-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--overlay-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          opacity: 0;
          transition: opacity 0.3s ease;
          width: 100vw;
          height: 100%;
        }
        .auth-modal-overlay.animating {
          opacity: 1;
        }
        .auth-modal {
          background: var(--bg-color-primary);
          border-radius: 16px;
          width: 90%;
          max-width: 400px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          transform: scale(0.9);
          transition: transform 0.3s ease;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        .auth-modal.scale-in {
          transform: scale(1);
        }
        .close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 32px;
          height: 32px;
          border: none;
          background: var(--bg-color-secondary);
          color: var(--text-color-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 1;
          transition: all 0.3s ease;
        }
        .close-btn:hover {
          opacity: 0.8;
          transform: scale(1.1);
        }
        .auth-content {
          padding: 32px;
        }
        .auth-header {
          text-align: center;
          margin-bottom: 32px;
        }
        .auth-title {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-color-primary);
          margin: 0 0 8px 0;
        }
        .auth-subtitle {
          font-size: 14px;
          color: var(--text-color-secondary);
          margin: 0;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .form-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-color-primary);
        }
        .form-input {
          padding: 12px 16px;
          border: 1px solid transparent;
          border-radius: 8px;
          font-size: 16px;
          background: var(--bg-color-secondary);
          color: var(--text-color-primary);
          caret-color: var(--primary-color);
          transition: border-color 0.3s ease;
        }
        .form-input:focus {
          outline: none;
          border-color: var(--primary-color);
        }
        .form-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .form-input::placeholder {
          color: var(--text-color-tertiary);
        }
        .form-actions {
          display: flex;
          justify-content: center;
          margin-top: 8px;
        }
        .submit-btn {
          width: 100%;
          max-width: 200px;
          padding: 14px 24px;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 999px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 48px;
        }
        .submit-btn:hover {
          background: var(--primary-color-dark);
        }
        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 480px) {
          .auth-content {
            padding: 24px;
          }
          .auth-title {
            font-size: 20px;
          }
        }
      `}</style>
    </Dialog.Root>
  )
}

export default ChangePasswordModal
