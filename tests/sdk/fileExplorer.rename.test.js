import { FileExplorer } from '../../src/sdk/FileExplorer.js';
import {
  ERROR_CODES,
  ItemNotFoundError,
  InvalidNameError,
  DuplicateNameError,
  CannotModifyRootError,
} from '../../src/sdk/errors.js';

describe('FileExplorer - Rename operations', () => {
  it('renaming a file changes its name and returns the updated item', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const notes = root.children.find((c) => c.name === 'Notes.txt');

    const updated = explorer.renameItem(notes.id, 'Todos.txt');
    expect(updated).toEqual({
      id: notes.id,
      name: 'Todos.txt',
      type: 'file',
      parentId: root.id,
    });
  });

  it('renaming a folder changes its name and keeps all of its children in place', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const docs = root.children.find((c) => c.name === 'Documents');
    const childIdsBefore = docs.children.map((c) => c.id);

    const updated = explorer.renameItem(docs.id, 'Docs');
    expect(updated.name).toBe('Docs');

    const tree = explorer.getTree();
    const docsAfter = tree.children.find((c) => c.id === docs.id);
    expect(docsAfter.name).toBe('Docs');
    expect(docsAfter.children.map((c) => c.id)).toEqual(childIdsBefore);
  });

  it('the item keeps the same id after a rename, and its parentId and position in the tree do not change', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const childNamesBefore = root.children.map((c) => c.name);
    const notes = root.children[2];

    const updated = explorer.renameItem(notes.id, 'Memo.txt');
    expect(updated.id).toBe(notes.id);
    expect(updated.parentId).toBe(root.id);

    const tree = explorer.getTree();
    expect(tree.children[2].id).toBe(notes.id);
    expect(tree.children[2].name).toBe('Memo.txt');
    expect(tree.children[0].name).toBe(childNamesBefore[0]);
    expect(tree.children[1].name).toBe(childNamesBefore[1]);
  });

  it('surrounding whitespace in the new name is trimmed', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const notes = root.children.find((c) => c.name === 'Notes.txt');

    const updated = explorer.renameItem(notes.id, '   QuickNotes.txt   ');
    expect(updated.name).toBe('QuickNotes.txt');
    expect(explorer.getItem(notes.id).name).toBe('QuickNotes.txt');
  });

  it('changing only the letter casing of an item\'s own name is allowed (for example "Notes.txt" to "Notes.TXT")', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const notes = root.children.find((c) => c.name === 'Notes.txt');

    const updated = explorer.renameItem(notes.id, 'Notes.TXT');
    expect(updated.name).toBe('Notes.TXT');
    expect(explorer.getItem(notes.id).name).toBe('Notes.TXT');
  });

  it('renaming to a name that already exists in the same folder is rejected, including with different casing, with the duplicate-name code', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const notes = root.children.find((c) => c.name === 'Notes.txt');

    expect(() => explorer.renameItem(notes.id, 'Documents')).toThrow(DuplicateNameError);
    try {
      explorer.renameItem(notes.id, 'documents');
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.DUPLICATE_NAME);
    }
  });

  it('renaming to a name that exists in a different folder is allowed', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const notes = root.children.find((c) => c.name === 'Notes.txt');

    const updated = explorer.renameItem(notes.id, 'Resume.pdf');
    expect(updated.name).toBe('Resume.pdf');
  });

  it('empty name, whitespace-only name, non-string name, and names containing "/" or "\\" are rejected with the invalid-name code', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const notes = root.children.find((c) => c.name === 'Notes.txt');

    const invalidNames = ['', '   ', null, undefined, 123, {}, 'path/name.txt', 'path\\name.txt'];
    for (const name of invalidNames) {
      expect(() => explorer.renameItem(notes.id, name)).toThrow(InvalidNameError);
      try {
        explorer.renameItem(notes.id, name);
      } catch (err) {
        expect(err.code).toBe(ERROR_CODES.INVALID_NAME);
      }
    }
  });

  it('renaming an unknown id is rejected with the item-not-found code', () => {
    const explorer = new FileExplorer();

    expect(() => explorer.renameItem('non-existent-id', 'test.txt')).toThrow(ItemNotFoundError);
    try {
      explorer.renameItem('non-existent-id', 'test.txt');
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.ITEM_NOT_FOUND);
    }
  });

  it('renaming the root folder is rejected with the cannot-modify-root code', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();

    expect(() => explorer.renameItem(root.id, 'New Root Name')).toThrow(CannotModifyRootError);
    try {
      explorer.renameItem(root.id, 'New Root Name');
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.CANNOT_MODIFY_ROOT);
    }
  });

  it('renaming to the exact same name does nothing: no snapshot change and no subscriber call', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const notes = root.children.find((c) => c.name === 'Notes.txt');
    const snapshotBefore = explorer.getSnapshot();

    let subscriberCalled = false;
    explorer.subscribe(() => {
      subscriberCalled = true;
    });

    const result = explorer.renameItem(notes.id, 'Notes.txt');
    expect(result.name).toBe('Notes.txt');
    expect(subscriberCalled).toBe(false);
    expect(explorer.getSnapshot()).toBe(snapshotBefore);

    const resultTrimmed = explorer.renameItem(notes.id, '   Notes.txt   ');
    expect(resultTrimmed.name).toBe('Notes.txt');
    expect(subscriberCalled).toBe(false);
    expect(explorer.getSnapshot()).toBe(snapshotBefore);
  });

  it('after any failed rename, getTree is exactly the same as before and subscribers are not called', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const notes = root.children.find((c) => c.name === 'Notes.txt');
    const initialTree = JSON.stringify(explorer.getTree());

    let subscriberCalled = false;
    explorer.subscribe(() => {
      subscriberCalled = true;
    });

    expect(() => explorer.renameItem(root.id, 'New Root')).toThrow();
    expect(() => explorer.renameItem(notes.id, 'Documents')).toThrow();
    expect(() => explorer.renameItem(notes.id, '')).toThrow();
    expect(() => explorer.renameItem('unknown-id', 'Valid.txt')).toThrow();

    expect(JSON.stringify(explorer.getTree())).toBe(initialTree);
    expect(subscriberCalled).toBe(false);
  });

  it('after a successful rename, subscribers are called exactly once', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const notes = root.children.find((c) => c.name === 'Notes.txt');

    let callCount = 0;
    explorer.subscribe(() => {
      callCount++;
    });

    explorer.renameItem(notes.id, 'NewNotes.txt');
    expect(callCount).toBe(1);
  });

  it('getSnapshot returns a new reference after a successful rename and the same reference after a failed one', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const notes = root.children.find((c) => c.name === 'Notes.txt');
    const initialSnapshot = explorer.getSnapshot();

    expect(() => explorer.renameItem(notes.id, 'Documents')).toThrow();
    expect(explorer.getSnapshot()).toBe(initialSnapshot);

    explorer.renameItem(notes.id, 'Success.txt');
    const newSnapshot = explorer.getSnapshot();
    expect(newSnapshot).not.toBe(initialSnapshot);
    expect(explorer.getSnapshot()).toBe(newSnapshot);
  });

  it('searching is not needed here, but getItem must return the new name after a rename', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const notes = root.children.find((c) => c.name === 'Notes.txt');

    explorer.renameItem(notes.id, 'UpdatedName.txt');
    const item = explorer.getItem(notes.id);
    expect(item.name).toBe('UpdatedName.txt');
  });
});
