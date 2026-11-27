import { useRef, useState } from 'react'
import { uploadDocument } from '../../api/documents.js'
import FormField from '../ui/FormField.jsx'
import { ALLOWED_EXTENSIONS, DOCUMENT_TYPE_LABELS, MAX_UPLOAD_MB } from '../../utils/constants.js'
import { btnPrimary, inputClass } from '../../utils/styles.js'

// applications: options for the "Candidature" select (documents page); omit it when
// `applicationId` is fixed (detail page of one application).
export default function DocumentUploadForm({ applicationId, applications, onUploaded }) {
  const fileInput = useRef(null)
  const [file, setFile] = useState(null)
  const [type, setType] = useState('CV')
  const [chosenApplication, setChosenApplication] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  // Quick feedback only: the server re-checks type, content and size
  function checkFile(f) {
    if (!f) return 'Choisissez un fichier'
    const name = f.name.toLowerCase()
    if (!ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      return `Format non accepté (${ALLOWED_EXTENSIONS.join(', ')})`
    }
    if (f.size === 0) return 'Le fichier est vide'
    if (f.size > MAX_UPLOAD_MB * 1024 * 1024) return `Fichier trop volumineux (${MAX_UPLOAD_MB} Mo maximum)`
    return ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const problem = checkFile(file)
    if (problem) return setError(problem)

    const data = new FormData()
    data.append('file', file)
    data.append('type', type)
    const target = applicationId ?? chosenApplication
    if (target) data.append('applicationId', String(target))

    setUploading(true)
    setError('')
    try {
      await uploadDocument(data)
      setFile(null)
      if (fileInput.current) fileInput.current.value = '' // a file input cannot be reset through React state
      onUploaded?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="doc-file" label="Fichier" required>
          <input
            ref={fileInput}
            id="doc-file"
            type="file"
            accept={ALLOWED_EXTENSIONS.join(',')}
            onChange={(e) => {
              setFile(e.target.files[0] ?? null)
              setError('')
            }}
            className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
          />
        </FormField>

        <FormField id="doc-type" label="Type de document">
          <select id="doc-type" className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </FormField>

        {applications && (
          <FormField id="doc-application" label="Candidature associée (facultatif)">
            <select
              id="doc-application"
              className={inputClass}
              value={chosenApplication}
              onChange={(e) => setChosenApplication(e.target.value)}
            >
              <option value="">Aucune</option>
              {applications.map((a) => (
                <option key={a.id} value={a.id}>{a.jobTitle} — {a.company?.name}</option>
              ))}
            </select>
          </FormField>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Formats : {ALLOWED_EXTENSIONS.join(', ')} · {MAX_UPLOAD_MB} Mo maximum.
      </p>
      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end">
        <button type="submit" className={btnPrimary} disabled={uploading}>
          {uploading ? 'Envoi…' : 'Téléverser'}
        </button>
      </div>
    </form>
  )
}
