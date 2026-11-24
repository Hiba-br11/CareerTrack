import { api } from './client.js'

export function listApplications(params, signal) {
  const qs = new URLSearchParams(params).toString()
  return api.get(`/applications${qs ? `?${qs}` : ''}`, { signal })
}

export const getApplication = (id, signal) => api.get(`/applications/${id}`, { signal })
export const createApplication = (data) => api.post('/applications', data)
export const updateApplication = (id, data) => api.patch(`/applications/${id}`, data)
export const deleteApplication = (id) => api.delete(`/applications/${id}`)
