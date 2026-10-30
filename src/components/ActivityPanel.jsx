import { memo } from 'react'
import { VscAdd, VscArrowRight, VscEdit, VscLayers, VscTrash } from 'react-icons/vsc'
import { useActivity } from '../context/ActivityContext'

const icons = {
  create: VscAdd,
  rename: VscEdit,
  move: VscArrowRight,
  delete: VscTrash,
  transaction: VscLayers,
}

const formatTime = (time) =>
  new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

function ActivityPanel() {
  const { entries, clear } = useActivity()

  return (
    <section aria-label="Recent activity" className="flex h-56 shrink-0 flex-col border-t border-line bg-surface">
      <div className="flex items-center justify-between px-4 py-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-ink-muted">Activity</h2>
        <button
          type="button"
          onClick={clear}
          disabled={entries.length === 0}
          className="rounded px-2 py-0.5 text-xs text-ink-muted hover:bg-surface-hover hover:text-ink disabled:opacity-40"
        >
          Clear
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="px-4 text-sm text-ink-muted">No changes yet.</p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {entries.map((entry) => {
            const Icon = icons[entry.type] ?? VscLayers
            return (
              <li key={entry.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm">
                <Icon size={14} className="shrink-0 text-ink-muted" />
                <span className="min-w-0 flex-1 truncate text-ink">{entry.text}</span>
                <time className="shrink-0 text-xs text-ink-muted">{formatTime(entry.time)}</time>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default memo(ActivityPanel)