import React, { useEffect, useCallback, useState, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, AlertTriangle } from 'lucide-react'
import { useScrollLock } from '@/hooks/use-scroll-lock'
import { authApi } from '@/lib/api'
import { toast } from '@/utils/toastManager'

interface ResetPasswordModalProps {
  visible: boolean
  onClose: () => void
  onBackToLogin?: () => void
}

export function ResetPasswordModal({
  visible,
  onClose,
  onBackToLogin,
}: ResetPasswordModalProps) {
  const { lock, unlock } = useScrollLock()
  const [isAnimating, setIsAnimating] = useState(false)
  const [step, setStep] = useState(1) // 1: input email, 2: set new password
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [foundUserId, setFoundUserId] = useState('')

  // Countdown
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [codeCountdown, setCodeCountdown] = useState(0)
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showErrors, setShowErrors] = useState(false)

  const [errors, setErrors] = useState({
    email: '',
    emailCode: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Scroll lock and animation
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
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
      }
    }
  }, [visible, lock])

  const clearError = useCallback((field: string) => {
    setErrors((prev) => ({ ...prev, [field]: '' }))
    setErrorMessage('')
    setShowErrors(false)
  }, [])

  const isEmailValid =
    email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const validateEmail = useCallback(() => {
    if (!email.trim()) {
      setErrors((prev) => ({ ...prev, email: '请输入邮箱地址' }))
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors((prev) => ({ ...prev, email: '请输入有效的邮箱地址' }))
    } else {
      setErrors((prev) => ({ ...prev, email: '' }))
    }
  }, [email])

  const validateEmailCode = useCallback(() => {
    if (!emailCode.trim()) {
      setErrors((prev) => ({ ...prev, emailCode: '请输入邮箱验证码' }))
    } else if (emailCode.length !== 6) {
      setErrors((prev) => ({ ...prev, emailCode: '邮箱验证码长度为6位' }))
    } else {
      setErrors((prev) => ({ ...prev, emailCode: '' }))
    }
  }, [emailCode])

  const validateNewPassword = useCallback(() => {
    if (!newPassword.trim()) {
      setErrors((prev) => ({ ...prev, newPassword: '请输入新密码' }))
    } else if (newPassword.length < 6) {
      setErrors((prev) => ({ ...prev, newPassword: '密码至少需要6位' }))
    } else {
      setErrors((prev) => ({ ...prev, newPassword: '' }))
    }
  }, [newPassword])

  const validateConfirmPassword = useCallback(() => {
    if (!confirmPassword.trim()) {
      setErrors((prev) => ({ ...prev, confirmPassword: '请确认密码' }))
    } else if (newPassword !== confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: '两次输入的密码不一致' }))
    } else {
      setErrors((prev) => ({ ...prev, confirmPassword: '' }))
    }
  }, [confirmPassword, newPassword])

  const startCountdown = useCallback(() => {
    setCodeCountdown(60)
    countdownTimerRef.current = setInterval(() => {
      setCodeCountdown((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current)
            countdownTimerRef.current = null
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  const sendResetCode = useCallback(async () => {
    validateEmail()
    if (!email.trim() || !isEmailValid) {
      setShowErrors(true)
      return
    }

    setIsSendingCode(true)
    setErrorMessage('')

    try {
      const response: any = await authApi.sendResetCode({ email })
      if (response.success) {
        toast.success('验证码发送成功')
        if (response.data?.user_id) {
          setFoundUserId(response.data.user_id)
        }
        startCountdown()
      } else {
        setErrorMessage(response.message || '发送验证码失败')
      }
    } catch (error) {
      console.error('发送验证码失败:', error)
      setErrorMessage('网络错误，请稍后重试')
    } finally {
      setIsSendingCode(false)
    }
  }, [email, isEmailValid, validateEmail, startCountdown])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setErrorMessage('')
      setShowErrors(true)

      if (step === 1) {
        validateEmail()
        validateEmailCode()

        const errs = { ...errors }
        validateEmail()
        validateEmailCode()

        if (
          !email.trim() ||
          !isEmailValid ||
          !emailCode.trim() ||
          emailCode.length !== 6
        ) {
          return
        }

        setIsSubmitting(true)
        try {
          const response: any = await authApi.verifyResetCode({
            email,
            emailCode,
          })

          if (response.success) {
            setStep(2)
            setShowErrors(false)
          } else {
            setErrorMessage(response.message || '验证码验证失败')
          }
        } catch (error) {
          console.error('验证验证码失败:', error)
          setErrorMessage('网络错误，请稍后重试')
        } finally {
          setIsSubmitting(false)
        }
      } else {
        validateNewPassword()
        validateConfirmPassword()

        if (
          !newPassword.trim() ||
          newPassword.length < 6 ||
          !confirmPassword.trim() ||
          newPassword !== confirmPassword
        ) {
          return
        }

        setIsSubmitting(true)
        try {
          const response: any = await authApi.resetPassword({
            email,
            emailCode,
            newPassword,
          })

          if (response.success) {
            toast.success('密码重置成功！')
            setTimeout(() => {
              onBackToLogin?.()
            }, 1500)
          } else {
            setErrorMessage(response.message || '重置密码失败')
            if (response.message?.includes('验证码')) {
              setStep(1)
              setEmailCode('')
            }
          }
        } catch (error) {
          console.error('重置密码失败:', error)
          setErrorMessage('网络错误，请稍后重试')
        } finally {
          setIsSubmitting(false)
        }
      }
    },
    [
      step,
      email,
      emailCode,
      isEmailValid,
      newPassword,
      confirmPassword,
      validateEmail,
      validateEmailCode,
      validateNewPassword,
      validateConfirmPassword,
      onBackToLogin,
    ]
  )

  const handleClose = useCallback(() => {
    if (isSubmitting) return
    setIsAnimating(false)
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
    }
    setTimeout(() => {
      unlock()
      onClose()
    }, 200)
  }, [isSubmitting, unlock, onClose])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) handleClose()
    },
    [handleClose]
  )

  const handleBackToLogin = useCallback(() => {
    setIsAnimating(false)
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
    }
    setTimeout(() => {
      unlock()
      onBackToLogin?.()
    }, 200)
  }, [unlock, onBackToLogin])

  return (
    <Dialog.Root open={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={`reset-modal-overlay ${isAnimating ? 'animating' : ''}`}
        />
        <Dialog.Content
          className={`reset-modal ${isAnimating ? 'scale-in' : ''}`}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <Dialog.Close asChild>
            <button className="close-btn">
              <X size={16} />
            </button>
          </Dialog.Close>

          <div className="reset-content">
            <div className="reset-header">
              <h2 className="reset-title">找回密码</h2>
              <p className="reset-subtitle">通过绑定的邮箱重置密码</p>
            </div>

            <form onSubmit={handleSubmit} className="reset-form" noValidate autoComplete="off">
              {step === 1 && (
                <>
                  <div className="form-group">
                    <label className="form-label">邮箱地址</label>
                    <input
                      type="email"
                      className={`form-input ${showErrors && errors.email ? 'error' : ''}`}
                      placeholder="请输入绑定的邮箱地址"
                      maxLength={100}
                      autoComplete="off"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        clearError('email')
                      }}
                    />
                    {showErrors && errors.email && (
                      <span className="error-message">{errors.email}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">邮箱验证码</label>
                    <div className="form-input-with-button">
                      <input
                        type="text"
                        className={`form-input ${showErrors && errors.emailCode ? 'error' : ''}`}
                        placeholder="请输入邮箱验证码"
                        maxLength={6}
                        autoComplete="off"
                        value={emailCode}
                        onChange={(e) => {
                          setEmailCode(e.target.value)
                          clearError('emailCode')
                        }}
                      />
                      <button
                        type="button"
                        className="email-code-btn"
                        disabled={isSendingCode || codeCountdown > 0 || !isEmailValid}
                        onClick={sendResetCode}
                      >
                        {codeCountdown > 0
                          ? `${codeCountdown}秒后重发`
                          : isSendingCode
                            ? '发送中...'
                            : '获取验证码'}
                      </button>
                    </div>
                    {showErrors && errors.emailCode && (
                      <span className="error-message">{errors.emailCode}</span>
                    )}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="account-info">
                    <span className="account-label">重置账号：</span>
                    <span className="account-value">{foundUserId}</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">新密码</label>
                    <input
                      type="password"
                      className={`form-input ${showErrors && errors.newPassword ? 'error' : ''}`}
                      placeholder="请设置新密码（6-20位）"
                      maxLength={20}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value)
                        clearError('newPassword')
                      }}
                    />
                    {showErrors && errors.newPassword && (
                      <span className="error-message">{errors.newPassword}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">确认密码</label>
                    <input
                      type="password"
                      className={`form-input ${showErrors && errors.confirmPassword ? 'error' : ''}`}
                      placeholder="请再次输入新密码"
                      maxLength={20}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        clearError('confirmPassword')
                      }}
                    />
                    {showErrors && errors.confirmPassword && (
                      <span className="error-message">{errors.confirmPassword}</span>
                    )}
                  </div>
                </>
              )}

              {errorMessage && (
                <div className="error-tip">
                  <AlertTriangle size={16} />
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                className="submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting && <span className="loading-spinner" />}
                {isSubmitting ? '处理中...' : step === 1 ? '下一步' : '重置密码'}
              </button>
            </form>

            <div className="reset-switch">
              <button type="button" className="switch-btn" onClick={handleBackToLogin}>
                返回登录
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      <style>{`
        .reset-modal-overlay {
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
        .reset-modal-overlay.animating {
          opacity: 1;
        }
        .reset-modal {
          background: var(--bg-color-primary);
          border-radius: 16px;
          width: 90%;
          max-width: 400px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          transform: scale(0.9);
          transition: transform 0.3s ease;
          box-shadow: 0 20px 40px var(--shadow-color);
        }
        .reset-modal.scale-in {
          transform: scale(1);
        }
        .close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 30px;
          height: 30px;
          background: var(--bg-color-secondary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
          border: none;
          cursor: pointer;
          padding: 5px;
          color: var(--text-color-primary);
          transition: all 0.3s ease;
        }
        .close-btn:hover {
          color: var(--text-color-secondary);
          transform: scale(1.1);
        }
        .reset-content {
          padding: 32px;
        }
        .reset-header {
          text-align: center;
          margin-bottom: 32px;
        }
        .reset-title {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-color-primary);
          margin: 0 0 8px 0;
        }
        .reset-subtitle {
          font-size: 14px;
          color: var(--text-color-secondary);
          margin: 0;
        }
        .reset-form {
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
        .form-input.error {
          border-color: var(--primary-color);
        }
        .error-message {
          font-size: 12px;
          color: var(--primary-color);
          margin-top: -4px;
        }
        .error-tip {
          display: flex;
          flex-direction: row;
          align-items: center;
          color: var(--primary-color);
          font-size: 14px;
          text-align: center;
          justify-content: center;
          gap: 8px;
        }
        .account-info {
          padding: 12px 16px;
          background: var(--bg-color-secondary);
          border-radius: 8px;
          font-size: 14px;
        }
        .account-label {
          color: var(--text-color-secondary);
        }
        .account-value {
          color: var(--text-color-primary);
          font-weight: 600;
          font-size: 16px;
        }
        .submit-btn {
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
          background-color: var(--primary-color-dark);
        }
        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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
        .reset-switch {
          text-align: center;
          padding-top: 24px;
        }
        .switch-btn {
          background: none;
          border: none;
          color: var(--primary-color);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
          transition: color 0.3s ease;
        }
        .switch-btn:hover {
          opacity: 0.8;
        }
        .form-input-with-button {
          display: flex;
          gap: 8px;
        }
        .form-input-with-button .form-input {
          flex: 1;
        }
        .email-code-btn {
          padding: 12px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          background: var(--primary-color);
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }
        .email-code-btn:hover:not(:disabled) {
          background-color: var(--primary-color-dark);
        }
        .email-code-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        @media (max-width: 480px) {
          .reset-content {
            padding: 24px;
          }
          .reset-title {
            font-size: 20px;
          }
        }
      `}</style>
    </Dialog.Root>
  )
}

export default ResetPasswordModal
