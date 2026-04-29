/**
 * Simple in-memory rate limiter.
 * Resets on cold starts — good enough for basic abuse prevention.
 * For strict production rate limiting, swap this for Upstash Redis.
 */

interface Entry {
  count: number
  resetAt: number
}

const store = new Map<string, Entry>()

const MAX_REQUESTS = 20       // per window
const WINDOW_MS = 60 * 1000  // 1 minute

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function checkRateLimit(identifier: string): RateLimitResult {
  const now = Date.now()
  const entry = store.get(identifier)

  if (!entry || now >= entry.resetAt) {
    const fresh: Entry = { count: 1, resetAt: now + WINDOW_MS }
    store.set(identifier, fresh)
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt: fresh.resetAt }
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: MAX_REQUESTS - entry.count, resetAt: entry.resetAt }
}

export function getClientIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}
