import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { addDocument } from '@/lib/vectorStore'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse form data ───────────────────────────────────────────────
  let file: File | null = null
  try {
    const formData = await request.formData()
    file = formData.get('file') as File | null
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // ── Validate ──────────────────────────────────────────────────────
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File exceeds 5 MB limit' }, { status: 400 })
  }

  // ── Extract PDF text ──────────────────────────────────────────────
  try {
    const buffer = Buffer.from(await file.arrayBuffer())

    // Dynamically require to avoid Edge runtime issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse')
    const pdfData = await pdfParse(buffer)

    const text: string = pdfData.text?.trim() ?? ''
    if (!text) {
      return NextResponse.json(
        { error: 'Could not extract text. The PDF may be image-based (scanned). Please use a text-based PDF.' },
        { status: 400 }
      )
    }

    const docId = await addDocument(file.name, text)

    return NextResponse.json({
      success: true,
      documentId: docId,
      filename: file.name,
      extractedPages: pdfData.numpages as number,
    })
  } catch (err) {
    console.error('[/api/upload]', err)
    return NextResponse.json({ error: 'Failed to process the PDF file' }, { status: 500 })
  }
}
