import { Link } from 'react-router-dom'
import { TYPE_LABELS } from '../../utils/constants.js'
import { formatDate } from '../../utils/format.js'
import StatusBadge from './StatusBadge.jsx'

export default function ApplicationsTable({ applications, onDelete }) {
  return (
    // overflow-x-auto: the table scrolls inside its box on small screens, not the whole page
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-3">Entreprise</th>
            <th scope="col" className="px-4 py-3">Poste</th>
            <th scope="col" className="px-4 py-3">Type</th>
            <th scope="col" className="px-4 py-3">Date</th>
            <th scope="col" className="px-4 py-3">Statut</th>
            <th scope="col" className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {applications.map((app) => (
            <tr key={app.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{app.company?.name}</td>
              <td className="px-4 py-3">
                <Link to={`/applications/${app.id}`} className="text-indigo-600 hover:underline">
                  {app.jobTitle}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-600">{TYPE_LABELS[app.applicationType]}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(app.applicationDate)}</td>
              <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <Link to={`/applications/${app.id}/edit`} className="mr-4 text-slate-600 hover:text-indigo-600">
                  Modifier
                </Link>
                <button type="button" className="text-red-600 hover:underline" onClick={() => onDelete(app)}>
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
