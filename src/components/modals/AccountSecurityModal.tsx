import React, { useEffect, useCallback, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, ShieldCheck, Key, Trash2 } from 'lucide-react'
import { useAccountSecurityStore } from '@/stores/account-security-store'
import { useChangePasswordStore } from '@/stores/change-password-store'
import { useVerifiedStore } from '@/stores/verified-store'
import { useUserStore } from '@/stores/user-store'
import { useScrollLock } from '@/hooks/use-scroll-lock'
import ConfirmDialog from '@/components/ConfirmDialog'
import { toast } from '@/utils/toastManager'

export function AccountSecurityModal() {
  const showAccountSecurityModal = useAccountSecurityStore(
    (s) => s.showAccountSecurityModal
  )
  const closeAccountSecurityModal = useAccountSecurityStore(
    (s) => s.closeAccountSecurityModal
  )
  const deleteAccount = useAccountSecurityStore((s) => s.deleteAccount)
  const openChangePasswordModal = useChangePasswordStore((s) => s.open)
  const openVerifiedModal = useVerifiedStore((s) => s.openVerifiedModal)
  const logout = useUserStore((s) => s.logout)
  const { lock, unlock } = useScrollLock()
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    if (showAccountSecurityModal) {
      lock()
      return () => unlock()
    }
  }, [showAccountSecurityModal, lock, unlock])

  const handleClose = useCallback(() => {
    closeAccountSecurityModal()
  }, [closeAccountSecurityModal])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        handleClose()
      }
    },
    [handleClose]
  )

  const handleVerification = useCallback(() => {
    handleClose()
    setTimeout(() => openVerifiedModal(), 200)
  }, [handleClose, openVerifiedModal])

  const handleChangePassword = useCallback(() => {
    handleClose()
    setTimeout(() => openChangePasswordModal(), 200)
  }, [handleClose, openChangePasswordModal])

  const handleDeleteAccount = useCallback(() => {
    setShowDeleteModal(true)
  }, [])

  const confirmDeleteAccount = useCallback(async () => {
    const result = await deleteAccount()
    if (result.success) {
      setShowDeleteModal(false)
      handleClose()
      await logout()
      window.location.reload()
    } else {
      toast.error(result.message || '注销账号失败')
    }
  }, [deleteAccount, logout, handleClose])

  return (
    <>
      <Dialog.Root open={showAccountSecurityModal} onOpenChange={handleOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="modal-overlay" />
          <Dialog.Content
            className="modal-container"
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            <div className="modal-header">
              <h3 className="modal-title">账号与安全</h3>
              <Dialog.Close asChild>
                <button className="close-btn">
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>

            <div className="modal-content">
              <div className="security-options">
                <div className="security-item" onClick={handleVerification}>
                  <div className="item-icon">
                    <ShieldCheck size={24} />
                  </div>
                  <div className="item-content">
                    <div className="item-title">我要认证</div>
                    <div className="item-desc">申请个人认证或官方认证</div>
                  </div>
                </div>

                <div className="security-item" onClick={handleChangePassword}>
                  <div className="item-icon">
                    <Key size={24} />
                  </div>
                  <div className="item-content">
                    <div className="item-title">修改密码</div>
                    <div className="item-desc">更改您的登录密码</div>
                  </div>
                </div>

                <div className="security-item danger" onClick={handleDeleteAccount}>
                  <div className="item-icon">
                    <Trash2 size={24} />
                  </div>
                  <div className="item-content">
                    <div className="item-title">注销账号</div>
                    <div className="item-desc">永久删除您的账号和所有数据</div>
                  </div>
                </div>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>

        <style>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.21);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }
          .modal-container {
            background: var(--bg-color-primary);
            border-radius: 12px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            min-width: 320px;
            max-height: 90vh;
            overflow: hidden;
            border: 1px solid var(--border-color-primary);
          }
          .modal-header {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 24px 16px;
            border-bottom: 1px solid var(--border-color-primary);
          }
          .modal-title {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: var(--text-color-primary);
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
            transition: all 0.2s ease;
          }
          .close-btn:hover {
            opacity: 0.8;
            transform: scale(1.1);
          }
          .modal-content {
            padding: 24px;
          }
          .security-options {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .security-item {
            display: flex;
            align-items: center;
            padding: 16px;
            border: 1px solid var(--border-color-primary);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            background: var(--bg-color-primary);
          }
          .security-item:hover {
            background: var(--bg-color-secondary);
            border-color: var(--border-color-secondary);
          }
          .security-item.danger:hover {
            background: rgba(239, 68, 68, 0.05);
            border-color: #ef4444;
          }
          .item-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 16px;
            color: var(--text-color-secondary);
          }
          .item-content {
            flex: 1;
          }
          .item-title {
            font-size: 16px;
            font-weight: 500;
            color: var(--text-color-primary);
            margin-bottom: 4px;
          }
          .item-desc {
            font-size: 14px;
            color: var(--text-color-secondary);
          }
        `}</style>
      </Dialog.Root>

      <ConfirmDialog
        visible={showDeleteModal}
        title="确认注销账号"
        message="注销账号将永久删除您的所有数据，包括发布的内容、评论、收藏等，此操作不可恢复。确定要继续吗？"
        type="error"
        confirmText="确认注销"
        cancelText="取消"
        onConfirm={confirmDeleteAccount}
        onCancel={() => setShowDeleteModal(false)}
        onVisibleChange={setShowDeleteModal}
      />
    </>
  )
}

export default AccountSecurityModal
