import { NothingToUndoError, NothingToRedoError } from './errors.js';

export class History {
  #undoStack = [];
  #redoStack = [];
  #maxSize;

  constructor(maxSize = 100) {
    this.#maxSize = maxSize;
  }

  push(entry) {
    this.#undoStack.push(entry);
    this.#redoStack = [];

    // Drop oldest entry when capacity is exceeded
    if (this.#undoStack.length > this.#maxSize) {
      this.#undoStack.shift();
    }
  }

  undo() {
    if (this.#undoStack.length === 0) {
      throw new NothingToUndoError();
    }

    const entry = this.#undoStack.pop();
    this.#redoStack.push(entry);
    return entry;
  }

  redo() {
    if (this.#redoStack.length === 0) {
      throw new NothingToRedoError();
    }

    const entry = this.#redoStack.pop();
    this.#undoStack.push(entry);
    return entry;
  }

  canUndo() {
    return this.#undoStack.length > 0;
  }

  canRedo() {
    return this.#redoStack.length > 0;
  }

  clear() {
    this.#undoStack = [];
    this.#redoStack = [];
  }
}
