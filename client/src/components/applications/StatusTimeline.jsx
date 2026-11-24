import { STATUS_LABELS } from '../../utils/constants.js'
import { formatDateTime } from '../../utils/format.js'

// history = rows of application_history, oldest first (the API already sorts them)
export default function StatusTimeline({ history }) {
  if (!history?.length) return <p className="text-sm text-slate-500">Aucun historique.</p>

  return (
    <ol className="relative ml-2 border-l border-slate-200">
      {history.map((entry) => (
        <li key={entry.id} className="mb-5 ml-5">
          <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-indigo-500" />
          <p className="text-sm font-medium text-slate-900">
            {entry.oldStatus
              ? `${STATUS_LABELS[entry.oldStatus]} → ${STATUS_LABELS[entry.newStatus]}`
              : `Créée avec le statut « ${STATUS_LABELS[entry.newStatus]} »`}
          </p>
          <time className="text-xs text-slate-500">{formatDateTime(entry.changedAt)}</time>
        </li>
      ))}
    </ol>
  )
}
