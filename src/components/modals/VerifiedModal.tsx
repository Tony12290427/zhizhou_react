import React, {
  useState,
  useEffect,
  useCallback,
} from 'react'
import { toast } from '@/utils/toastManager'
import { X, Clock, ShieldCheck } from 'lucide-react'
import VerifiedBadge from '@/components/VerifiedBadge'
import { useScrollLock } from '@/hooks/use-scroll-lock'
import './VerifiedModal.css'

// ---- Types ----

export interface VerifiedModalProps {
  onClose: () => void
}

interface PersonalInfo {
  realName: string
  idCard: string
  occupation: string
  reason: string
}

interface OfficialInfo {
  organizationName: string
  creditCode: string
  contactName: string
  contactPhone: string
  reason: string
}

interface VerificationAudit {
  status: number // 0-pending, 1-approved, 2-rejected
  type: number  // 1-official, 2-personal
}

// ---- Component ----

const VerifiedModal: React.FC<VerifiedModalProps> = ({ onClose }) => {
  const { lock, unlock } = useScrollLock()

  const [isAnimating, setIsAnimating] = useState(false)
  const [verificationType, setVerificationType] = useState<number | null>(null) // 1-official, 2-personal

  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    realName: '',
    idCard: '',
    occupation: '',
    reason: '',
  })

  const [officialInfo, setOfficialInfo] = useState<OfficialInfo>({
    organizationName: '',
    creditCode: '',
    contactName: '',
    contactPhone: '',
    reason: '',
  })

  const [loading, setLoading] = useState(false)
  const [revokeLoading, setRevokeLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(true)
  const [verificationStatus, setVerificationStatus] = useState<VerificationAudit[] | null>(null)

  // Compute verification status
  const pendingAudit = verificationStatus?.find((a) => a.status === 0)
  const approvedAudit = verificationStatus?.find((a) => a.status === 1)
  const rejectedAudit = verificationStatus?.find((a) => a.status === 2)

  const hasPending = !!pendingAudit
  const hasApproved = !!approvedAudit
  const hasRejected = !!rejectedAudit

  const hasExistingVerification = hasPending || hasApproved || hasRejected

  const statusText = (() => {
    if (approvedAudit) {
      const typeText = approvedAudit.type === 1 ? '官方认证' : '个人认证'
      return `您已通过${typeText}，如需重新申请可先撤回当前认证`
    }
    if (rejectedAudit) {
      const typeText = rejectedAudit.type === 1 ? '官方认证' : '个人认证'
      return `您的${typeText}申请已被拒绝，如需重新申请请先撤回当前申请并修改后再次提交`
    }
    if (pendingAudit) {
      const typeText = pendingAudit.type === 1 ? '官方认证' : '个人认证'
      return `您的${typeText}申请正在审核中，请耐心等待`
    }
    return ''
  })()

  const showForm = !statusLoading && !hasExistingVerification

  // Mount animation + scroll lock + fetch status
  useEffect(() => {
    lock()
    fetchVerificationStatus()

    const timer = setTimeout(() => {
      setIsAnimating(true)
    }, 10)

    return () => {
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch verification status
  const fetchVerificationStatus = async () => {
    try {
      setStatusLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users/verification/status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const result = await response.json()

      if (result.code === 200) {
        setVerificationStatus(result.data)
      }
    } catch (error) {
      console.error('获取认证状态失败:', error)
    } finally {
      setStatusLoading(false)
    }
  }

  const handleClose = useCallback(() => {
    if (loading) return
    setIsAnimating(false)
    unlock()
    setTimeout(() => {
      onClose()
    }, 200)
  }, [loading, unlock, onClose])

  const handleSelectType = useCallback((type: number) => {
    setVerificationType(type)
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!verificationType) {
        toast.error('请选择认证类型')
        return
      }

      if (verificationType === 2) {
        if (!personalInfo.realName) {
          toast.error('请输入真实姓名')
          return
        }
        if (!personalInfo.idCard) {
          toast.error('请输入身份证号')
          return
        }
        if (!personalInfo.occupation) {
          toast.error('请输入职业或身份')
          return
        }
        if (!personalInfo.reason) {
          toast.error('请输入认证理由')
          return
        }
      } else if (verificationType === 1) {
        if (!officialInfo.organizationName) {
          toast.error('请输入机构或企业名称')
          return
        }
        if (!officialInfo.creditCode) {
          toast.error('请输入统一社会信用代码')
          return
        }
        if (!officialInfo.contactName) {
          toast.error('请输入联系人姓名')
          return
        }
        if (!officialInfo.contactPhone) {
          toast.error('请输入联系电话')
          return
        }
        if (!officialInfo.reason) {
          toast.error('请输入认证理由')
          return
        }
      }

      setLoading(true)

      try {
        let requestBody: Record<string, unknown>

        if (verificationType === 2) {
          requestBody = {
            type: verificationType,
            real_name: personalInfo.realName,
            id_card: personalInfo.idCard,
            title: personalInfo.occupation,
            description: personalInfo.reason,
          }
        } else {
          requestBody = {
            type: verificationType,
            real_name: officialInfo.organizationName,
            id_card: officialInfo.creditCode,
            contact_name: officialInfo.contactName,
            contact_phone: officialInfo.contactPhone,
            title: officialInfo.organizationName,
            description: officialInfo.reason,
          }
        }

        const token = localStorage.getItem('token')
        const response = await fetch('/api/users/verification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        })

        const result = await response.json()

        if (result.code === 200 || result.success) {
          toast.success('认证申请提交成功，请耐心等待审核')

          // Reset form
          setVerificationType(null)
          setPersonalInfo({
            realName: '',
            idCard: '',
            occupation: '',
            reason: '',
          })
          setOfficialInfo({
            organizationName: '',
            creditCode: '',
            contactName: '',
            contactPhone: '',
            reason: '',
          })

          await fetchVerificationStatus()
        } else {
          toast.error(result.message || '提交失败，请重试')
        }
      } catch (error) {
        console.error('提交认证申请失败:', error)
        toast.error('网络错误，请重试')
      } finally {
        setLoading(false)
      }
    },
    [verificationType, personalInfo, officialInfo]
  )

  const handleRevoke = useCallback(async () => {
    if (revokeLoading) return
    setRevokeLoading(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users/verification/revoke', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await response.json()

      if (result.code === 200 || result.success) {
        toast.success('认证申请已撤回')
        await fetchVerificationStatus()
      } else {
        toast.error(result.message || '撤回失败，请重试')
      }
    } catch (error) {
      console.error('撤回认证申请失败:', error)
      toast.error('网络错误，请重试')
    } finally {
      setRevokeLoading(false)
    }
  }, [revokeLoading])

  return (
    <div
      className={`auth-modal-overlay${isAnimating ? ' animating' : ''}`}
      onMouseDown={handleClose}
    >
      <div
        className={`auth-modal${isAnimating ? ' scale-in' : ''}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button onClick={handleClose} className="close-btn">
          <X width={16} height={16} />
        </button>

        <div className="auth-content">
          <div className="auth-header">
            <h2 className="auth-title">申请认证</h2>
            {showForm && (
              <p className="auth-subtitle">选择认证类型并填写相关信息</p>
            )}
          </div>

          {/* Loading state */}
          {statusLoading && (
            <div className="loading-container">
              <div className="loading-spinner" />
              <p>正在获取认证状态...</p>
            </div>
          )}

          {/* Existing verification status */}
          {!statusLoading && hasExistingVerification && (
            <div className="verification-status">
              <div className="status-icon">
                {hasPending && <Clock width={48} height={48} />}
                {hasApproved && <ShieldCheck width={48} height={48} />}
                {hasRejected && <X width={48} height={48} />}
              </div>
              <p className="status-text">{statusText}</p>
              <button
                type="button"
                className="revoke-btn"
                onClick={handleRevoke}
                disabled={revokeLoading}
              >
                {revokeLoading ? '撤回中...' : '撤回认证'}
              </button>
            </div>
          )}

          {/* Form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="auth-form">
              {/* Verification type selection */}
              <div className="form-group">
                <label className="form-label">认证类型</label>
                <div className="verification-types">
                  <div
                    className={`verification-type${verificationType === 2 ? ' active' : ''}`}
                    onClick={() => handleSelectType(2)}
                  >
                    <div className="type-icon">
                      <VerifiedBadge verified={2} size="large" />
                    </div>
                    <div className="type-content">
                      <div className="type-title">个人认证</div>
                      <div className="type-desc">适用于个人用户</div>
                    </div>
                  </div>

                  <div
                    className={`verification-type${verificationType === 1 ? ' active' : ''}`}
                    onClick={() => handleSelectType(1)}
                  >
                    <div className="type-icon">
                      <VerifiedBadge verified={1} size="large" />
                    </div>
                    <div className="type-content">
                      <div className="type-title">官方认证</div>
                      <div className="type-desc">适用于机构、企业等</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal verification form */}
              {verificationType === 2 && (
                <div className="verification-form">
                  <div className="form-group">
                    <label className="form-label">真实姓名</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="请输入真实姓名"
                      value={personalInfo.realName}
                      onChange={(e) =>
                        setPersonalInfo({
                          ...personalInfo,
                          realName: e.target.value,
                        })
                      }
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">身份证号</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="请输入身份证号"
                      value={personalInfo.idCard}
                      onChange={(e) =>
                        setPersonalInfo({
                          ...personalInfo,
                          idCard: e.target.value,
                        })
                      }
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">职业/身份</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="请输入职业或身份描述"
                      value={personalInfo.occupation}
                      onChange={(e) =>
                        setPersonalInfo({
                          ...personalInfo,
                          occupation: e.target.value,
                        })
                      }
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">认证理由</label>
                    <textarea
                      ref={reasonInputRef}
                      className="form-textarea"
                      placeholder="请简述申请个人认证的理由"
                      value={personalInfo.reason}
                      onChange={(e) =>
                        setPersonalInfo({
                          ...personalInfo,
                          reason: e.target.value,
                        })
                      }
                      maxLength={200}
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              {/* Official verification form */}
              {verificationType === 1 && (
                <div className="verification-form">
                  <div className="form-group">
                    <label className="form-label">机构/企业名称</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="请输入机构或企业全称"
                      value={officialInfo.organizationName}
                      onChange={(e) =>
                        setOfficialInfo({
                          ...officialInfo,
                          organizationName: e.target.value,
                        })
                      }
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">统一社会信用代码</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="请输入统一社会信用代码"
                      value={officialInfo.creditCode}
                      onChange={(e) =>
                        setOfficialInfo({
                          ...officialInfo,
                          creditCode: e.target.value,
                        })
                      }
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">联系人姓名</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="请输入联系人姓名"
                      value={officialInfo.contactName}
                      onChange={(e) =>
                        setOfficialInfo({
                          ...officialInfo,
                          contactName: e.target.value,
                        })
                      }
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">联系电话</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="请输入联系电话"
                      value={officialInfo.contactPhone}
                      onChange={(e) =>
                        setOfficialInfo({
                          ...officialInfo,
                          contactPhone: e.target.value,
                        })
                      }
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">认证理由</label>
                    <textarea
                      className="form-textarea"
                      placeholder="请简述申请官方认证的理由和用途"
                      value={officialInfo.reason}
                      onChange={(e) =>
                        setOfficialInfo({
                          ...officialInfo,
                          reason: e.target.value,
                        })
                      }
                      maxLength={200}
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={loading || !verificationType}
                >
                  {loading && <span className="loading-spinner" />}
                  {loading ? '提交中...' : '提交申请'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default VerifiedModal
