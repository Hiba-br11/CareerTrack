import { useEffect, useState } from 'react'
import { listApplications } from '../api/applications.js'
import { deleteDocument, listDocuments } from '../api/documents.js'
import DocumentList from '../components/documents/DocumentList.jsx'
import DocumentUploadForm from '../components/documents/DocumentUploadForm.jsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState(null)
  const [applications, setApplications] = useState([])
  const [error, setError] = useState('')
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    listDocuments({}, controller.signal)
      .then((docs) => {
        setDocuments(docs)
        setError('')
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
    return () => controller.abort()
  }, [reloadKey])

  // Options of the "Candidature" select: the 50 most recent (the API maximum per page)
  useEffect(() => {
    const controller = new AbortController()
    listApplications({ limit: '50' }, controller.signal)
      .then((res) => setApplications(res.data))
      .catch(() => {}) // the select just stays empty; uploading without an application still works
    return () => controller.abort()
  }, [])

  async function confirmDelete() {
    setDeleting(true)
    try {
      await deleteDocument(toDelete.id)
      setToDelete(null)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setToDelete(null)
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Mes documents</h1>

      <section aria-labelledby="upload-title" className="space-y-3">
        <h2 id="upload-title" className="text-lg font-semibold text-slate-900">Ajouter un document</h2>
        <DocumentUploadForm applications={applications} onUploaded={() => setReloadKey((k) => k + 1)} />
      </section>

      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section aria-labelledby="list-title" className="space-y-3">
        <h2 id="list-title" className="text-lg font-semibold text-slate-900">Mes fichiers</h2>
        {documents ? (
          <DocumentList documents={documents} showApplication onDelete={setToDelete} />
        ) : (
          !error && <p className="text-sm text-slate-500">Chargement…</p>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Supprimer ce document ?"
        message={toDelete ? `« ${toDelete.fileName} » sera supprimé définitivement.` : ''}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </main>
  )
}
