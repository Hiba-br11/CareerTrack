import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteApplication, getApplication, updateApplication } from '../api/applications.js'
import StatusBadge from '../components/applications/StatusBadge.jsx'
import StatusTimeline from '../components/applications/StatusTimeline.jsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx'
import { STATUS_LABELS, TYPE_LABELS } from '../utils/constants.js'
import { formatDate, isSafeUrl } from '../utils/format.js'
import { btnSecondary, btnDanger, inputClass } from '../utils/styles.js'

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{children || '—'}</dd>
    </div>
  )
}

export default function ApplicationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [application, setApplication] = useState(null)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getApplication(id, controller.signal)
      .then((data) => {
        setApplication(data)
        setError('')
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
    return () => controller.abort()
  }, [id, reloadKey])

  async function changeStatus(status) {
    setBusy(true)
    try {
      await updateApplication(id, { status })
      setReloadKey((k) => k + 1) // reload so the timeline shows the new entry
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    try {
      await deleteApplication(id)
      navigate('/applications')
    } catch (err) {
      setConfirmOpen(false)
      setError(err.message)
      setBusy(false)
    }
  }

  if (error && !application) {
    return (
      <main className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        <Link to="/applications" className="text-sm text-indigo-600 hover:underline">← Retour à la liste</Link>
      </main>
    )
  }
  if (!application) return <p className="p-6 text-sm text-slate-500">Chargement…</p>

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <Link to="/applications" className="text-sm text-indigo-600 hover:underline">← Retour à la liste</Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{application.jobTitle}</h1>
          <p className="mt-1 text-slate-600">{application.company?.name}</p>
        </div>
        <div className="flex gap-3">
          <Link to={`/applications/${application.id}/edit`} className={btnSecondary}>Modifier</Link>
          <button type="button" className={btnDanger} onClick={() => setConfirmOpen(true)}>Supprimer</button>
        </div>
      </header>

      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="grid gap-6 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-[2fr_1fr]">
        <dl className="grid gap-5 sm:grid-cols-2">
          <Detail label="Statut"><StatusBadge status={application.status} /></Detail>
          <Detail label="Type">{TYPE_LABELS[application.applicationType]}</Detail>
          <Detail label="Date de candidature">{formatDate(application.applicationDate)}</Detail>
          <Detail label="Date de relance">{application.followUpDate ? formatDate(application.followUpDate) : null}</Detail>
          <Detail label="Lien de l’offre">
            {isSafeUrl(application.offerUrl) ? (
              <a
                href={application.offerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-indigo-600 hover:underline"
              >
                {application.offerUrl}
              </a>
            ) : null}
          </Detail>
          <Detail label="Site de l’entreprise">
            {isSafeUrl(application.company?.website) ? (
              <a
                href={application.company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-indigo-600 hover:underline"
              >
                {application.company.website}
              </a>
            ) : null}
          </Detail>
          <div className="sm:col-span-2">
            <Detail label="Description">
              {application.description && <span className="whitespace-pre-wrap">{application.description}</span>}
            </Detail>
          </div>
          <div className="sm:col-span-2">
            <Detail label="Notes">
              {application.notes && <span className="whitespace-pre-wrap">{application.notes}</span>}
            </Detail>
          </div>
        </dl>

        <aside>
          <label htmlFor="quick-status" className="mb-1 block text-sm font-medium text-slate-700">
            Changer le statut
          </label>
          <select
            id="quick-status"
            className={inputClass}
            value={application.status}
            disabled={busy}
            onChange={(e) => changeStatus(e.target.value)}
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </aside>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Historique des statuts</h2>
        <StatusTimeline history={application.history} />
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="Supprimer cette candidature ?"
        message="Elle et son historique seront supprimés définitivement."
        loading={busy}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </main>
  )
}
