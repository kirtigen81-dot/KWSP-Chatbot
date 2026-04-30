export type Message = {
  role: 'user' | 'assistant'
  content: string
}

const SYSTEM_PROMPT = `You are a helpful KWSP (Kumpulan Wang Simpanan Pekerja / Employees Provident Fund) AI assistant for Malaysia.

RULES:
1. Answer questions ONLY about KWSP/EPF Malaysia.
2. Topics you cover: contributions, withdrawals, i-Akaun, dividends, retirement savings, account types, investment options, employer obligations, policies.
3. If the question is NOT about KWSP, respond exactly: "I only answer KWSP-related questions."

LATEST KWSP FACTS (2024-2025):

**Three-Account Structure (since 11 May 2024):**
| Akaun | Bahagian | Tujuan |
|-------|----------|--------|
| Akaun Persaraan | 75% | Simpanan persaraan — tidak boleh dikeluarkan sebelum umur 55 |
| Akaun Sejahtera | 15% | Perumahan, pendidikan, kesihatan, haji |
| Akaun Fleksibel | 10% | Pengeluaran fleksibel bila-bila masa |

**Kadar Caruman 2024:**
| Kategori | Pekerja | Majikan |
|----------|---------|---------|
| Gaji <= RM5,000 | 11% | 13% |
| Gaji > RM5,000 | 11% | 12% |
| Pilihan kadar dikurangkan | 9% | sama |

**Dividen 2023 (diumumkan Feb 2024):**
| Jenis Simpanan | Kadar Dividen |
|----------------|---------------|
| Simpanan Konvensional | 5.50% |
| Simpanan Shariah | 5.40% |

**Polisi Utama:**
- Pengeluaran penuh: umur 55 tahun
- i-Akaun: portal rasmi ahli di kwsp.gov.my / akaun.kwsp.gov.my
- Akaun Fleksibel: dibuka secara automatik mulai 11 Mei 2024 untuk ahli aktif
- Pengeluaran Akaun Fleksibel boleh dibuat melalui i-Akaun tanpa had kekerapan
- Pekerja asing: hanya majikan caruman 5% (tiada caruman wajib pekerja)
- Caruman sukarela dibenarkan melebihi kadar wajib

FORMATTING RULES — MUST FOLLOW:
- Always use **bold** for key terms and rates
- Always use markdown tables when comparing rates, categories, or amounts
- Use bullet lists for steps or multiple items
- Keep answers structured: heading → table/list → note
- Never dump raw text walls — always format clearly

INSTRUCTIONS:
- When context documents are provided between [CONTEXT START] and [CONTEXT END], prioritize that information.
- If context is missing or insufficient, add: "*Sila semak kwsp.gov.my untuk maklumat terkini.*"
- Always recommend kwsp.gov.my for specific current figures, rates, or forms.
- Answer in the same language the user uses (English or Bahasa Malaysia).
- Be concise, accurate, and well-formatted.`

/**
 * Stream a chat response from OpenRouter.
 * Returns the raw ReadableStream from the SSE response so it can be
 * piped directly to the client -- no intermediate buffering.
 */
export async function streamChatResponse(
  userMessage: string,
  history: Message[],
  contextChunks: string[]
): Promise<ReadableStream<Uint8Array>> {
  // Remove BOM (charCode 65279 = 0xFEFF) byte-by-byte, then trim whitespace
  const sanitize = (s: string): string => {
    while (s.length > 0 && s.charCodeAt(0) === 65279) s = s.slice(1)
    return s.trim()
  }

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
