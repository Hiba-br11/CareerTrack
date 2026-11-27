import { useState } from 'react'
import { Link } from 'react-router-dom'
import FormField from '../ui/FormField.jsx'
import { EMPTY_FORM, STATUS_LABELS, TYPE_LABELS } from '../../utils/constants.js'
import { btnPrimary, btnSecondary, inputClass } from '../../utils/styles.js'

// Same rules as the server validator: this is for fast feedback, the server stays the real guard
function validate(v) {
  const errors = {}
  if (!v.companyId) errors.companyId = 'Choisissez une entreprise'
  if (v.jobTitle.trim().length < 2) errors.jobTitle = 'Le poste doit contenir au moins 2 caractères'
  else if (v.jobTitle.trim().length > 150) errors.jobTitle = '150 caractères maximum'
  if (!v.applicationType) errors.applicationType = 'Choisissez un type'
  if (!v.applicationDate) errors.applicationDate = 'La date de candidature est requise'
  if (v.offerUrl.trim() && !/^https?:\/\//i.test(v.offerUrl.trim())) {
    errors.offerUrl = 'Le lien doit commencer par http:// ou https://'
  }
  if (v.description.length > 5000) errors.description = '5000 caractères maximum'
  if (v.notes.length > 5000) errors.notes = '5000 caractères maximum'
  return errors
}

export default function ApplicationForm({
  initialValues = EMPTY_FORM,
  companies,
  serverErrors = {},
  submitting = false,
  submitLabel,
  cancelTo,
  onSubmit,
}) {
  const [values, setValues] = useState(initialValues)
  const [clientErrors, setClientErrors] = useState({})

  const errors = { ...serverErrors, ...clientErrors }

  function handleChange(e) {
    const { name, value } = e.target
    setValues((v) => ({ ...v, [name]: value }))
    // the error of a field disappears as soon as the user edits it
    setClientErrors((errs) => ({ ...errs, [name]: undefined }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const found = validate(values)
    setClientErrors(found)
    if (Object.keys(found).length > 0) return

    onSubmit({
      companyId: Number(values.companyId),
      jobTitle: values.jobTitle.trim(),
      applicationType: values.applicationType,
      applicationDate: values.applicationDate,
      status: values.status,
      offerUrl: values.offerUrl.trim(),
      description: values.description,
      notes: values.notes,
      followUpDate: values.followUpDate,
    })
  }

  const describedBy = (name) => (errors[name] ? `${name}-error` : undefined)

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 rounded-lg border border-slate-200 bg-white p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="companyId" label="Entreprise" required error={errors.companyId}>
          <select
            id="companyId"
            name="companyId"
            className={inputClass}
            value={values.companyId}
            onChange={handleChange}
            aria-invalid={Boolean(errors.companyId)}
            aria-describedby={describedBy('companyId')}
          >
            <option value="">Choisir…</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </FormField>

        <FormField id="jobTitle" label="Poste" required error={errors.jobTitle}>
          <input
            id="jobTitle"
            name="jobTitle"
            type="text"
            className={inputClass}
            value={values.jobTitle}
            onChange={handleChange}
            aria-invalid={Boolean(errors.jobTitle)}
            aria-describedby={describedBy('jobTitle')}
          />
        </FormField>

        <FormField id="applicationType" label="Type" required error={errors.applicationType}>
          <select
            id="applicationType"
            name="applicationType"
            className={inputClass}
            value={values.applicationType}
            onChange={handleChange}
            aria-invalid={Boolean(errors.applicationType)}
            aria-describedby={describedBy('applicationType')}
          >
            <option value="">Choisir…</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </FormField>

        <FormField id="status" label="Statut" error={errors.status}>
          <select id="status" name="status" className={inputClass} value={values.status} onChange={handleChange}>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </FormField>

        <FormField id="applicationDate" label="Date de candidature" required error={errors.applicationDate}>
          <input
            id="applicationDate"
            name="applicationDate"
            type="date"
            className={inputClass}
            value={values.applicationDate}
            onChange={handleChange}
            aria-invalid={Boolean(errors.applicationDate)}
            aria-describedby={describedBy('applicationDate')}
          />
        </FormField>

        <FormField id="followUpDate" label="Date de relance" error={errors.followUpDate}>
          <input
            id="followUpDate"
            name="followUpDate"
            type="date"
            className={inputClass}
            value={values.followUpDate}
            onChange={handleChange}
            aria-describedby={describedBy('followUpDate')}
          />
        </FormField>
      </div>

      <FormField id="offerUrl" label="Lien de l’offre" error={errors.offerUrl}>
        <input
          id="offerUrl"
          name="offerUrl"
          type="url"
          placeholder="https://…"
          className={inputClass}
          value={values.offerUrl}
          onChange={handleChange}
          aria-invalid={Boolean(errors.offerUrl)}
          aria-describedby={describedBy('offerUrl')}
        />
      </FormField>

      <FormField id="description" label="Description de l’offre" error={errors.description}>
        <textarea
          id="description"
          name="description"
          rows={4}
          className={inputClass}
          value={values.description}
          onChange={handleChange}
          aria-describedby={describedBy('description')}
        />
      </FormField>

      <FormField id="notes" label="Notes personnelles" error={errors.notes}>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className={inputClass}
          value={values.notes}
          onChange={handleChange}
          aria-describedby={describedBy('notes')}
        />
      </FormField>

      <div className="flex justify-end gap-3">
        <Link to={cancelTo} className={btnSecondary}>Annuler</Link>
        <button type="submit" className={btnPrimary} disabled={submitting}>
          {submitting ? 'Enregistrement…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
