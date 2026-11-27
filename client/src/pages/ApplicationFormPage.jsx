import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createApplication, getApplication, updateApplication } from '../api/applications.js'
import { listCompanies } from '../api/companies.js'
import ApplicationForm from '../components/applications/ApplicationForm.jsx'
import { EMPTY_FORM } from '../utils/constants.js'
import { toDateInput } from '../utils/format.js'

// The same page serves /applications/new (create) and /applications/:id/edit (update)
export default function ApplicationFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [companies, setCompanies] = useState([])
  const [initialValues, setInitialValues] = useState(isEdit ? null : EMPTY_FORM)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    Promise.all([listCompanies(signal), isEdit ? getApplication(id, signal) : null])
      .then(([companyList, application]) => {
        setCompanies(companyList)
        if (application) {
          setInitialValues({
            companyId: String(application.companyId),
            jobTitle: application.jobTitle,
            applicationType: application.applicationType,
            applicationDate: toDateInput(application.applicationDate),
            status: application.status,
            offerUrl: application.offerUrl ?? '',
            description: application.description ?? '',
            notes: application.notes ?? '',
            followUpDate: toDateInput(application.followUpDate),
          })
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setLoadError(err.message)
      })
    return () => controller.abort()
  }, [id, isEdit])

  async function handleSubmit(payload) {
    setSubmitting(true)
    setFormError('')
    setFieldErrors({})
    try {
      const saved = isEdit ? await updateApplication(id, payload) : await createApplication(payload)
      navigate(`/applications/${saved.id}`)
    } catch (err) {
      // Server validation errors [{ field, message }] -> shown under the matching field
      if (err.errors?.length) {
        setFieldErrors(Object.fromEntries(err.errors.map((e) => [e.field, e.message])))
      }
      setFormError(err.message)
      setSubmitting(false)
    }
  }

  const backTo = isEdit ? `/applications/${id}` : '/applications'

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header>
        <Link to={backTo} className="text-sm text-indigo-600 hover:underline">← Retour</Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {isEdit ? 'Modifier la candidature' : 'Nouvelle candidature'}
        </h1>
      </header>

      {loadError && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}

      {!loadError && !initialValues && <p className="text-sm text-slate-500">Chargement…</p>}

      {initialValues && !loadError && (
        <>
          {companies.length === 0 && (
            <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              Aucune entreprise enregistrée. Ajoutez d’abord une entreprise pour pouvoir créer une candidature.
            </p>
          )}
          {formError && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
          <ApplicationForm
            initialValues={initialValues}
            companies={companies}
            serverErrors={fieldErrors}
            submitting={submitting}
            submitLabel={isEdit ? 'Enregistrer' : 'Créer la candidature'}
            cancelTo={backTo}
            onSubmit={handleSubmit}
          />
        </>
      )}
    </main>
  )
}
