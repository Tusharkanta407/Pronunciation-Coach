import { Results } from '@/context/AssessmentContext'
import { AssessmentMode } from '@/lib/levels'
import { ApiError, formatApiError } from '@/lib/apiError'

// Browser: same-origin proxy via next.config.mjs rewrites (no CORS issues).
// Override with NEXT_PUBLIC_API_URL only if you call the API directly.
const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

async function parseError(res: Response): Promise<string> {
  const text = await res.text()
  try {
    const data = JSON.parse(text) as { detail?: unknown }
    const detail = data.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      return detail
        .map((item: { msg?: string }) => item?.msg)
        .filter(Boolean)
        .join(' ')
    }
    if (detail && typeof detail === 'object') {
      return JSON.stringify(detail)
    }
  } catch {
    /* not JSON — use raw body below */
  }
  const trimmed = text.trim()
  if (trimmed) return trimmed.slice(0, 600)
  return res.statusText || `Request failed (${res.status})`
}

async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init)
  } catch (err) {
    throw new ApiError(formatApiError(err), 'network')
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Ping /health until the Render (or local) backend is awake.
 * Free-tier hosts sleep after idle — first hit can take 30–90s.
 */
export async function wakeBackend(
  onAttempt?: (attempt: number, elapsedMs: number) => void,
  options?: { timeoutMs?: number; intervalMs?: number }
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? 120_000
  const intervalMs = options?.intervalMs ?? 2_500
  const started = Date.now()
  let attempt = 0

  while (Date.now() - started < timeoutMs) {
    attempt += 1
    onAttempt?.(attempt, Date.now() - started)
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 15_000)
      const res = await fetch(`${API_URL}/health`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (res.ok) {
        const data = (await res.json().catch(() => null)) as { status?: string } | null
        if (!data || data.status === 'ok' || res.status === 200) {
          return
        }
      }
    } catch {
      /* still sleeping / network blip — keep polling */
    }
    await sleep(intervalMs)
  }

  throw new ApiError(
    'The server is taking too long to wake up. Please wait a minute and try again.',
    'network'
  )
}

export async function sessionExists(sessionId: string): Promise<boolean> {
  const res = await apiFetch(`${API_URL}/api/session/${sessionId}`)
  return res.ok
}

export async function createSession(): Promise<string> {
  const res = await apiFetch(`${API_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consent: true }),
  })
  if (!res.ok) throw new ApiError(await parseError(res), res.status >= 500 ? 'server' : 'client')
  const data = await res.json()
  return data.session_id as string
}

/**
 * Reuse the in-memory session if it is still alive, otherwise create a fresh
 * one. Nothing is ever persisted in the browser, so a reload / "back" always
 * starts clean — no stale mistakes from a previous run.
 */
export async function ensureSession(existingId: string | null): Promise<string> {
  if (existingId && (await sessionExists(existingId))) {
    return existingId
  }
  return createSession()
}

export async function deleteSession(sessionId: string): Promise<void> {
  await apiFetch(`${API_URL}/api/session/${sessionId}`, { method: 'DELETE' })
}

export async function analyzeAudio(
  sessionId: string,
  mode: AssessmentMode,
  audio: Blob,
  filename = 'recording.webm'
): Promise<Results> {
  const form = new FormData()
  form.append('session_id', sessionId)
  form.append('mode', mode)
  form.append('audio', audio, filename)

  const res = await apiFetch(`${API_URL}/api/analyze`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new ApiError(await parseError(res), res.status >= 500 ? 'server' : 'client')
  return res.json()
}

export async function verifyWord(
  sessionId: string,
  mode: AssessmentMode,
  word: string,
  audio: Blob
): Promise<{ passed: boolean; score: number; heard: string }> {
  const form = new FormData()
  form.append('session_id', sessionId)
  form.append('mode', mode)
  form.append('word', word)
  form.append('audio', audio, 'practice.webm')

  const res = await apiFetch(`${API_URL}/api/verify-word`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new ApiError(await parseError(res), res.status >= 500 ? 'server' : 'client')
  return res.json()
}

export function pronounceUrl(word: string): string {
  return `${API_URL}/api/pronounce/${encodeURIComponent(word)}`
}

export { API_URL }
export { formatApiError } from '@/lib/apiError'
