import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { deleteApplication, listApplications } from '../api/applications.js'
import ApplicationFilters from '../components/applications/ApplicationFilters.jsx'
import ApplicationsTable from '../components/applications/ApplicationsTable.jsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx'
import Pagination from '../components/ui/Pagination.jsx'
import { btnPrimary } from '../utils/styles.js'

export default function ApplicationsListPage() {
  const [params, setParams] = useSearchParams()
  const [result, setResult] = useState(null) // { data, total, page, totalPages }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const query = params.toString()

  // Fetch whenever the filters/page in the URL change (or after a delete)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    listApplications(Object.fromEntries(new URLSearchParams(query)), controller.signal)
      .then(setResult)
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => {
        // an aborted request must not switch the spinner off for the newer one
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort() // a newer request cancels the previous one
  }, [query, reloadKey])

  // Deleted the last row of the last page: go back to the new last page
  useEffect(() => {
    if (result && result.data.length === 0 && result.total > 0 && result.page > 1) {
      updateParam('page', String(result.totalPages))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  function updateParam(key, value) {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      if (key !== 'page') next.delete('page') // a new filter restarts at page 1
      return next
    })
  }

  async function confirmDelete() {
    setDeleting(true)
    try {
      await deleteApplication(toDelete.id)
      setToDelete(null)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setToDelete(null)
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const hasFilters = ['search', 'status', 'type', 'from', 'to'].some((k) => params.get(k))

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Mes candidatures</h1>
        <Link to="/applications/new" className={btnPrimary}>Nouvelle candidature</Link>
      </header>

      <ApplicationFilters params={params} onChange={updateParam} onReset={() => setParams({})} />

      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {loading && !result && <p className="text-sm text-slate-500">Chargement…</p>}

      {result && (
        <div className={loading ? 'opacity-60 transition-opacity' : ''}>
          {result.total === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-slate-700">
                {hasFilters ? 'Aucune candidature ne correspond à ces filtres.' : 'Vous n’avez encore aucune candidature.'}
              </p>
              {!hasFilters && (
                <Link to="/applications/new" className={`${btnPrimary} mt-4`}>Ajouter ma première candidature</Link>
              )}
            </div>
          ) : (
            <>
              <ApplicationsTable applications={result.data} onDelete={setToDelete} />
              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                total={result.total}
                onPageChange={(p) => updateParam('page', String(p))}
              />
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Supprimer cette candidature ?"
        message={
          toDelete
            ? `« ${toDelete.jobTitle} » chez ${toDelete.company?.name} et son historique seront supprimés définitivement.`
            : ''
        }
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </main>
  )
}
