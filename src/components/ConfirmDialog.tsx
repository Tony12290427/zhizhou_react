import React, { useEffect, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import './skeleton.css';

export type ConfirmDialogType = 'warning' | 'error' | 'info';

export interface ConfirmDialogProps {
  visible: boolean;
  title?: string;
  message: string;
  type?: ConfirmDialogType;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onVisibleChange?: (visible: boolean) => void;
}

function useScrollLock(lock: boolean) {
  useEffect(() => {
    if (!lock) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [lock]);
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title = '确认操作',
  message,
  type = 'warning',
  confirmText = '确认',
  cancelText = '取消',
  showCancel = true,
  onConfirm,
  onCancel,
  onVisibleChange,
}) => {
  useScrollLock(visible);

  const handleConfirm = useCallback(() => {
    onConfirm?.();
    onVisibleChange?.(false);
  }, [onConfirm, onVisibleChange]);

  const handleCancel = useCallback(() => {
    onCancel?.();
    onVisibleChange?.(false);
  }, [onCancel, onVisibleChange]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onCancel?.();
        onVisibleChange?.(false);
      }
    },
    [onCancel, onVisibleChange],
  );

  return (
    <Dialog.Root open={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="confirm-dialog-overlay" />
        <Dialog.Content className="confirm-dialog" onPointerDownOutside={(e) => e.preventDefault()}>
          <div className="dialog-header">
            <Dialog.Title className="dialog-title">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button className="close-btn" onClick={handleCancel}>
                <X width={20} height={20} />
              </button>
            </Dialog.Close>
          </div>

          <div className="dialog-content">
            <p className="dialog-message">{message}</p>
          </div>

          <div className="dialog-actions">
            <div className="form-actions">
              {showCancel && (
                <button className="btn btn-outline" onClick={handleCancel}>
                  {cancelText}
                </button>
              )}
              <button className="btn btn-primary" onClick={handleConfirm}>
                {confirmText}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default ConfirmDialog;
