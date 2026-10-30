import { createContext, useContext, useRef, useSyncExternalStore, useCallback } from 'react';
import { useExplorer } from './ExplorerContext.jsx';
import { EventEmitter } from '../sdk/emitter.js';

class UiStateStore {
  constructor(initialExpandedIds = []) {
    this.selectedId = null;
    this.expandedIds = new Set(initialExpandedIds);
    this.emitter = new EventEmitter();

    this.actions = Object.freeze({
      toggleExpanded: (id) => this.toggleExpanded(id),
      setExpanded: (id, expanded) => this.setExpanded(id, expanded),
      select: (id) => this.select(id),
      clearSelection: () => this.clearSelection(),
    });
  }

  toggleExpanded(id) {
    const next = new Set(this.expandedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.expandedIds = next;
    this.emitter.emit();
  }

  setExpanded(id, expanded) {
    const has = this.expandedIds.has(id);
    if (has === expanded) return;

    const next = new Set(this.expandedIds);
    if (expanded) {
      next.add(id);
    } else {
      next.delete(id);
    }
    this.expandedIds = next;
    this.emitter.emit();
  }

  select(id) {
    if (this.selectedId === id) return;
    this.selectedId = id;
    this.emitter.emit();
  }

  clearSelection() {
    if (this.selectedId === null) return;
    this.selectedId = null;
    this.emitter.emit();
  }

  subscribe(listener) {
    return this.emitter.subscribe(listener);
  }

  isExpanded(id) {
    return this.expandedIds.has(id);
  }

  isSelected(id) {
    return this.selectedId === id;
  }

  getSelectedId() {
    return this.selectedId;
  }
}

const UiStateContext = createContext(null);

export function UiStateProvider({ children }) {
  const explorer = useExplorer();
  const storeRef = useRef(null);

  if (!storeRef.current) {
    const root = explorer.getSnapshot();
    storeRef.current = new UiStateStore(root ? [root.id] : []);
  }

  return (
    <UiStateContext.Provider value={storeRef.current}>
      {children}
    </UiStateContext.Provider>
  );
}

function useUiStore() {
  const store = useContext(UiStateContext);
  if (!store) {
    throw new Error('UI state hooks must be used within a UiStateProvider');
  }
  return store;
}

export function useIsExpanded(id) {
  const store = useUiStore();
  const subscribe = useCallback((notify) => store.subscribe(notify), [store]);
  const getSnapshot = useCallback(() => store.isExpanded(id), [store, id]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useIsSelected(id) {
  const store = useUiStore();
  const subscribe = useCallback((notify) => store.subscribe(notify), [store]);
  const getSnapshot = useCallback(() => store.isSelected(id), [store, id]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useSelectedId() {
  const store = useUiStore();
  const subscribe = useCallback((notify) => store.subscribe(notify), [store]);
  const getSnapshot = useCallback(() => store.getSelectedId(), [store]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useUiActions() {
  const store = useUiStore();
  return store.actions;
}
