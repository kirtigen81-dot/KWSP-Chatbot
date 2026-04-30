'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import LoadingDots from './LoadingDots'

export interface ChatMessageType {
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
}

export default function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 gap-2`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-kwsp-green flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-1">
          K
        </div>
      )}

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
        }`}
      >
        {message.loading ? (
          <LoadingDots />
        ) : isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          <div className="kwsp-prose">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-gray-700">{children}</li>,
                h1: ({ children }) => <h1 className="text-base font-bold mb-2 text-gray-900">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-bold mb-2 text-gray-900">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 text-gray-900">{children}</h3>,
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2">
                    <table className="kwsp-table">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-kwsp-green text-white">{children}</thead>,
                tbody: ({ children }) => <tbody className="divide-y divide-gray-100">{children}</tbody>,
                tr: ({ children }) => <tr className="hover:bg-gray-50 transition-colors">{children}</tr>,
                th: ({ children }) => (
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap">{children}</td>
                ),
                code: ({ children }) => (
                  <code className="bg-gray-100 text-gray-800 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-kwsp-green pl-3 italic text-gray-600 my-2">{children}</blockquote>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-1">
          U
        </div>
      )}
    </div>
  )
}
