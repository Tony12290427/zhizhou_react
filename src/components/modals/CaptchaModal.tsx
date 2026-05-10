import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import './CaptchaModal.css'

// ---- Types ----

export interface CaptchaModalProps {
  visible: boolean
  captchaSvg: string
  captchaText: string
  isLoading?: boolean
  onVerify?: (code: string) => void
  onClose?: () => void
  onRefresh?: () => void
}

// ---- Component ----

const CaptchaModal: React.FC<CaptchaModalProps> = ({
  visible,
  captchaSvg,
  captchaText: _captchaText,
  isLoading = false,
  onVerify,
  onClose,
  onRefresh,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null])
  const [captchaInputs, setCaptchaInputs] = useState(['', '', '', ''])

  // When modal opens, clear inputs and focus first
  useEffect(() => {
    if (visible) {
      setCaptchaInputs(['', '', '', ''])
      setTimeout(() => {
        inputRefs.current[0]?.focus()
      }, 0)
    }
  }, [visible])

  // When captcha SVG changes (refresh), clear inputs
  useEffect(() => {
    if (visible) {
      setCaptchaInputs(['', '', '', ''])
      setTimeout(() => {
        inputRefs.current[0]?.focus()
      }, 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captchaSvg])

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
      let value = event.target.value
      if (value.length > 1) {
        value = value[0]
      }
      const newInputs = [...captchaInputs]
      newInputs[index] = value
      setCaptchaInputs(newInputs)

      if (value) {
        // Find next empty input after current position
        for (let i = index + 1; i < newInputs.length; i++) {
          if (!newInputs[i]) {
            inputRefs.current[i]?.focus()
            return
          }
        }
        inputRefs.current[3]?.focus()
      }
    },
    [captchaInputs]
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
      if (event.key === 'Backspace') {
        const newInputs = [...captchaInputs]
        if (newInputs[index]) {
          newInputs[index] = ''
          setCaptchaInputs(newInputs)
        } else if (index > 0) {
          newInputs[index - 1] = ''
          setCaptchaInputs(newInputs)
          inputRefs.current[index - 1]?.focus()
        }
        event.preventDefault()
      }
      if (event.key === 'Enter') {
        const code = captchaInputs.join('')
        if (code.length === 4) {
          onVerify?.(code)
        }
      }
      if (event.key === 'ArrowLeft' && index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
      if (event.key === 'ArrowRight' && index < 3) {
        inputRefs.current[index + 1]?.focus()
      }
    },
    [captchaInputs, onVerify]
  )

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLInputElement>, index: number) => {
      event.preventDefault()
      const pastedText = event.clipboardData.getData('text').slice(0, 4)
      const chars = pastedText.split('')
      const newInputs = [...captchaInputs]

      for (let i = 0; i < chars.length && index + i < 4; i++) {
        newInputs[index + i] = chars[i]
      }
      setCaptchaInputs(newInputs)

      const nextIndex = Math.min(index + chars.length, 3)
      inputRefs.current[nextIndex]?.focus()
    },
    [captchaInputs]
  )

  const handleConfirm = useCallback(() => {
    const code = captchaInputs.join('')
    if (code.length === 4) {
      onVerify?.(code)
    }
  }, [captchaInputs, onVerify])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose?.()
      }
    },
    [onClose]
  )

  const fullCode = captchaInputs.join('')
  const isComplete = fullCode.length === 4

  return (
    <Dialog.Root open={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="captcha-modal-overlay"
          onClick={() => onClose?.()}
        />
        <Dialog.Content
          className="captcha-modal"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="modal-header">
            <Dialog.Title asChild>
              <h4>请输入验证码</h4>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="close-btn" onClick={() => onClose?.()}>
                <X width={16} height={16} />
              </button>
            </Dialog.Close>
          </div>

          <div className="captcha-content">
            <div
              className="captcha-image-wrapper clickable"
              onClick={() => onRefresh?.()}
              title="点击刷新验证码"
            >
              {isLoading ? (
                <div className="captcha-loading">
                  <div className="loading-spinner" />
                  <span>加载中...</span>
                </div>
              ) : captchaSvg ? (
                <div
                  className="captcha-image"
                  dangerouslySetInnerHTML={{ __html: captchaSvg }}
                />
              ) : (
                <div className="captcha-error">验证码加载失败，点击重试</div>
              )}
            </div>

            <div className="captcha-inputs">
              {captchaInputs.map((char, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el
                  }}
                  type="text"
                  value={char}
                  onChange={(e) => handleInputChange(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onPaste={(e) => handlePaste(e, index)}
                  className="captcha-input-box"
                  maxLength={1}
                  autoComplete="off"
                />
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => onClose?.()}>
              取消
            </button>
            <button
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={!isComplete}
            >
              确认
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default CaptchaModal
