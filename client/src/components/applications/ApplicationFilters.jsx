import { useEffect, useState } from 'react'
import { useDebounce } from '../../hooks/useDebounce.js'
import { SORT_LABELS, STATUS_LABELS, TYPE_LABELS } from '../../utils/constants.js'
import { btnSecondary, inputClass } from '../../utils/styles.js'

// `params` is a URLSearchParams: the URL is the single source of truth for the filters,
// so a refresh or the back button keeps them.
export default function ApplicationFilters({ params, onChange, onReset }) {
  const urlSearch = params.get('search') ?? ''
  const [searchInput, setSearchInput] = useState(urlSearch)
  const debouncedSearch = useDebounce(searchInput, 400)

  // Push the typed text to the URL only once the user paused, and only if it changed
  // (otherwise the first render would erase the ?page= parameter).
  useEffect(() => {
    if (debouncedSearch !== urlSearch) onChange('search', debouncedSearch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  // Keep the box in sync when the URL changes from outside (reset button, back button)
  useEffect(() => {
    setSearchInput(urlSearch)
  }, [urlSearch])

  const hasFilters = ['search', 'status', 'type', 'from', 'to', 'sort'].some((k) => params.get(k))

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
      <div className="sm:col-span-2">
        <label htmlFor="f-search" className="mb-1 block text-xs font-medium text-slate-600">
          Recherche
        </label>
        <input
          id="f-search"
          type="search"
          placeholder="Entreprise ou poste"
          className={inputClass}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="f-status" className="mb-1 block text-xs font-medium text-slate-600">
          Statut
        </label>
        <select
          id="f-status"
          className={inputClass}
          value={params.get('status') ?? ''}
          onChange={(e) => onChange('status', e.target.value)}
        >
          <option value="">Tous</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="f-type" className="mb-1 block text-xs font-medium text-slate-600">
          Type
        </label>
        <select
          id="f-type"
          className={inputClass}
          value={params.get('type') ?? ''}
          onChange={(e) => onChange('type', e.target.value)}
        >
          <option value="">Tous</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="f-from" className="mb-1 block text-xs font-medium text-slate-600">
          Du
        </label>
        <input
          id="f-from"
          type="date"
          className={inputClass}
          value={params.get('from') ?? ''}
          onChange={(e) => onChange('from', e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="f-to" className="mb-1 block text-xs font-medium text-slate-600">
          Au
        </label>
        <input
          id="f-to"
          type="date"
          className={inputClass}
          value={params.get('to') ?? ''}
          onChange={(e) => onChange('to', e.target.value)}
        />
      </div>

      <div className="sm:col-span-2 lg:col-span-3">
        <label htmlFor="f-sort" className="mb-1 block text-xs font-medium text-slate-600">
          Trier par
        </label>
        <select
          id="f-sort"
          className={inputClass}
          value={params.get('sort') ?? 'date_desc'}
          onChange={(e) => onChange('sort', e.target.value)}
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-end sm:col-span-2 lg:col-span-3 lg:justify-end">
        <button type="button" className={btnSecondary} onClick={onReset} disabled={!hasFilters}>
          Réinitialiser
        </button>
      </div>
    </div>
  )
}
