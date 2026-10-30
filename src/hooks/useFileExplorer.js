import { useCallback, useSyncExternalStore } from 'react'
import { useExplorer } from '../context/ExplorerContext'
import { shareStructure } from '../utils/shareStructure'

const treeCache = new WeakMap()
const flagsCache = new WeakMap()

function readTree(explorer) {
  const source = explorer.getSnapshot()
  const cached = treeCache.get(explorer)
  if (cached && cached.source === source) return cached.tree
  const tree = shareStructure(cached?.tree, source)
  treeCache.set(explorer, { source, tree })
  return tree
}

function readFlags(explorer) {
  const canUndo = explorer.canUndo()
  const canRedo = explorer.canRedo()
  const cached = flagsCache.get(explorer)
  if (cached && cached.canUndo === canUndo && cached.canRedo === canRedo) return cached
  const flags = { canUndo, canRedo }
  flagsCache.set(explorer, flags)
  return flags
}

export function useFileExplorerTree() {
  const explorer = useExplorer()
  const subscribe = useCallback((listener) => explorer.subscribe(listener), [explorer])
  const getSnapshot = useCallback(() => readTree(explorer), [explorer])
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useUndoRedoState() {
  const explorer = useExplorer()
  const subscribe = useCallback((listener) => explorer.subscribe(listener), [explorer])
  const getSnapshot = useCallback(() => readFlags(explorer), [explorer])
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}