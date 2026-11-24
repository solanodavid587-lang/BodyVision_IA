const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: { ...(isFormData ? {} : { 'Content-Type': 'application/json' }), ...options.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.detail?.message || body.detail || `Error HTTP ${response.status}`)
  }
  return response.status === 204 ? (undefined as T) : response.json()
}
