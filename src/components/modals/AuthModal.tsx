import React, { useEffect, useCallback, useState, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, AlertTriangle } from 'lucide-react'
import { useScrollLock } from '@/hooks/use-scroll-lock'
import { useAuthStore } from '@/stores/auth-store'
import { useUserStore } from '@/stores/user-store'
import { authApi } from '@/lib/api'
import { toast } from '@/utils/toastManager'
import ResetPasswordModal from './ResetPasswordModal'

export function AuthModal() {
  const { showAuthModal, initialMode, closeAuthModal } = useAuthStore()
  const userStore = useUserStore()
  const { lock, unlock } = useScrollLock()

  const [isAnimating, setIsAnimating] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isLoginMode, setIsLoginMode] = useState(initialMode === 'login')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)

  // Form fields
  const [userId, setUserId] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')

  // Errors
  const [errors, setErrors] = useState({
    user_id: '',
    nickname: '',
    password: '',
    confirmPassword: '',
    email: '',
    emailCode: '',
  })

  // Update isLoginMode when initialMode changes
  useEffect(() => {
    setIsLoginMode(initialMode === 'login')
  }, [initialMode])

  // Scroll lock and animation
  useEffect(() => {
    if (showAuthModal) {
      lock()
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true)
        })
      })
      // Fetch email config
      fetchEmailConfig()
    } else {
      setIsAnimating(false)
    }
  }, [showAuthModal, lock])

  const fetchEmailConfig = async () => {
    try {
      const response: any = await authApi.getEmailConfig()
      if (response.code === 200) {
        setEmailEnabled(response.data.emailEnabled)
      }
    } catch (error) {
      console.error('获取邮件配置失败:', error)
    }
  }

  const clearError = useCallback((field: string) => {
    setErrors((prev) => ({ ...prev, [field]: '' }))
    setErrorMessage('')
    setShowErrors(false)
  }, [])

  const resetForm = useCallback(() => {
    setUserId('')
    setNickname('')
    setPassword('')
    setConfirmPassword('')
    setEmail('')
    setEmailCode('')
    setErrors({
      user_id: '',
      nickname: '',
      password: '',
      confirmPassword: '',
      email: '',
      emailCode: '',
    })
    setErrorMessage('')
    setShowErrors(false)
  }, [])

  const toggleMode = useCallback(() => {
    setIsLoginMode(!isLoginMode)
    resetForm()
  }, [isLoginMode, resetForm])

  // Validation
  const validateUserId = useCallback(async () => {
    setErrors((prev) => ({ ...prev, user_id: '' }))

    if (!userId.trim()) {
      setErrors((prev) => ({ ...prev, user_id: '请输入知舟号' }))
      return
    }

    if (userId.length < 3 || userId.length > 15) {
      setErrors((prev) => ({ ...prev, user_id: '知舟号长度必须在3-15位之间' }))
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(userId)) {
      setErrors((prev) => ({ ...prev, user_id: '知舟号只能包含字母、数字和下划线' }))
      return
    }

    // Uniqueness is checked server-side during registration
    // No client-side check needed (backend /auth/register validates phone/email uniqueness)

    setErrors((prev) => ({ ...prev, user_id: '' }))
  }, [userId, isLoginMode])

  const validatePassword = useCallback(() => {
    if (!password.trim()) {
      setErrors((prev) => ({ ...prev, password: '请输入密码' }))
    } else if (!isLoginMode && password.length < 6) {
      setErrors((prev) => ({ ...prev, password: '密码至少需要6位' }))
    } else {
      setErrors((prev) => ({ ...prev, password: '' }))
    }
  }, [password, isLoginMode])

  const validateNickname = useCallback(() => {
    if (!isLoginMode && !nickname.trim()) {
      setErrors((prev) => ({ ...prev, nickname: '请输入昵称' }))
    } else {
      setErrors((prev) => ({ ...prev, nickname: '' }))
    }
  }, [nickname, isLoginMode])

  const validateConfirmPassword = useCallback(() => {
    if (!isLoginMode) {
      if (!confirmPassword.trim()) {
        setErrors((prev) => ({ ...prev, confirmPassword: '请确认密码' }))
      } else if (password !== confirmPassword) {
        setErrors((prev) => ({ ...prev, confirmPassword: '两次输入的密码不一致' }))
      } else {
        setErrors((prev) => ({ ...prev, confirmPassword: '' }))
      }
    }
  }, [confirmPassword, password, isLoginMode])

  const validateEmail = useCallback(() => {
    if (!emailEnabled || isLoginMode) return
    if (!email.trim()) {
      setErrors((prev) => ({ ...prev, email: '请输入邮箱地址' }))
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors((prev) => ({ ...prev, email: '请输入有效的邮箱地址' }))
    } else {
      setErrors((prev) => ({ ...prev, email: '' }))
    }
  }, [email, emailEnabled, isLoginMode])

  const validateEmailCode = useCallback(() => {
    if (!emailEnabled || isLoginMode) return
    if (!emailCode.trim()) {
      setErrors((prev) => ({ ...prev, emailCode: '请输入邮箱验证码' }))
    } else if (emailCode.length !== 6) {
      setErrors((prev) => ({ ...prev, emailCode: '邮箱验证码长度为6位' }))
    } else {
      setErrors((prev) => ({ ...prev, emailCode: '' }))
    }
  }, [emailCode, emailEnabled, isLoginMode])

  const sendEmailCode = useCallback(async () => {
    validateEmail()
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setShowErrors(true)
      return
    }

    try {
      const response = await userStore.sendEmailCode(email)
      if (response.success) {
        toast.success(response.message)
      } else {
        setErrorMessage(response.message || '发送验证码失败')
      }
    } catch (error) {
      console.error('发送验证码失败:', error)
      setErrorMessage('网络错误，请稍后重试')
    }
  }, [email, validateEmail, userStore])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setErrorMessage('')
      setShowErrors(true)

      if (isLoginMode) {
        // Login mode
        if (!userId.trim() && !password.trim()) return

        if (!userId.trim()) {
          setErrorMessage('请输入知舟号')
          return
        }
        if (!password.trim()) {
          setErrorMessage('请输入密码')
          return
        }

        setIsSubmitting(true)
        try {
          const result = await userStore.login({
            account: userId,
            password,
          })

          if (result.success) {
            toast.success('登录成功！')
            setTimeout(() => {
              handleClose()
              window.location.reload()
            }, 1000)
          } else {
            setErrorMessage(result.message || '登录失败')
          }
        } catch (error: any) {
          console.error('登录失败:', error)
          setErrorMessage('网络错误，请稍后重试')
        } finally {
          setIsSubmitting(false)
        }
      } else {
        // Register mode: validate all fields
        await validateUserId()
        validatePassword()
        validateNickname()
        validateConfirmPassword()
        if (emailEnabled) {
          validateEmail()
          validateEmailCode()
        }

        // Check if any errors
        const hasErrors =
          !userId.trim() ||
          (userId.length < 3) ||
          !/^[a-zA-Z0-9_]+$/.test(userId) ||
          !nickname.trim() ||
          !password.trim() ||
          (password.length < 6) ||
          !confirmPassword.trim() ||
          password !== confirmPassword ||
          (emailEnabled && (!email.trim() || !emailCode.trim()))

        if (hasErrors) return

        setIsSubmitting(true)
        try {
          const registerData: any = {
            account: userId,
            nickname,
            password,
          }

          if (emailEnabled) {
            registerData.email = email
            registerData.emailCode = emailCode
          }

          const result = await userStore.register(registerData)

          if (result.success) {
            toast.success('注册成功！')
            setTimeout(() => {
              handleClose()
              window.location.reload()
            }, 1000)
          } else {
            const msg = result.message || '注册失败'
            if (msg.includes('邮箱验证码')) {
              setErrors((prev) => ({ ...prev, emailCode: msg }))
              setShowErrors(true)
            } else if (msg.includes('用户ID已存在')) {
              setErrors((prev) => ({ ...prev, user_id: msg }))
            } else {
              setErrorMessage(msg)
            }
          }
        } catch (error: any) {
          console.error('注册失败:', error)
          setErrorMessage('网络错误，请稍后重试')
        } finally {
          setIsSubmitting(false)
        }
      }
    },
    [
      isLoginMode,
      userId,
      password,
      nickname,
      confirmPassword,
      email,
      emailCode,
      emailEnabled,
      userStore,
      validateUserId,
      validatePassword,
      validateNickname,
      validateConfirmPassword,
      validateEmail,
      validateEmailCode,
    ]
  )

  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      setIsAnimating(false)
      unlock()
      closeAuthModal()
    }, 200) // match CSS transition duration
  }, [unlock, closeAuthModal])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) handleClose()
    },
    [handleClose]
  )

  const openResetPassword = useCallback(() => {
    setIsAnimating(false)
    setTimeout(() => {
      unlock()
      setShowResetPassword(true)
    }, 200)
    handleClose()
  }, [unlock, handleClose])

  const handleBackToLogin = useCallback(() => {
    setShowResetPassword(false)
    closeAuthModal()
    // Re-open auth modal after a brief delay
    setTimeout(() => {
      useAuthStore.getState().openLoginModal()
    }, 300)
  }, [closeAuthModal])

  return (
    <>
      <Dialog.Root open={showAuthModal} onOpenChange={handleOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay
            className={`auth-modal-overlay ${isAnimating ? 'animating' : ''} ${isClosing ? 'closing' : ''}`}
          />
          <Dialog.Content
            className={`auth-modal ${isAnimating ? 'scale-in' : ''} ${isClosing ? 'closing' : ''}`}
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            <Dialog.Title className="sr-only">
              {isLoginMode ? '登录知舟' : '注册知舟'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="close-btn">
                <X size={16} />
              </button>
            </Dialog.Close>

            <div className="auth-content">
              <div className="auth-header">
                <h2 className="auth-title">
                  {isLoginMode ? '登录知舟' : '注册知舟'}
                </h2>
                <p className="auth-subtitle">
                  {isLoginMode ? '欢迎回来！' : '加入我们，开始分享美好生活'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="auth-form" noValidate autoComplete="off">
                {/* User ID */}
                <div className="form-group">
                  <label className="form-label">知舟号</label>
                  <input
                    type="text"
                    className={`form-input ${showErrors && errors.user_id ? 'error' : ''}`}
                    placeholder={
                      isLoginMode
                        ? '请输入知舟号'
                        : '请输入知舟号（3-15位字母数字下划线）'
                    }
                    maxLength={15}
                    autoComplete="off"
                    value={userId}
                    onChange={(e) => {
                      setUserId(e.target.value)
                      clearError('user_id')
                    }}
                  />
                  {showErrors && errors.user_id && (
                    <span className="error-message">{errors.user_id}</span>
                  )}
                </div>

                {/* Nickname (register only) */}
                {!isLoginMode && (
                  <div className="form-group">
                    <label className="form-label">昵称</label>
                    <input
                      type="text"
                      className={`form-input ${showErrors && errors.nickname ? 'error' : ''}`}
                      placeholder="请输入昵称（少于10位）"
                      maxLength={10}
                      autoComplete="off"
                      value={nickname}
                      onChange={(e) => {
                        setNickname(e.target.value)
                        clearError('nickname')
                      }}
                    />
                    {showErrors && errors.nickname && (
                      <span className="error-message">{errors.nickname}</span>
                    )}
                  </div>
                )}

                {/* Password */}
                <div className="form-group">
                  <label className="form-label">密码</label>
                  <input
                    type="password"
                    className={`form-input ${showErrors && errors.password ? 'error' : ''}`}
                    placeholder={isLoginMode ? '请输入密码' : '请设置密码（6-20位）'}
                    maxLength={20}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      clearError('password')
                    }}
                  />
                  {showErrors && errors.password && (
                    <span className="error-message">{errors.password}</span>
                  )}
                </div>

                {/* Confirm Password (register only) */}
                {!isLoginMode && (
                  <div className="form-group">
                    <label className="form-label">确认密码</label>
                    <input
                      type="password"
                      className={`form-input ${showErrors && errors.confirmPassword ? 'error' : ''}`}
                      placeholder="请再次输入密码"
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
                )}

                {/* Email (register only, when enabled) */}
                {!isLoginMode && emailEnabled && (
                  <>
                    <div className="form-group">
                      <label className="form-label">邮箱</label>
                      <input
                        type="email"
                        className={`form-input ${showErrors && errors.email ? 'error' : ''}`}
                        placeholder="请输入邮箱地址"
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
                          autoComplete="one-time-code"
                          value={emailCode}
                          onChange={(e) => {
                            setEmailCode(e.target.value)
                            clearError('emailCode')
                          }}
                        />
                        <button
                          type="button"
                          className="email-code-btn"
                          disabled={
                            userStore.isSendingEmailCode ||
                            userStore.emailCodeCountdown > 0 ||
                            !email ||
                            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                          }
                          onClick={sendEmailCode}
                        >
                          {userStore.emailCodeCountdown > 0
                            ? `${userStore.emailCodeCountdown}秒后重发`
                            : userStore.isSendingEmailCode
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

                {/* Error message */}
                {errorMessage && (
                  <div className="error-tip">
                    <AlertTriangle size={16} />
                    {errorMessage}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <span className="loading-spinner" />}
                  {isSubmitting
                    ? '加载中...'
                    : isLoginMode
                      ? '登录'
                      : '注册'}
                </button>
              </form>

              {/* Switch login/register */}
              <div className="auth-switch">
                <span className="switch-text">
                  {isLoginMode ? '还没有账号？' : '已有账号？'}
                </span>
                <button type="button" className="switch-btn" onClick={toggleMode}>
                  {isLoginMode ? '立即注册' : '立即登录'}
                </button>
              </div>

              {/* Forgot password (login only, when email enabled) */}
              {isLoginMode && emailEnabled && (
                <div className="forgot-password">
                  <button
                    type="button"
                    className="forgot-btn"
                    onClick={openResetPassword}
                  >
                    忘记密码？
                  </button>
                </div>
              )}
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
          .auth-modal-overlay.closing {
            opacity: 0;
          }
          .auth-modal {
            background: var(--bg-color-primary);
            border-radius: 16px;
            width: 90%;
            max-width: 400px;
            max-height: 90vh;
            overflow-y: auto;
            position: fixed;
            top: 50%;
            left: 50%;
            z-index: 2001;
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0;
            transition: transform 0.3s ease, opacity 0.3s ease;
            box-shadow: 0 20px 40px var(--shadow-color);
          }
          .auth-modal.scale-in {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          .auth-modal.closing {
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0;
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
          .auth-switch {
            text-align: center;
            padding-top: 24px;
          }
          .switch-text {
            font-size: 14px;
            color: var(--text-color-secondary);
            margin-right: 8px;
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
          .forgot-password {
            text-align: center;
            margin-top: 8px;
          }
          .forgot-btn {
            background: none;
            border: none;
            color: var(--text-color-secondary);
            font-size: 13px;
            cursor: pointer;
            transition: color 0.3s ease;
          }
          .forgot-btn:hover {
            color: var(--primary-color);
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
            .auth-content {
              padding: 24px;
            }
            .auth-title {
              font-size: 20px;
            }
          }
        `}</style>
      </Dialog.Root>

      <ResetPasswordModal
        visible={showResetPassword}
        onClose={() => setShowResetPassword(false)}
        onBackToLogin={handleBackToLogin}
      />
    </>
  )
}

export default AuthModal
