import { createContext, useContext, useRef, useSyncExternalStore, useCallback } from 'react';
import { EventEmitter } from '../sdk/emitter.js';

class FeedbackStore {
  constructor() {
    this.error = null;
    this.pendingCount = 0;
    this.emitter = new EventEmitter();

    this.actions = Object.freeze({
      reportError: (err) => this.reportError(err),
      clearError: () => this.clearError(),
      startPending: () => this.startPending(),
      endPending: () => this.endPending(),
    });
  }

  reportError(error) {
    if (!error) return;
    let message = '';
    let code = undefined;

    if (error instanceof Error) {
      message = error.message;
      code = error.code;
    } else if (typeof error === 'object') {
      message = error.message || String(error);
      code = error.code;
    } else {
      message = String(error);
    }

    if (this.error && this.error.message === message && this.error.code === code) {
      return;
    }

    this.error = Object.freeze({ message, code });
    this.emitter.emit();
  }

  clearError() {
    if (this.error === null) return;
    this.error = null;
    this.emitter.emit();
  }

  startPending() {
    this.pendingCount++;
    this.emitter.emit();
  }

  endPending() {
    if (this.pendingCount <= 0) return;
    this.pendingCount--;
    this.emitter.emit();
  }

  subscribe(listener) {
    return this.emitter.subscribe(listener);
  }

  getError() {
    return this.error;
  }

  isPending() {
    return this.pendingCount > 0;
  }
}

const FeedbackContext = createContext(null);

export function FeedbackProvider({ children }) {
  const storeRef = useRef(null);
  if (!storeRef.current) {
    storeRef.current = new FeedbackStore();
  }

  return (
    <FeedbackContext.Provider value={storeRef.current}>
      {children}
    </FeedbackContext.Provider>
  );
}

function useFeedbackStore() {
  const store = useContext(FeedbackContext);
  if (!store) {
    throw new Error('Feedback hooks must be used within a FeedbackProvider');
  }
  return store;
}

export function useFeedbackError() {
  const store = useFeedbackStore();
  const subscribe = useCallback((notify) => store.subscribe(notify), [store]);
  const getSnapshot = useCallback(() => store.getError(), [store]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useIsPending() {
  const store = useFeedbackStore();
  const subscribe = useCallback((notify) => store.subscribe(notify), [store]);
  const getSnapshot = useCallback(() => store.isPending(), [store]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useFeedbackActions() {
  const store = useFeedbackStore();
  return store.actions;
}
