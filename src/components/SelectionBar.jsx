import { memo, useState } from 'react'
import { useIsPending } from '../context/FeedbackContext'
import { useCheckedCount, useMultiSelectActions } from '../context/MultiSelectContext'
import { useBulkDelete } from '../hooks/useBulkDelete'

const linkButton = 'rounded px-2 py-0.5 hover:bg-surface-hover disabled:opacity-40'

function SelectionBar() {
  const count = useCheckedCount()
  const { clear } = useMultiSelectActions()
  const deleteChecked = useBulkDelete()
  const pending = useIsPending()
  const [confirming, setConfirming] = useState(false)

  if (count === 0) return null

  const confirmDelete = async () => {
    await deleteChecked()
    setConfirming(false)
  }

  const clearAll = () => {
    setConfirming(false)
    clear()
  }

  return (
    <div
      role="region"
      aria-label="Selection"
      className="flex items-center justify-between gap-2 border-b border-line bg-accent-soft px-3 py-1.5 text-xs text-ink"
    >
      <span>{count} selected</span>
      {confirming ? (
        <div className="flex items-center gap-1">
          <span>Delete {count}?</span>
          <button type="button" onClick={confirmDelete} disabled={pending} className="rounded bg-danger px-2 py-0.5 text-on-accent disabled:opacity-40">
            Delete
          </button>
          <button type="button" onClick={() => setConfirming(false)} disabled={pending} className={linkButton}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setConfirming(true)} className={`${linkButton} text-danger`}>
            Delete selected
          </button>
          <button type="button" onClick={clearAll} className={linkButton}>
            Clear
          </button>
        </div>
      )}
    </div>
  )
}

export default memo(SelectionBar)