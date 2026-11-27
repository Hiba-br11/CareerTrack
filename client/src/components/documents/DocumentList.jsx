import { Link } from 'react-router-dom'
import { downloadUrl } from '../../api/documents.js'
import { DOCUMENT_TYPE_LABELS } from '../../utils/constants.js'
import { formatDateTime, formatSize } from '../../utils/format.js'

export default function DocumentList({ documents, showApplication = false, onDelete }) {
  if (documents.length === 0) return <p className="text-sm text-slate-500">Aucun document.</p>

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-3">Nom</th>
            <th scope="col" className="px-4 py-3">Type</th>
            {showApplication && <th scope="col" className="px-4 py-3">Candidature</th>}
            <th scope="col" className="px-4 py-3">Taille</th>
            <th scope="col" className="px-4 py-3">Ajouté le</th>
            <th scope="col" className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {documents.map((doc) => (
            <tr key={doc.id}>
              {/* React escapes the name: a file called "<script>.pdf" is shown as text */}
              <td className="break-all px-4 py-3 font-medium text-slate-900">{doc.fileName}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{DOCUMENT_TYPE_LABELS[doc.fileType]}</td>
              {showApplication && (
                <td className="px-4 py-3">
                  {doc.application ? (
                    <Link to={`/applications/${doc.application.id}`} className="text-indigo-600 hover:underline">
                      {doc.application.jobTitle}
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              )}
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatSize(doc.sizeBytes)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(doc.uploadedAt)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <a href={downloadUrl(doc.id)} className="mr-4 text-indigo-600 hover:underline">
                  Télécharger
                </a>
                <button type="button" className="text-red-600 hover:underline" onClick={() => onDelete(doc)}>
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
