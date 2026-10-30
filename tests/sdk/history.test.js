import { History } from '../../src/sdk/history.js';
import {
  ERROR_CODES,
  NothingToUndoError,
  NothingToRedoError,
} from '../../src/sdk/errors.js';

describe('History', () => {
  it('undo returns the latest pushed entry, and canUndo and canRedo reflect the stacks', () => {
    const history = new History();
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);

    history.push({ step: 1 });
    history.push({ step: 2 });

    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);

    const undone = history.undo();
    expect(undone).toEqual({ step: 2 });
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(true);
  });

  it('redo returns the entry that was undone', () => {
    const history = new History();
    history.push({ step: 1 });
    history.undo();

    const redone = history.redo();
    expect(redone).toEqual({ step: 1 });
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
  });

  it('push after an undo clears the redo stack', () => {
    const history = new History();
    history.push({ step: 1 });
    history.push({ step: 2 });
    history.undo();

    expect(history.canRedo()).toBe(true);

    history.push({ step: 3 });
    expect(history.canRedo()).toBe(false);
    expect(() => history.redo()).toThrow(NothingToRedoError);
  });

  it('undo on an empty history throws the nothing-to-undo code', () => {
    const history = new History();

    expect(() => history.undo()).toThrow(NothingToUndoError);
    try {
      history.undo();
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.NOTHING_TO_UNDO);
    }
  });

  it('redo on an empty redo stack throws the nothing-to-redo code', () => {
    const history = new History();
    history.push({ step: 1 });

    expect(() => history.redo()).toThrow(NothingToRedoError);
    try {
      history.redo();
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.NOTHING_TO_REDO);
    }
  });

  it('clear empties both stacks', () => {
    const history = new History();
    history.push({ step: 1 });
    history.push({ step: 2 });
    history.undo();

    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(true);

    history.clear();

    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
    expect(() => history.undo()).toThrow(NothingToUndoError);
    expect(() => history.redo()).toThrow(NothingToRedoError);
  });

  it('when the maximum size is exceeded, the oldest entry is dropped', () => {
    const history = new History(3);
    history.push({ step: 1 });
    history.push({ step: 2 });
    history.push({ step: 3 });
    history.push({ step: 4 });

    expect(history.undo()).toEqual({ step: 4 });
    expect(history.undo()).toEqual({ step: 3 });
    expect(history.undo()).toEqual({ step: 2 });
    expect(() => history.undo()).toThrow(NothingToUndoError);
  });
});
