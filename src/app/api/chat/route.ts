import { NextRequest } from 'next/server'
import { streamChatResponse, type Message } from '@/lib/openrouter'
import { retrieveChunks } from '@/lib/vectorStore'
import { checkRateLimit, getClientIP } from '@/lib/rateLimit'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  // ── Rate limiting ─────────────────────────────────────────────────
  const ip = getClientIP(request)
  const rl = checkRateLimit(ip)

  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please wait a moment and try again.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // ── Validate input ────────────────────────────────────────────────
  let message: string
  let history: Message[]

  try {
    const body = await request.json()
    message = body.message?.trim() ?? ''
    history = Array.isArray(body.history) ? body.history : []
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!message) {
    return new Response(
      JSON.stringify({ error: 'Message is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (message.length > 2000) {
    return new Response(
      JSON.stringify({ error: 'Message is too long (max 2000 characters)' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // ── RAG: retrieve relevant document chunks ────────────────────────
  try {
    const contextChunks = await retrieveChunks(message, 3)

    // ── Stream from OpenRouter ────────────────────────────────────────
    const stream = await streamChatResponse(message, history, contextChunks)

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-RateLimit-Remaining': rl.remaining.toString(),
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/chat]', msg)
    return new Response(
      JSON.stringify({ error: `Failed to get AI response: ${msg}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
