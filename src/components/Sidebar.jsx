import { FileTree } from './FileTree/FileTree'
import { Toolbar } from './Toolbar/Toolbar'
import SearchBar from './Search/SearchBar'
import SearchResults from './Search/SearchResults'
import { useSearch } from '../hooks/useSearch'

function Sidebar() {
  const { query, setQuery, activeQuery, filters, setFilters, setPage, result, isSearching } = useSearch()

  return (
    <aside className="flex max-h-[50vh] w-full shrink-0 flex-col border-b border-line bg-surface md:max-h-none md:w-80 md:border-b-0 md:border-r">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-line px-3">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Explorer</span>
        <Toolbar />
      </div>
      <SearchBar query={query} onQueryChange={setQuery} filters={filters} onFiltersChange={setFilters} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isSearching ? (
          <SearchResults result={result} query={activeQuery} onPageChange={setPage} />
        ) : (
          <FileTree />
        )}
      </div>
    </aside>
  )
}

export default Sidebar