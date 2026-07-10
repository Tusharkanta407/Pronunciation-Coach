export type ApiErrorKind = 'network' | 'server' | 'client'

export class ApiError extends Error {
  readonly kind: ApiErrorKind

  constructor(message: string, kind: ApiErrorKind = 'server') {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
  }
}

function isNetworkFailure(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  return (
    msg === 'failed to fetch' ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed')
  )
}

/** Turn fetch / API failures into plain English for the UI. */
export function formatApiError(err: unknown): string {
  if (err instanceof ApiError) return err.message

  if (isNetworkFailure(err)) {
    return (
      'Cannot reach the pronunciation API.\n\n' +
      'Both servers must be running:\n' +
      '1. Frontend: npm run dev  (this page)\n' +
      '2. Backend:  cd backend && uvicorn main:app --reload --port 8000\n\n' +
      'Then refresh and try again.'
    )
  }

  if (err instanceof Error && err.message.trim()) {
    return err.message
  }

  return 'Something went wrong. Please try again.'
}
