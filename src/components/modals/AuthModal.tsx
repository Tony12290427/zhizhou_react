import React, { useEffect, useCallback, useState, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { X, AlertTriangle, Phone, Mail } from 'lucide-react'
import { useScrollLock } from '@/hooks/use-scroll-lock'
import { useAuthStore } from '@/stores/auth-store'
import { useUserStore } from '@/stores/user-store'
import { toast } from '@/utils/toastManager'
import ResetPasswordModal from './ResetPasswordModal'

type TabValue = 'login' | 'quick-login' | 'register'

function useCountdown() {
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startCountdown = useCallback((seconds = 60) => {
    setCountdown(seconds)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return { countdown, startCountdown }
}

export function AuthModal() {
  const { showAuthModal, initialMode, closeAuthModal } = useAuthStore()
  const userStore = useUserStore()
  const { lock, unlock } = useScrollLock()

  const [isAnimating, setIsAnimating] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [emailEnabled] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)

  // Tab state
  const getInitialTab = useCallback(
    (mode: typeof initialMode): TabValue => {
      if (mode === 'register') return 'register'
      if (mode === 'quick-login') return 'quick-login'
      return 'login'
    },
    []
  )
  const [activeTab, setActiveTab] = useState<TabValue>(() => getInitialTab(initialMode))

  // --- Login tab ---
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // --- Register tab ---
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')

  // --- Quick login tab ---
  const [quickPhone, setQuickPhone] = useState('')
  const [quickPhoneCode, setQuickPhoneCode] = useState('')
  const [quickEmail, setQuickEmail] = useState('')
  const [quickEmailCode, setQuickEmailCode] = useState('')
  const [phoneExpanded, setPhoneExpanded] = useState(false)
  const [emailExpanded, setEmailExpanded] = useState(false)
  const phoneCountdown = useCountdown()
  const emailCountdown = useCountdown()

  // Channel-bind state (when channel login returns CHANNEL_NOT_BOUND)
  const [channelBindInfo, setChannelBindInfo] = useState<{
    type: 'PHONE' | 'EMAIL'
    target: string
    code: string
  } | null>(null)
  const [bindUsername, setBindUsername] = useState('')
  const [bindPassword, setBindPassword] = useState('')

  // Update activeTab when initialMode changes
  useEffect(() => {
    setActiveTab(getInitialTab(initialMode))
    setChannelBindInfo(null)
    setBindUsername('')
    setBindPassword('')
  }, [initialMode, getInitialTab])

  // Scroll lock and animation
  useEffect(() => {
    if (showAuthModal) {
      lock()
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true)
        })
      })
    } else {
      setIsAnimating(false)
    }
  }, [showAuthModal, lock])

  const resetForm = useCallback(() => {
    setLoginUsername('')
    setLoginPassword('')
    setRegUsername('')
    setRegPassword('')
    setRegConfirmPassword('')
    setQuickPhone('')
    setQuickPhoneCode('')
    setQuickEmail('')
    setQuickEmailCode('')
    setPhoneExpanded(false)
    setEmailExpanded(false)
    setChannelBindInfo(null)
    setBindUsername('')
    setBindPassword('')
    setErrorMessage('')
  }, [])

  const switchToTab = useCallback(
    (tab: TabValue) => {
      setActiveTab(tab)
      resetForm()
    },
    [resetForm]
  )

  // --- Login submit ---
  const handleLoginSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setErrorMessage('')

      if (!loginUsername.trim()) {
        setErrorMessage('请输入用户名')
        return
      }
      if (!loginPassword.trim()) {
        setErrorMessage('请输入密码')
        return
      }

      setIsSubmitting(true)
      try {
        const result = await userStore.login({
          username: loginUsername,
          password: loginPassword,
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
    },
    [loginUsername, loginPassword, userStore]
  )

  // --- Register submit ---
  const handleRegisterSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setErrorMessage('')

      if (!regUsername.trim()) {
        setErrorMessage('请输入用户名')
        return
      }
      if (!regPassword.trim()) {
        setErrorMessage('请输入密码')
        return
      }
      if (regPassword.length < 6) {
        setErrorMessage('密码至少需要6位')
        return
      }
      if (!regConfirmPassword.trim()) {
        setErrorMessage('请确认密码')
        return
      }
      if (regPassword !== regConfirmPassword) {
        setErrorMessage('两次输入的密码不一致')
        return
      }

      setIsSubmitting(true)
      try {
        const result = await userStore.register({
          username: regUsername,
          password: regPassword,
          confirmPassword: regConfirmPassword,
        })

        if (result.success) {
          toast.success('注册成功！')
          setTimeout(() => {
            handleClose()
            window.location.reload()
          }, 1000)
        } else {
          setErrorMessage(result.message || '注册失败')
        }
      } catch (error: any) {
        console.error('注册失败:', error)
        setErrorMessage('网络错误，请稍后重试')
      } finally {
        setIsSubmitting(false)
      }
    },
    [regUsername, regPassword, regConfirmPassword, userStore]
  )

  // --- Send code (phone) ---
  const sendPhoneCode = useCallback(async () => {
    if (!quickPhone.trim()) {
      setErrorMessage('请输入手机号码')
      return
    }
    try {
      const result = await userStore.sendCode(quickPhone)
      if (result.success) {
        toast.success('验证码已发送')
        phoneCountdown.startCountdown(60)
      } else {
        setErrorMessage(result.message || '发送验证码失败')
      }
    } catch {
      setErrorMessage('网络错误，请稍后重试')
    }
  }, [quickPhone, userStore, phoneCountdown])

  // --- Send code (email) ---
  const sendEmailCode = useCallback(async () => {
    if (!quickEmail.trim()) {
      setErrorMessage('请输入邮箱地址')
      return
    }
    try {
      const result = await userStore.sendCode(quickEmail)
      if (result.success) {
        toast.success('验证码已发送')
        emailCountdown.startCountdown(60)
      } else {
        setErrorMessage(result.message || '发送验证码失败')
      }
    } catch {
      setErrorMessage('网络错误，请稍后重试')
    }
  }, [quickEmail, userStore, emailCountdown])

  // --- Channel login ---
  const doChannelLogin = useCallback(
    async (type: 'PHONE' | 'EMAIL', target: string, code: string, username?: string, password?: string) => {
      setErrorMessage('')
      setIsSubmitting(true)
      try {
        const result = await userStore.channelLogin({ type, target, code, username, password })
        if (result.success) {
          toast.success('登录成功！')
          setTimeout(() => {
            handleClose()
            window.location.reload()
          }, 1000)
        } else {
          const msg = result.message || ''
          if (msg.includes('CHANNEL_NOT_BOUND') || msg.includes('未绑定') || msg.includes('绑定')) {
            setChannelBindInfo({ type, target, code })
            setErrorMessage('该方式尚未绑定账号，请设置用户名和密码完成绑定')
          } else {
            setErrorMessage(msg || '登录失败')
          }
        }
      } catch (error: any) {
        console.error('Channel login failed:', error)
        setErrorMessage(error?.message || '登录失败，请稍后重试')
      } finally {
        setIsSubmitting(false)
      }
    },
    [userStore]
  )

  // --- Channel bind submit (when CHANNEL_NOT_BOUND) ---
  const handleChannelBindSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!channelBindInfo) return
      if (!bindUsername.trim()) {
        setErrorMessage('请设置用户名')
        return
      }
      if (!bindPassword.trim() || bindPassword.length < 6) {
        setErrorMessage('请设置密码（至少6位）')
        return
      }

      setIsSubmitting(true)
      try {
        const result = await userStore.channelLogin({
          type: channelBindInfo.type,
          target: channelBindInfo.target,
          code: channelBindInfo.code,
          username: bindUsername,
          password: bindPassword,
        })
        if (result.success) {
          toast.success('绑定并登录成功！')
          setTimeout(() => {
            handleClose()
            window.location.reload()
          }, 1000)
        } else {
          setErrorMessage(result.message || '绑定失败')
        }
      } catch (error: any) {
        setErrorMessage(error?.message || '绑定失败')
      } finally {
        setIsSubmitting(false)
      }
    },
    [channelBindInfo, bindUsername, bindPassword, userStore]
  )

  // --- Phone code login ---
  const handlePhoneCodeLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!quickPhone.trim()) { setErrorMessage('请输入手机号码'); return }
      if (!quickPhoneCode.trim()) { setErrorMessage('请输入验证码'); return }
      await doChannelLogin('PHONE', quickPhone, quickPhoneCode)
    },
    [quickPhone, quickPhoneCode, doChannelLogin]
  )

  // --- Email code login ---
  const handleEmailCodeLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!quickEmail.trim()) { setErrorMessage('请输入邮箱地址'); return }
      if (!quickEmailCode.trim()) { setErrorMessage('请输入验证码'); return }
      await doChannelLogin('EMAIL', quickEmail, quickEmailCode)
    },
    [quickEmail, quickEmailCode, doChannelLogin]
  )

  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      setIsAnimating(false)
      unlock()
      closeAuthModal()
    }, 200)
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
              {activeTab === 'register' ? '注册知舟' : '登录知舟'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="close-btn">
                <X size={16} />
              </button>
            </Dialog.Close>

            <div className="auth-content">
              <div className="auth-header">
                <h2 className="auth-title">
                  {activeTab === 'register' ? '注册知舟' : '登录知舟'}
                </h2>
                <p className="auth-subtitle">
                  {activeTab === 'register'
                    ? '加入我们，开始分享美好生活'
                    : '欢迎回来！'}
                </p>
              </div>

              <Tabs.Root
                value={activeTab}
                onValueChange={(v) => switchToTab(v as TabValue)}
                className="auth-tabs-root"
              >
                <Tabs.List className="auth-tabs-list" aria-label="登录方式">
                  <Tabs.Trigger className="auth-tab-trigger" value="login">
                    账号登录
                  </Tabs.Trigger>
                  <Tabs.Trigger className="auth-tab-trigger" value="quick-login">
                    快捷登录
                  </Tabs.Trigger>
                  <Tabs.Trigger className="auth-tab-trigger" value="register">
                    注册
                  </Tabs.Trigger>
                </Tabs.List>

                {/* ========== Tab 1: 账号密码登录 ========== */}
                <Tabs.Content className="auth-tab-content" value="login">
                  <form onSubmit={handleLoginSubmit} className="auth-form" noValidate autoComplete="off">
                    {/* Username */}
                    <div className="form-group">
                      <label className="form-label">用户名</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="请输入用户名"
                        maxLength={15}
                        autoComplete="off"
                        value={loginUsername}
                        onChange={(e) => {
                          setLoginUsername(e.target.value)
                          setErrorMessage('')
                        }}
                      />
                    </div>

                    {/* Password */}
                    <div className="form-group">
                      <label className="form-label">密码</label>
                      <input
                        type="password"
                        className="form-input"
                        placeholder="请输入密码"
                        maxLength={20}
                        autoComplete="current-password"
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value)
                          setErrorMessage('')
                        }}
                      />
                    </div>

                    {/* Error message */}
                    {errorMessage && (
                      <div className="error-tip">
                        <AlertTriangle size={16} />
                        {errorMessage}
                      </div>
                    )}

                    {/* Submit */}
                    <button type="submit" className="submit-btn" disabled={isSubmitting}>
                      {isSubmitting && <span className="loading-spinner" />}
                      {isSubmitting ? '登录中...' : '登录'}
                    </button>
                  </form>

                  <div className="auth-switch">
                    <span className="switch-text">没有账号？</span>
                    <button type="button" className="switch-btn" onClick={() => switchToTab('register')}>
                      注册
                    </button>
                  </div>

                  <div className="auth-switch">
                    <span className="switch-text">其他方式</span>
                    <button type="button" className="switch-btn" onClick={() => switchToTab('quick-login')}>
                      快捷登录
                    </button>
                  </div>

                  {/* Forgot password */}
                  {emailEnabled && (
                    <div className="forgot-password">
                      <button type="button" className="forgot-btn" onClick={openResetPassword}>
                        忘记密码？
                      </button>
                    </div>
                  )}
                </Tabs.Content>

                {/* ========== Tab 2: 快捷登录 ========== */}
                <Tabs.Content className="auth-tab-content" value="quick-login">
                  {errorMessage && (
                    <div className="error-tip">
                      <AlertTriangle size={16} />
                      {errorMessage}
                    </div>
                  )}

                  {/* Channel bind form */}
                  {channelBindInfo ? (
                    <form onSubmit={handleChannelBindSubmit} className="auth-form" noValidate autoComplete="off">
                      <p className="bind-notice">
                        {channelBindInfo.type === 'PHONE' ? '手机号' : '邮箱'}{' '}
                        <strong>{channelBindInfo.target}</strong> 尚未绑定账号，请设置用户名和密码完成登录
                      </p>
                      <div className="form-group">
                        <label className="form-label">设置用户名</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="请输入用户名（3-15位字母数字下划线）"
                          maxLength={15}
                          autoComplete="off"
                          value={bindUsername}
                          onChange={(e) => {
                            setBindUsername(e.target.value)
                            setErrorMessage('')
                          }}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">设置密码</label>
                        <input
                          type="password"
                          className="form-input"
                          placeholder="请设置密码（6-20位）"
                          maxLength={20}
                          autoComplete="new-password"
                          value={bindPassword}
                          onChange={(e) => {
                            setBindPassword(e.target.value)
                            setErrorMessage('')
                          }}
                        />
                      </div>
                      {errorMessage && (
                        <div className="error-tip">
                          <AlertTriangle size={16} />
                          {errorMessage}
                        </div>
                      )}
                      <button type="submit" className="submit-btn" disabled={isSubmitting}>
                        {isSubmitting && <span className="loading-spinner" />}
                        {isSubmitting ? '绑定中...' : '绑定并登录'}
                      </button>
                      <button
                        type="button"
                        className="back-btn"
                        onClick={() => setChannelBindInfo(null)}
                      >
                        返回
                      </button>
                    </form>
                  ) : (
                    <div className="quick-login-buttons">
                      {/* Phone code login */}
                      <button
                        type="button"
                        className="quick-login-btn"
                        onClick={() => {
                          setPhoneExpanded(!phoneExpanded)
                          setEmailExpanded(false)
                          setErrorMessage('')
                        }}
                      >
                        <Phone size={18} />
                        手机验证码登录
                      </button>

                      {phoneExpanded && (
                        <form onSubmit={handlePhoneCodeLogin} className="quick-login-form" noValidate autoComplete="off">
                          <div className="form-group">
                            <label className="form-label">手机号码</label>
                            <input
                              type="tel"
                              className="form-input"
                              placeholder="请输入手机号码"
                              maxLength={11}
                              autoComplete="off"
                              value={quickPhone}
                              onChange={(e) => {
                                setQuickPhone(e.target.value)
                                setErrorMessage('')
                              }}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">验证码</label>
                            <div className="form-input-with-button">
                              <input
                                type="text"
                                className="form-input"
                                placeholder="请输入验证码"
                                maxLength={6}
                                autoComplete="one-time-code"
                                value={quickPhoneCode}
                                onChange={(e) => {
                                  setQuickPhoneCode(e.target.value)
                                  setErrorMessage('')
                                }}
                              />
                              <button
                                type="button"
                                className="email-code-btn"
                                disabled={phoneCountdown.countdown > 0 || !quickPhone.trim()}
                                onClick={sendPhoneCode}
                              >
                                {phoneCountdown.countdown > 0
                                  ? `${phoneCountdown.countdown}秒后重发`
                                  : '发送验证码'}
                              </button>
                            </div>
                          </div>
                          <button type="submit" className="submit-btn" disabled={isSubmitting}>
                            {isSubmitting && <span className="loading-spinner" />}
                            {isSubmitting ? '登录中...' : '登录'}
                          </button>
                        </form>
                      )}

                      {/* Email code login */}
                      <button
                        type="button"
                        className="quick-login-btn"
                        onClick={() => {
                          setEmailExpanded(!emailExpanded)
                          setPhoneExpanded(false)
                          setErrorMessage('')
                        }}
                      >
                        <Mail size={18} />
                        邮箱验证码登录
                      </button>

                      {emailExpanded && (
                        <form onSubmit={handleEmailCodeLogin} className="quick-login-form" noValidate autoComplete="off">
                          <div className="form-group">
                            <label className="form-label">邮箱地址</label>
                            <input
                              type="email"
                              className="form-input"
                              placeholder="请输入邮箱地址"
                              maxLength={100}
                              autoComplete="off"
                              value={quickEmail}
                              onChange={(e) => {
                                setQuickEmail(e.target.value)
                                setErrorMessage('')
                              }}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">验证码</label>
                            <div className="form-input-with-button">
                              <input
                                type="text"
                                className="form-input"
                                placeholder="请输入验证码"
                                maxLength={6}
                                autoComplete="one-time-code"
                                value={quickEmailCode}
                                onChange={(e) => {
                                  setQuickEmailCode(e.target.value)
                                  setErrorMessage('')
                                }}
                              />
                              <button
                                type="button"
                                className="email-code-btn"
                                disabled={emailCountdown.countdown > 0 || !quickEmail.trim()}
                                onClick={sendEmailCode}
                              >
                                {emailCountdown.countdown > 0
                                  ? `${emailCountdown.countdown}秒后重发`
                                  : '发送验证码'}
                              </button>
                            </div>
                          </div>
                          <button type="submit" className="submit-btn" disabled={isSubmitting}>
                            {isSubmitting && <span className="loading-spinner" />}
                            {isSubmitting ? '登录中...' : '登录'}
                          </button>
                        </form>
                      )}

                      {/* Google OAuth */}
                      <button
                        type="button"
                        className="quick-login-btn google-btn"
                        onClick={() => {
                          window.location.href = '/oauth2/authorization/google'
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        使用 Google 账号登录
                      </button>
                    </div>
                  )}

                  <div className="auth-switch">
                    <span className="switch-text">使用密码登录</span>
                    <button type="button" className="switch-btn" onClick={() => switchToTab('login')}>
                      账号登录
                    </button>
                  </div>
                </Tabs.Content>

                {/* ========== Tab 3: 注册 ========== */}
                <Tabs.Content className="auth-tab-content" value="register">
                  <form onSubmit={handleRegisterSubmit} className="auth-form" noValidate autoComplete="off">
                    {/* Username */}
                    <div className="form-group">
                      <label className="form-label">用户名</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="请输入用户名（3-15位字母数字下划线）"
                        maxLength={15}
                        autoComplete="off"
                        value={regUsername}
                        onChange={(e) => {
                          setRegUsername(e.target.value)
                          setErrorMessage('')
                        }}
                      />
                    </div>

                    {/* Password */}
                    <div className="form-group">
                      <label className="form-label">密码</label>
                      <input
                        type="password"
                        className="form-input"
                        placeholder="请设置密码（6-20位）"
                        maxLength={20}
                        autoComplete="new-password"
                        value={regPassword}
                        onChange={(e) => {
                          setRegPassword(e.target.value)
                          setErrorMessage('')
                        }}
                      />
                    </div>

                    {/* Confirm Password */}
                    <div className="form-group">
                      <label className="form-label">确认密码</label>
                      <input
                        type="password"
                        className="form-input"
                        placeholder="请再次输入密码"
                        maxLength={20}
                        autoComplete="new-password"
                        value={regConfirmPassword}
                        onChange={(e) => {
                          setRegConfirmPassword(e.target.value)
                          setErrorMessage('')
                        }}
                      />
                    </div>

                    {/* Error message */}
                    {errorMessage && (
                      <div className="error-tip">
                        <AlertTriangle size={16} />
                        {errorMessage}
                      </div>
                    )}

                    {/* Submit */}
                    <button type="submit" className="submit-btn" disabled={isSubmitting}>
                      {isSubmitting && <span className="loading-spinner" />}
                      {isSubmitting ? '注册中...' : '注册'}
                    </button>
                  </form>

                  <div className="auth-switch">
                    <span className="switch-text">已有账号？</span>
                    <button type="button" className="switch-btn" onClick={() => switchToTab('login')}>
                      登录
                    </button>
                  </div>
                </Tabs.Content>
              </Tabs.Root>
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
            max-width: 420px;
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
            margin-bottom: 24px;
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

          /* Tabs */
          .auth-tabs-root {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
          .auth-tabs-list {
            display: flex;
            border-bottom: 2px solid var(--bg-color-secondary);
            gap: 0;
          }
          .auth-tab-trigger {
            flex: 1;
            padding: 10px 0;
            background: none;
            border: none;
            border-bottom: 2px solid transparent;
            margin-bottom: -2px;
            font-size: 15px;
            font-weight: 500;
            color: var(--text-color-secondary);
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .auth-tab-trigger:hover {
            color: var(--text-color-primary);
          }
          .auth-tab-trigger[data-state="active"] {
            color: var(--primary-color);
            border-bottom-color: var(--primary-color);
            font-weight: 600;
          }
          .auth-tab-content {
            outline: none;
          }

          /* Forms */
          .auth-form {
            display: flex;
            flex-direction: column;
            gap: 16px;
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
          .back-btn {
            padding: 10px 24px;
            background: var(--bg-color-secondary);
            color: var(--text-color-secondary);
            border: none;
            border-radius: 999px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
          }
          .back-btn:hover {
            background: var(--bg-color-hover);
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
            padding-top: 16px;
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

          /* Quick login */
          .quick-login-buttons {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .quick-login-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 14px 24px;
            border: 1px solid var(--bg-color-secondary);
            border-radius: 8px;
            background: var(--bg-color-primary);
            color: var(--text-color-primary);
            font-size: 15px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .quick-login-btn:hover {
            border-color: var(--primary-color);
            background: var(--bg-color-secondary);
          }
          .quick-login-btn.google-btn:hover {
            border-color: #4285F4;
          }
          .quick-login-form {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 12px 16px;
            background: var(--bg-color-secondary);
            border-radius: 8px;
          }
          .bind-notice {
            font-size: 14px;
            color: var(--text-color-secondary);
            text-align: center;
            margin: 0;
            line-height: 1.5;
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
