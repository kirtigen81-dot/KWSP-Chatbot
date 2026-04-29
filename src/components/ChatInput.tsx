'use client'

import { useState, KeyboardEvent, useRef } from 'react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const send = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    // Reset height
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 128) + 'px'
  }

  return (
    <div className="flex items-end gap-2 p-4 bg-white border-t border-gray-200">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => { setValue(e.target.value); autoResize() }}
        onKeyDown={handleKey}
        placeholder="Ask about KWSP contributions, withdrawals, i-Akaun…"
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50 max-h-32 overflow-y-auto"
      />
      <button
        onClick={send}
        disabled={!value.trim() || disabled}
        aria-label="Send message"
        className="bg-kwsp-green text-white rounded-xl p-3 hover:bg-kwsp-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
      >
        {/* Send icon */}
        <svg className="w-5 h-5 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>
  )
}
