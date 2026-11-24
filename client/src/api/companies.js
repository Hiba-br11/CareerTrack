import { api } from './client.js'

// Contract with Eya: GET /api/companies returns the logged-in user's companies,
// either as an array or as { data: [...] }, each with at least { id, name }.
export async function listCompanies(signal) {
  const res = await api.get('/companies', { signal })
  return Array.isArray(res) ? res : (res?.data ?? [])
}
