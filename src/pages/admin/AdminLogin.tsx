import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/utils/toastManager'
import { adminApi } from '@/lib/api/index'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim()) {
      setError('请输入用户名')
      return
    }
    if (username.length < 2) {
      setError('用户名至少需要2位')
      return
    }
    if (!password) {
      setError('请输入密码')
      return
    }
    if (password.length < 6) {
      setError('密码至少需要6位')
      return
    }

    setSubmitting(true)
    try {
      const res: any = await adminApi.login({ identifierType: 'PHONE', identifier: username, password })
      // Backend returns AuthResponse: { user: {...}, token: { accessToken, refreshToken, ... } }
      const tokenData = res?.token || res
      const accessToken = tokenData?.accessToken || tokenData?.access_token || res?.accessToken || ''
      const refreshToken = tokenData?.refreshToken || tokenData?.refresh_token || res?.refreshToken || ''
      if (accessToken) {
        localStorage.setItem('admin_token', accessToken)
        if (refreshToken) {
          localStorage.setItem('admin_refresh_token', refreshToken)
        }
        localStorage.setItem('adminInfo', JSON.stringify(res.admin || res.user || { username }))
        toast.success('登录成功，正在跳转...')
        setTimeout(() => navigate('/admin'), 800)
      } else {
        setError('登录失败，请检查用户名和密码')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '登录失败，请稍后重试'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: 'var(--bg-color-primary)' }}>
      <div className="w-full max-w-[400px]">
        <div
          className="rounded-lg p-10 border"
          style={{
            background: 'var(--bg-color-primary)',
            borderColor: 'var(--border-color-primary)',
            boxShadow: '0 4px 12px var(--shadow-color)',
          }}
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-color-primary)' }}>
              知舟管理后台
            </h1>
          </div>

          {error && (
            <div
              className="p-3 rounded-md text-sm mb-5 border"
              style={{
                background: 'var(--bg-color-secondary)',
                color: '#e53e3e',
                borderColor: '#feb2b2',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium"
                style={{ color: 'var(--text-color-primary)' }}
                htmlFor="username"
              >
                用户名
              </label>
              <input
                id="username"
                type="text"
                className="w-full px-3 py-2.5 border rounded-md text-sm outline-none transition-colors box-border"
                style={{
                  borderColor: error ? 'var(--primary-color)' : 'var(--border-color-primary)',
                  background: 'var(--bg-color-primary)',
                  color: 'var(--text-color-primary)',
                }}
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError('') }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium"
                style={{ color: 'var(--text-color-primary)' }}
                htmlFor="password"
              >
                密码
              </label>
              <input
                id="password"
                type="password"
                className="w-full px-3 py-2.5 border rounded-md text-sm outline-none transition-colors box-border"
                style={{
                  borderColor: error ? 'var(--primary-color)' : 'var(--border-color-primary)',
                  background: 'var(--bg-color-primary)',
                  color: 'var(--text-color-primary)',
                }}
                placeholder="请输入密码"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-md text-sm font-medium text-white transition-opacity cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'var(--primary-color)' }}
            >
              {submitting ? '登录中...' : '登录'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
