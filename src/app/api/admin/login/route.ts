import { NextRequest, NextResponse } from 'next/server'
import { signToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body as { username?: string; password?: string }

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    const validUsername = process.env.ADMIN_USERNAME ?? 'admin'
    const validPassword = process.env.ADMIN_PASSWORD

    if (!validPassword) {
      return NextResponse.json({ error: 'Admin credentials not configured on the server' }, { status: 500 })
    }

    if (username !== validUsername || password !== validPassword) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    const token = await signToken({ username })
    return NextResponse.json({ token })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
