import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getDocuments, deleteDocument } from '@/lib/vectorStore'

export const runtime = 'nodejs'

/** List all uploaded documents */
export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const documents = await getDocuments()
  return NextResponse.json({ documents })
}

/** Delete a document by ?id=<docId> */
export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const docId = new URL(request.url).searchParams.get('id')
  if (!docId) {
    return NextResponse.json({ error: 'Document ID is required (?id=...)' }, { status: 400 })
  }

  const removed = await deleteDocument(docId)
  if (!removed) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
