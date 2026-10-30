import { useSyncExternalStore, useCallback } from 'react';
import { useExplorer } from '../context/ExplorerContext.jsx';

const UNDO_REDO_STATES = {
  'false,false': { canUndo: false, canRedo: false },
  'true,false': { canUndo: true, canRedo: false },
  'false,true': { canUndo: false, canRedo: true },
  'true,true': { canUndo: true, canRedo: true },
};

export function useFileExplorerTree() {
  const explorer = useExplorer();
  const subscribe = useCallback((notify) => explorer.subscribe(notify), [explorer]);
  const getSnapshot = useCallback(() => explorer.getSnapshot(), [explorer]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useUndoRedoState() {
  const explorer = useExplorer();
  const subscribe = useCallback((notify) => explorer.subscribe(notify), [explorer]);
  const getSnapshot = useCallback(() => {
    return UNDO_REDO_STATES[`${explorer.canUndo()},${explorer.canRedo()}`];
  }, [explorer]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
