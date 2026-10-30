import { memo } from 'react'
import { VscClose, VscSearch } from 'react-icons/vsc'

const selectClass =
  'w-full rounded border border-line bg-surface px-1.5 py-1 text-xs text-ink'

function SearchBar({ query, onQueryChange, filters, onFiltersChange }) {
  const change = (key, convert = (value) => value) => (event) =>
    onFiltersChange({ [key]: convert(event.target.value) })

  return (
    <div className="space-y-2 border-b border-line p-3">
      <div className="relative">
        <VscSearch size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search files and folders"
          aria-label="Search"
          className="w-full rounded border border-line bg-canvas py-1.5 pl-7 pr-7 text-sm text-ink placeholder:text-ink-muted"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-muted hover:text-ink"
          >
            <VscClose size={14} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select aria-label="Filter by type" value={filters.type} onChange={change('type')} className={selectClass}>
          <option value="all">All</option>
          <option value="file">Files</option>
          <option value="folder">Folders</option>
        </select>
        <select aria-label="Sort by" value={filters.sortBy} onChange={change('sortBy')} className={selectClass}>
          <option value="name">Sort: Name</option>
          <option value="type">Sort: Type</option>
          <option value="path">Sort: Location</option>
        </select>
        <select aria-label="Sort order" value={filters.sortOrder} onChange={change('sortOrder')} className={selectClass}>
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
        <select aria-label="Results per page" value={filters.pageSize} onChange={change('pageSize', Number)} className={selectClass}>
          <option value={10}>10 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
        </select>
      </div>
    </div>
  )
}

export default memo(SearchBar)