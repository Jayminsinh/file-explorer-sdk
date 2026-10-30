import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useExplorer } from './ExplorerContext'
import { indexTree } from '../utils/tree'

const MultiSelectContext = createContext(null)

function createSelectionStore() {
  let ids = new Set()
  const listeners = new Set()

  const update = (next) => {
    ids = next
    listeners.forEach((listener) => listener())
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getIds: () => ids,
    toggle(id) {
      const next = new Set(ids)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      update(next)
    },
    clear() {
      if (ids.size > 0) update(new Set())
    },
    prune(exists) {
      const next = new Set([...ids].filter(exists))
      if (next.size !== ids.size) update(next)
    },
  }
}

export function MultiSelectProvider({ children }) {
  const explorer = useExplorer()
  const storeRef = useRef(null)
  if (!storeRef.current) storeRef.current = createSelectionStore()
  const store = storeRef.current

  // drop ids that no longer exist after deletes or undo
  useEffect(
    () =>
      explorer.subscribe(() => {
        const index = indexTree(explorer.getSnapshot())
        store.prune((id) => index.has(id))
      }),
    [explorer, store]
  )

  return <MultiSelectContext.Provider value={store}>{children}</MultiSelectContext.Provider>
}

function useStore() {
  const store = useContext(MultiSelectContext)
  if (!store) throw new Error('Multi-select hooks must be used inside MultiSelectProvider')
  return store
}

export function useIsChecked(id) {
  const store = useStore()
  return useSyncExternalStore(store.subscribe, () => store.getIds().has(id))
}

export function useCheckedCount() {
  const store = useStore()
  return useSyncExternalStore(store.subscribe, () => store.getIds().size)
}

export function useMultiSelectActions() {
  const store = useStore()
  return useMemo(
    () => ({ toggle: store.toggle, clear: store.clear, getIds: store.getIds }),
    [store]
  )
}