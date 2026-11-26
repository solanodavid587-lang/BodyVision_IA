const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

let tokenProvider: (() => Promise<string>) | undefined
export function setTokenProvider(provider?: () => Promise<string>) { tokenProvider = provider }

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData
  const accessToken = tokenProvider ? await tokenProvider() : undefined
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: { ...(isFormData ? {} : { 'Content-Type': 'application/json' }), ...options.headers, ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.detail?.message || (typeof body.detail === 'string' && body.detail) || `Error HTTP ${response.status}`)
  }
  return response.status === 204 ? (undefined as T) : response.json()
}
