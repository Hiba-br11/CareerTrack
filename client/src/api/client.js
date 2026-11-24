const BASE = '/api'

export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message)
    this.status = status
    this.errors = errors // [{ field, message }] for validation errors (400)
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let res
  try {
    res = await fetch(BASE + path, {
      method,
      signal,
      credentials: 'include', // sends the auth cookie once login exists
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err // cancelled on purpose, not a real error
    throw new ApiError(0, 'Serveur injoignable. Vérifiez que l’API est démarrée.')
  }

  if (res.status === 204) return null

  let data = null
  try {
    data = await res.json()
  } catch {
    // empty or non-JSON body
  }
  if (!res.ok) throw new ApiError(res.status, data?.message ?? 'Une erreur est survenue', data?.errors)
  return data
}

export const api = {
  get: (path, options) => request(path, options),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
}
