// The API sends dates as "2026-11-19T00:00:00.000Z".
// timeZone: 'UTC' keeps the calendar day the user typed, whatever the browser time zone.
export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'UTC' })
}

// For <input type="date">, which needs "YYYY-MM-DD"
export function toDateInput(iso) {
  return iso ? iso.slice(0, 10) : ''
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

// Only http(s) links may be rendered as <a href>
export function isSafeUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url)
}

export function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`
  return `${(bytes / 1024 / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`
}
