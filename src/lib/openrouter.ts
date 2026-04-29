export type Message = {
  role: 'user' | 'assistant'
  content: string
}

const SYSTEM_PROMPT = `You are a helpful KWSP (Kumpulan Wang Simpanan Pekerja / Employees Provident Fund) AI assistant for Malaysia.

RULES:
1. Answer questions ONLY about KWSP/EPF Malaysia.
2. Topics you cover: contributions, withdrawals, i-Akaun, dividends, retirement savings, account types (Akaun Persaraan, Akaun Sejahtera, Akaun Fleksibel), investment options, employer obligations, policies.
3. If the question is NOT about KWSP, respond exactly: "I only answer KWSP-related questions."

KEY KWSP FACTS (2024):
- Three-account structure: Akaun Persaraan (75%), Akaun Sejahtera (15%), Akaun Fleksibel (10%)
- Employee contribution: 11% of monthly salary (or 9% for those who opt for reduced rate)
- Employer contribution: 13% (salary ≤ RM5,000) or 12% (salary > RM5,000)
- Full withdrawal eligibility: age 55
- i-Akaun: official member portal at kwsp.gov.my
- Annual dividends declared for both Simpanan Konvensional and Simpanan Shariah

INSTRUCTIONS:
- When context documents are provided between [CONTEXT START] and [CONTEXT END], prioritize that information.
- If context is missing or insufficient, add: "Based on general KWSP knowledge — please verify at kwsp.gov.my"
- Always recommend kwsp.gov.my for specific current figures, rates, or forms.
- Answer in the same language the user uses (English or Bahasa Malaysia).
- Be concise, accurate, and helpful.`

/**
 * Stream a chat response from OpenRouter.
 * Returns the raw ReadableStream from the SSE response so it can be
 * piped directly to the client — no intermediate buffering.
 */
export async function streamChatResponse(
  userMessage: string,
  history: Message[],
  contextChunks: string[]
): Promise<ReadableStream<Uint8Array>> {
  // Strip BOM (0xFEFF) and whitespace — common when env files are saved as UTF-16
  const sanitize = (s: string) => s.replace(/^﻿/, '').trim()

  const apiKey = sanitize(process.env.OPENROUTER_API_KEY ?? '')
  const model = sanitize(process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini')
  const appUrl = sanitize(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')

  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured')

  // Append retrieved document context to the user message
  let userContent = userMessage
  if (contextChunks.length > 0) {
    userContent +=
      '\n\n[CONTEXT START]\n' +
      contextChunks.map((c, i) => `[${i + 1}] ${c}`).join('\n\n') +
      '\n[CONTEXT END]'
  }

  const messages = [
    // Keep last 10 turns to avoid token overuse
    ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userContent },
  ]

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': appUrl,
      'X-Title': 'KWSP AI Assistant',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      stream: true,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenRouter error ${response.status}: ${err}`)
  }

  if (!response.body) throw new Error('OpenRouter returned no response body')

  return response.body
}
