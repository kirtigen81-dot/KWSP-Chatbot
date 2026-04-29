/**
 * Simple RAG vector store using TF-IDF cosine similarity.
 *
 * Storage backends:
 *  - Vercel Blob  (production) — set BLOB_READ_WRITE_TOKEN
 *  - In-memory    (dev/fallback) — data lost between requests on serverless
 */

import { v4 as uuidv4 } from 'uuid'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Document {
  id: string
  filename: string
  uploadedAt: string
  chunkCount: number
}

interface Chunk {
  id: string
  docId: string
  text: string
  tf: Record<string, number>
}

interface KnowledgeBase {
  documents: Document[]
  chunks: Chunk[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const KB_BLOB_PATH = 'kwsp-kb/knowledge-base.json'
const CHUNK_MAX_WORDS = 200
const MIN_RELEVANCE_SCORE = 0.01

// Common English + Malay stop words to skip in TF computation
const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'by','from','is','are','was','were','be','been','have','has','had',
  'do','does','did','will','would','could','should','may','might','this',
  'that','these','those','it','its','they','we','you','he','she','not',
  'yang','dan','di','ke','dari','untuk','dengan','oleh','ini','itu',
  'atau','tidak','ada','akan','juga','sudah','telah','lebih','bagi',
  'pada','satu','jika','seperti','antara','setiap','boleh','perlu',
])

// ─── In-memory fallback ───────────────────────────────────────────────────────

let memoryKB: KnowledgeBase = { documents: [], chunks: [] }
const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN

// ─── Blob helpers ─────────────────────────────────────────────────────────────

async function loadKB(): Promise<KnowledgeBase> {
  if (!useBlob()) return memoryKB

  try {
    const { list } = await import('@vercel/blob')
    const { blobs } = await list({ prefix: 'kwsp-kb/' })
    const target = blobs.find(b => b.pathname === KB_BLOB_PATH)
    if (!target) return { documents: [], chunks: [] }

    const res = await fetch(target.url, { cache: 'no-store' })
    return (await res.json()) as KnowledgeBase
  } catch (err) {
    console.error('[vectorStore] loadKB error:', err)
    return { documents: [], chunks: [] }
  }
}

async function saveKB(kb: KnowledgeBase): Promise<void> {
  if (!useBlob()) {
    memoryKB = kb
    return
  }

  const { put } = await import('@vercel/blob')
  await put(KB_BLOB_PATH, JSON.stringify(kb), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  })
}

// ─── NLP helpers ─────────────────────────────────────────────────────────────

function computeTF(text: string): Record<string, number> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))

  const tf: Record<string, number> = {}
  for (const word of words) tf[word] = (tf[word] ?? 0) + 1
  return tf
}

function cosineScore(a: Record<string, number>, b: Record<string, number>): number {
  let dot = 0, magA = 0, magB = 0
  for (const k of Object.keys(a)) {
    dot += (a[k] ?? 0) * (b[k] ?? 0)
    magA += a[k] ** 2
  }
  for (const v of Object.values(b)) magB += v ** 2
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}

function splitIntoChunks(text: string): string[] {
  // Split on blank lines (paragraph boundaries)
  const paragraphs = text
    .split(/\n{2,}/)
    .map(p => p.replace(/\s+/g, ' ').trim())
    .filter(p => p.length > 50)

  const chunks: string[] = []
  let current = ''
  let wordCount = 0

  for (const para of paragraphs) {
    const words = para.split(' ')
    if (wordCount + words.length > CHUNK_MAX_WORDS && current) {
      chunks.push(current.trim())
      current = ''
      wordCount = 0
    }
    current += ' ' + para
    wordCount += words.length
  }

  if (current.trim()) chunks.push(current.trim())
  return chunks.length ? chunks : [text.slice(0, 1000)] // fallback for dense PDFs
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Add an extracted PDF text to the knowledge base. Returns the new document ID. */
export async function addDocument(filename: string, text: string): Promise<string> {
  const kb = await loadKB()
  const docId = uuidv4()

  const textChunks = splitIntoChunks(text)
  const newChunks: Chunk[] = textChunks.map(t => ({
    id: uuidv4(),
    docId,
    text: t,
    tf: computeTF(t),
  }))

  kb.documents.push({
    id: docId,
    filename,
    uploadedAt: new Date().toISOString(),
    chunkCount: newChunks.length,
  })
  kb.chunks.push(...newChunks)

  await saveKB(kb)
  return docId
}

/** Retrieve the top-K most relevant chunks for a user query. */
export async function retrieveChunks(query: string, topK = 3): Promise<string[]> {
  const kb = await loadKB()
  if (kb.chunks.length === 0) return []

  const queryTF = computeTF(query)

  return kb.chunks
    .map(chunk => ({ text: chunk.text, score: cosineScore(queryTF, chunk.tf) }))
    .sort((a, b) => b.score - a.score)
    .filter(s => s.score >= MIN_RELEVANCE_SCORE)
    .slice(0, topK)
    .map(s => s.text)
}

export async function getDocuments(): Promise<Document[]> {
  const kb = await loadKB()
  return kb.documents
}

export async function deleteDocument(docId: string): Promise<boolean> {
  const kb = await loadKB()
  const idx = kb.documents.findIndex(d => d.id === docId)
  if (idx === -1) return false

  kb.documents.splice(idx, 1)
  kb.chunks = kb.chunks.filter(c => c.docId !== docId)
  await saveKB(kb)
  return true
}
