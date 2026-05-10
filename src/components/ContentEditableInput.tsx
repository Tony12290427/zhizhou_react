import { useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react'
import type { KeyboardEvent, ClipboardEvent, FormEvent } from 'react'
import './ContentEditableInput.css'

interface ContentEditableInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  inputClassName?: string
  style?: React.CSSProperties
  onFocus?: (e: React.FocusEvent<HTMLDivElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLDivElement>) => void
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void
  onMention?: (query: string) => void
  disabled?: boolean
}

const ContentEditableInput = forwardRef<HTMLDivElement, ContentEditableInputProps>(function ContentEditableInput({
  value,
  onChange,
  placeholder = '输入内容...',
  className = '',
  inputClassName,
  style,
  onFocus,
  onBlur,
  onKeyDown,
  onMention,
  disabled = false,
}, ref) {
  const editorRef = useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => editorRef.current!)
  const [isFocused, setIsFocused] = useState(false)
  const isInternalChange = useRef(false)

  const handleInput = useCallback(
    (e: FormEvent<HTMLDivElement>) => {
      isInternalChange.current = true
      const html = (e.target as HTMLDivElement).innerHTML
      onChange(html)

      // Check for @mention trigger
      if (onMention) {
        const text = (e.target as HTMLDivElement).innerText || ''
        const cursorPos = getCaretPosition()
        const textBeforeCursor = text.slice(0, cursorPos)
        const atMatch = textBeforeCursor.match(/@(\S*)$/)
        if (atMatch) {
          onMention(atMatch[1])
        }
      }
    },
    [onChange, onMention]
  )

  const handlePaste = useCallback((e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }, [])

  const getCaretPosition = (): number => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return 0
    const range = selection.getRangeAt(0)
    const preCaretRange = range.cloneRange()
    preCaretRange.selectNodeContents(editorRef.current!)
    preCaretRange.setEnd(range.endContainer, range.endOffset)
    return preCaretRange.toString().length
  }

  const insertMention = useCallback((nickname: string, userId: number | string) => {
    if (!editorRef.current) return
    editorRef.current.focus()

    const mentionHtml = `<a class="mention-link" data-user-id="${userId}" href="/user/${userId}" contenteditable="false">@${nickname}</a>&nbsp;`

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    // Find the @ character before cursor and remove it along with partial text
    const range = selection.getRangeAt(0)
    const textBeforeCursor = range.startContainer.textContent?.slice(0, range.startOffset) || ''
    const atIndex = textBeforeCursor.lastIndexOf('@')
    if (atIndex >= 0) {
      range.setStart(range.startContainer, atIndex)
      range.deleteContents()
    }

    // Insert mention HTML
    const temp = document.createElement('div')
    temp.innerHTML = mentionHtml
    const nodes = Array.from(temp.childNodes)
    nodes.reverse().forEach((node) => {
      range.insertNode(node)
    })

    // Move cursor after mention
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)

    // Trigger change
    handleInput({ target: editorRef.current } as FormEvent<HTMLDivElement>)
  }, [handleInput])

  const handleFocus = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    setIsFocused(true)
    onFocus?.(e)
  }, [onFocus])

  const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    setIsFocused(false)
    onBlur?.(e)
  }, [onBlur])

  return (
    <div
      ref={editorRef}
      className={`content-editable${className ? ` ${className}` : ''}${inputClassName ? ` ${inputClassName}` : ''}`}
      contentEditable={!disabled}
      suppressContentEditableWarning
      onInput={handleInput}
      onPaste={handlePaste}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={onKeyDown}
      data-placeholder={value ? undefined : placeholder}
      style={{
        cursor: disabled ? 'not-allowed' : 'text',
        opacity: disabled ? 0.6 : 1,
        borderColor: isFocused ? 'var(--primary-color)' : 'var(--border-color-primary)',
        ...style,
      }}
    />
  )
})

export default ContentEditableInput
export type { ContentEditableInputProps }
