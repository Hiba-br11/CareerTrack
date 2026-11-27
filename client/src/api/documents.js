import { api } from './client.js'

export const listDocuments = (params = {}, signal) => {
  const qs = new URLSearchParams(params).toString()
  return api.get(`/documents${qs ? `?${qs}` : ''}`, { signal })
}

// formData: file, type and (optional) applicationId
export const uploadDocument = (formData) => api.post('/documents', formData)
export const deleteDocument = (id) => api.delete(`/documents/${id}`)

// Plain link: the browser sends the session cookie, the server answers with Content-Disposition: attachment
export const downloadUrl = (id) => `/api/documents/${id}/download`
