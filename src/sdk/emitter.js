export class EventEmitter {
  constructor() {
    this.listeners = new Set();
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('Listener must be a function');
    }

    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(payload) {
    // Snapshot listeners so additions or removals during emit do not break iteration
    for (const listener of [...this.listeners]) {
      if (this.listeners.has(listener)) {
        try {
          listener(payload);
        } catch (err) {
          console.error(err);
        }
      }
    }
  }
}
