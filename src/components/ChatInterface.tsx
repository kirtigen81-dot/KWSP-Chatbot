'use client'

import { useState, useRef, useEffect } from 'react'
import ChatMessage, { type ChatMessageType } from './ChatMessage'
import ChatInput from './ChatInput'

const WELCOME: ChatMessageType = {
  role: 'assistant',
  content: 'Selamat datang! / Welcome! 👋\n\nI am the KWSP AI Assistant. Ask me anything about KWSP/EPF Malaysia — contributions, withdrawals, i-Akaun, dividends, and more.',
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessageType[]>([WELCOME])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (userText: string) => {
    if (loading) return
    setError(null)
    setLoading(true)

    // History without the loading bubble
    const history = messages.map(m => ({ role: m.role, content: m.content }))

    // Optimistic UI: show user message + loading bubble immediately
    const withUser: ChatMessageType[] = [
      ...messages,
      { role: 'user', content: userText },
      { role: 'assistant', content: '', loading: true },
    ]
    setMessages(withUser)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, history }),
      })

      // Non-streaming error response
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }

      if (!res.body) throw new Error('No response body received')

      // ── Stream SSE chunks into the assistant bubble ────────────────
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // Buffer to handle lines split across chunks
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') break

          try {
            const parsed = JSON.parse(raw)
            const token: string = parsed.choices?.[0]?.delta?.content ?? ''
            if (token) {
              accumulated += token
              setMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = { role: 'assistant', content: accumulated, loading: false }
                return copy
              })
            }
          } catch {
            // skip malformed JSON lines
          }
        }
      }

      if (!accumulated) throw new Error('No response received from the AI')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
      // Remove the loading bubble on error
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          {messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} />
          ))}

          {error && (
            <div className="flex justify-center mb-4">
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm max-w-md text-center">
                ⚠️ {error}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="max-w-3xl mx-auto w-full">
        <ChatInput onSend={sendMessage} disabled={loading} />
        <p className="text-center text-xs text-gray-400 pb-2 px-4">
          AI may make mistakes. Always verify with{' '}
          <a
            href="https://www.kwsp.gov.my"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-600"
          >
            kwsp.gov.my
          </a>
        </p>
      </div>
    </div>
  )
}
