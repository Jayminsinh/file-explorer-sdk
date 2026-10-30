import { memo, useCallback, useMemo } from 'react'
import { VscFile, VscFolder } from 'react-icons/vsc'
import { useFileExplorerTree } from '../../hooks/useFileExplorer'
import { useSelectedId, useUiActions } from '../../context/UiStateContext'
import { getAncestors, indexTree } from '../../utils/tree'

function Highlight({ text, query }) {
  const term = query.trim().toLowerCase()
  const start = text.toLowerCase().indexOf(term)
  if (!term || start === -1) return text
  const end = start + term.length
  return (
    <>
      {text.slice(0, start)}
      <mark className="rounded-sm bg-accent-soft text-ink">{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  )
}

function SearchResults({ result, query, onPageChange }) {
  const tree = useFileExplorerTree()
  const selectedId = useSelectedId()
  const { select, setExpanded } = useUiActions()
  const index = useMemo(() => indexTree(tree), [tree])

  const open = useCallback(
    (item) => {
      getAncestors(index, item.id).forEach((ancestor) => setExpanded(ancestor.id, true))
      select(item.id)
    },
    [index, select, setExpanded]
  )

  if (!result) return <p className="p-3 text-sm text-ink-muted">Searching…</p>

  if (result.error) {
    return (
      <p role="alert" className="p-3 text-sm text-danger">
        {result.error}
      </p>
    )
  }

  const { items, total, page, totalPages } = result.data

  if (total === 0) {
    return <p className="p-3 text-sm text-ink-muted">No results for “{query.trim()}”.</p>
  }

  return (
    <div>
      <p className="px-3 py-2 text-xs text-ink-muted">
        {total} result{total > 1 ? 's' : ''}
      </p>

      <ul>
        {items.map((item) => {
          const Icon = item.type === 'folder' ? VscFolder : VscFile
          const isSelected = item.id === selectedId
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => open(item)}
                aria-current={isSelected}
                className={`flex w-full items-start gap-2 px-3 py-1.5 text-left hover:bg-surface-hover ${
                  isSelected ? 'bg-accent-soft' : ''
                }`}
              >
                <Icon size={16} className={`mt-0.5 shrink-0 ${item.type === 'folder' ? 'text-accent' : 'text-ink-muted'}`} />
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ink">
                    <Highlight text={item.name} query={query} />
                  </span>
                  <span className="block truncate text-xs text-ink-muted">
                    {item.type === 'folder' ? 'Folder' : 'File'} · {item.location || 'Root'}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="flex items-center justify-between border-t border-line px-3 py-2 text-xs text-ink-muted">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded px-2 py-1 hover:bg-surface-hover disabled:opacity-40"
        >
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded px-2 py-1 hover:bg-surface-hover disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default memo(SearchResults)