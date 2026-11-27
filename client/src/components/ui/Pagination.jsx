import { btnSecondary } from '../../utils/styles.js'

export default function Pagination({ page, totalPages, total, onPageChange }) {
  if (totalPages <= 1) {
    return <p className="mt-4 text-sm text-slate-500">{total} résultat{total > 1 ? 's' : ''}</p>
  }
  return (
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-3" aria-label="Pagination">
      <p className="text-sm text-slate-500">
        {total} résultats · page {page} sur {totalPages}
      </p>
      <div className="flex gap-2">
        <button className={btnSecondary} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Précédent
        </button>
        <button
          className={btnSecondary}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Suivant
        </button>
      </div>
    </nav>
  )
}
