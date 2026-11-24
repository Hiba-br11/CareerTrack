import { useEffect, useRef } from 'react'
import { btnDanger, btnSecondary } from '../../utils/styles.js'

// Uses the native <dialog>: focus is trapped inside and Esc closes it, for free.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Supprimer',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      className="m-auto w-full max-w-md rounded-lg p-6 shadow-xl backdrop:bg-black/40"
    >
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" className={btnSecondary} onClick={onCancel} disabled={loading}>
          Annuler
        </button>
        <button type="button" className={btnDanger} onClick={onConfirm} disabled={loading}>
          {loading ? 'Suppression…' : confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
