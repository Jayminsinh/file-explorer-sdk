import { useCallback, useMemo, useState } from 'react'
import { useExplorer } from '../context/ExplorerContext'
import { useFileExplorerTree } from './useFileExplorer'
import { useDebouncedValue } from './useDebouncedValue'

const DEFAULT_FILTERS = { type: 'all', sortBy: 'name', sortOrder: 'asc', pageSize: 10 }

export function useSearch() {
  const explorer = useExplorer()
  const tree = useFileExplorerTree()
  const [query, setQueryValue] = useState('')
  const [filters, setFiltersValue] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const activeQuery = useDebouncedValue(query)

  const setQuery = useCallback((value) => {
    setQueryValue(value)
    setPage(1)
  }, [])

  const setFilters = useCallback((patch) => {
    setFiltersValue((current) => ({ ...current, ...patch }))
    setPage(1)
  }, [])

  // tree is a dependency so results refresh after every file change
  const result = useMemo(() => {
    if (!activeQuery.trim()) return null
    const options = { query: activeQuery, ...filters, page }
    try {
      let data = explorer.searchItems(options)
      if (data.items.length === 0 && data.total > 0) {
        data = explorer.searchItems({ ...options, page: data.totalPages })
      }
      return { data }
    } catch (error) {
      return { error: error.message }
    }
  }, [explorer, tree, activeQuery, filters, page])

  return {
    query,
    setQuery,
    activeQuery,
    filters,
    setFilters,
    setPage,
    result,
    isSearching: activeQuery.trim() !== '',
  }
}