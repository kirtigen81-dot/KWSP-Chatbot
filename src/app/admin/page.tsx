'use client'

import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react'

interface Doc {
  id: string
  filename: string
  uploadedAt: string
  chunkCount: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Login screen
// ─────────────────────────────────────────────────────────────────────────────

function LoginForm({ onLogin }: { onLogin: (token: string) => void }) {
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Login failed')
      onLogin(data.token as string)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-kwsp-green rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-2xl font-extrabold">K</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Admin Login</h1>
          <p className="text-gray-500 text-sm mt-1">KWSP AI Assistant</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              required
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kwsp-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kwsp-green"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-kwsp-green text-white rounded-lg py-2 text-sm font-semibold hover:bg-kwsp-dark disabled:opacity-50 transition-colors"
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Default credentials set via{' '}
          <span className="font-mono bg-gray-100 px-1 rounded">ADMIN_USERNAME</span> /{' '}
          <span className="font-mono bg-gray-100 px-1 rounded">ADMIN_PASSWORD</span> env vars
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard (authenticated)
// ─────────────────────────────────────────────────────────────────────────────

function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const authHeaders = { Authorization: `Bearer ${token}` }

  const fetchDocs = async () => {
    setDocsLoading(true)
    try {
      const res = await fetch('/api/documents', { headers: authHeaders })
      if (res.status === 401) { onLogout(); return }
      const data = await res.json()
      setDocs(data.documents ?? [])
    } catch {
      // silently fail — user can hit Refresh
    } finally {
      setDocsLoading(false)
    }
  }

  useEffect(() => { fetchDocs() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadLoading(true)
    setUploadMsg(null)

    const fd = new FormData()
    fd.append('file', file)

    try {
      const res = await fetch('/api/upload', { method: 'POST', headers: authHeaders, body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setUploadMsg({ text: `Uploaded "${file.name}" — ${data.extractedPages as number} pages, chunks created`, ok: true })
      fetchDocs()
    } catch (err) {
      setUploadMsg({ text: err instanceof Error ? err.message : 'Upload failed', ok: false })
    } finally {
      setUploadLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async (doc: Doc) => {
    if (!confirm(`Delete "${doc.filename}"? This cannot be undone.`)) return
    try {
      await fetch(`/api/documents?id=${doc.id}`, { method: 'DELETE', headers: authHeaders })
      setDocs(prev => prev.filter(d => d.id !== doc.id))
    } catch {
      alert('Delete failed — please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-kwsp-green text-white px-6 py-4 shadow flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">KWSP Admin Panel</h1>
          <p className="text-green-200 text-xs">Knowledge Base Management</p>
        </div>
        <div className="flex items-center gap-4">
          <a href="/" className="text-green-200 hover:text-white text-sm transition-colors">
            ← Chat
          </a>
          <button
            onClick={onLogout}
            className="bg-white/20 hover:bg-white/30 text-white text-sm px-4 py-1.5 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">

        {/* ── Upload card ──────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Upload KWSP Document (PDF)</h2>

          <label
            htmlFor="file-upload"
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
              uploadLoading
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                : 'border-gray-300 hover:border-kwsp-green hover:bg-green-50'
            }`}
          >
            <svg className="w-10 h-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm text-gray-600">
              {uploadLoading ? 'Uploading & processing…' : 'Click to choose a PDF (max 5 MB)'}
            </span>
            <input
              ref={fileRef}
              id="file-upload"
              type="file"
              accept=".pdf"
              disabled={uploadLoading}
              onChange={handleUpload}
              className="hidden"
            />
          </label>

          {uploadMsg && (
            <p className={`mt-3 text-sm ${uploadMsg.ok ? 'text-green-700' : 'text-red-600'}`}>
              {uploadMsg.ok ? '✓ ' : '✗ '}{uploadMsg.text}
            </p>
          )}
        </div>

        {/* ── Document list card ───────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">
              Knowledge Base
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({docs.length} document{docs.length !== 1 ? 's' : ''})
              </span>
            </h2>
            <button onClick={fetchDocs} className="text-sm text-kwsp-green hover:underline">
              Refresh
            </button>
          </div>

          {docsLoading ? (
            <p className="text-center py-10 text-gray-400 text-sm">Loading…</p>
          ) : docs.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-400 text-sm">No documents uploaded yet.</p>
              <p className="text-gray-400 text-xs mt-1">
                Upload KWSP PDFs above to improve AI response accuracy.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {docs.map(doc => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div className="min-w-0 mr-4">
                    <p className="text-sm font-medium text-gray-800 truncate">{doc.filename}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {doc.chunkCount} chunks ·{' '}
                      {new Date(doc.uploadedAt).toLocaleDateString('en-MY', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(doc)}
                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Info card ────────────────────────────────────────────── */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm">
          <p className="font-semibold text-blue-800 mb-2">How RAG works in this chatbot</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-700 text-sm">
            <li>You upload a KWSP PDF document here</li>
            <li>Text is extracted and split into 200-word chunks</li>
            <li>Each chunk is indexed using TF-IDF keyword vectors</li>
            <li>When a user asks a question, the top-3 relevant chunks are retrieved</li>
            <li>The AI answers using those chunks as context + its general KWSP knowledge</li>
          </ol>
          <p className="mt-3 text-blue-600 text-xs">
            To update the OpenRouter API key or model, go to your{' '}
            <strong>Vercel dashboard → Project → Settings → Environment Variables</strong>.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page root — handles auth state
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setToken(localStorage.getItem('admin_token'))
    setMounted(true)
  }, [])

  const handleLogin = (t: string) => {
    localStorage.setItem('admin_token', t)
    setToken(t)
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    setToken(null)
  }

  // Avoid hydration mismatch — render nothing until localStorage is read
  if (!mounted) return null

  return token
    ? <Dashboard token={token} onLogout={handleLogout} />
    : <LoginForm onLogin={handleLogin} />
}
