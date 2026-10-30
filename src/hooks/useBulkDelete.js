import { useCallback } from 'react'
import { useExplorer } from '../context/ExplorerContext'
import { useFeedbackActions } from '../context/FeedbackContext'
import { useMultiSelectActions } from '../context/MultiSelectContext'
import { useSelectedId, useUiActions } from '../context/UiStateContext'
import { getAncestors, indexTree } from '../utils/tree'

export function useBulkDelete() {
  const explorer = useExplorer()
  const { clearError, reportError, startPending, endPending } = useFeedbackActions()
  const { getIds, clear } = useMultiSelectActions()
  const { clearSelection } = useUiActions()
  const selectedId = useSelectedId()

  return useCallback(async () => {
    clearError()
    startPending()
    try {
      const index = indexTree(explorer.getSnapshot())
      const checked = getIds()
      // skip items whose parent folder is also checked, deleting the folder covers them
      const ids = [...checked].filter(
        (id) => !getAncestors(index, id).some((ancestor) => checked.has(ancestor.id))
      )

      explorer.transaction((tx) => {
        ids.forEach((id) => tx.deleteItem(id))
      })

      clear()
      try {
        explorer.getItem(selectedId)
      } catch {
        clearSelection()
      }
      return { ok: true }
    } catch (error) {
      reportError(error)
      return { ok: false, error }
    } finally {
      endPending()
    }
  }, [explorer, clearError, reportError, startPending, endPending, getIds, clear, clearSelection, selectedId])
}