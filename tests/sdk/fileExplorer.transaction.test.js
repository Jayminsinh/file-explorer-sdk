import { FileExplorer } from '../../src/sdk/FileExplorer.js';
import { ERROR_CODES, TransactionFailedError } from '../../src/sdk/errors.js';

describe('FileExplorer - Transactions', () => {
  it('applies several operations in a single transaction', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const notes = root.children.find((c) => c.name === 'Notes.txt');

    explorer.transaction((tx) => {
      const folder = tx.createFolder(root.id, 'Projects');
      tx.createFile(folder.id, 'app.js');
      tx.renameItem(notes.id, 'Todos.txt');
      tx.moveItem(notes.id, folder.id);
    });

    const updatedRoot = explorer.getTree();
    const folder = updatedRoot.children.find((c) => c.name === 'Projects');
    expect(folder).toBeDefined();
    expect(folder.children.map((c) => c.name).sort()).toEqual(['Todos.txt', 'app.js']);
    expect(updatedRoot.children.some((c) => c.name === 'Notes.txt')).toBe(false);
  });

  it('allows operations in a transaction to use ids returned by earlier operations', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();

    let createdFile;
    explorer.transaction((tx) => {
      const folder = tx.createFolder(root.id, 'Alpha');
      const sub = tx.createFolder(folder.id, 'Beta');
      createdFile = tx.createFile(sub.id, 'gamma.txt');
      tx.renameItem(createdFile.id, 'omega.txt');
    });

    const item = explorer.getItem(createdFile.id);
    expect(item.name).toBe('omega.txt');
  });

  it('returns whatever the callback returns', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();

    const result = explorer.transaction((tx) => {
      const file = tx.createFile(root.id, 'Result.txt');
      return { success: true, fileId: file.id };
    });

    expect(result).toEqual({ success: true, fileId: expect.any(String) });
  });

  it('applies none of the operations if an operation fails in the middle', () => {
    const explorer = new FileExplorer();
    const before = explorer.getTree();
    const root = before;

    expect(() => {
      explorer.transaction((tx) => {
        tx.createFolder(root.id, 'TempFolder');
        tx.createFolder(root.id, 'Documents');
      });
    }).toThrow();

    expect(explorer.getTree()).toEqual(before);
  });

  it('throws transaction-failed code with the original error message and cause', () => {
    const explorer = new FileExplorer();

    let caughtError;
    try {
      explorer.transaction((tx) => {
        tx.deleteItem('non-existent-id');
      });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(TransactionFailedError);
    expect(caughtError.code).toBe(ERROR_CODES.TRANSACTION_FAILED);
    expect(caughtError.message).toContain('Item not found with id "non-existent-id"');
    expect(caughtError.cause).toBeDefined();
  });

  it('does not notify subscribers, change snapshot, or add undo entry on failure', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const prep = explorer.createFile(root.id, 'Prep.txt');

    const canUndoBefore = explorer.canUndo();
    const snapshotBefore = explorer.getSnapshot();
    const listener = vi.fn();
    explorer.subscribe(listener);

    expect(() => {
      explorer.transaction((tx) => {
        tx.createFolder(root.id, 'NeverCreated');
        tx.moveItem(prep.id, 'missing-folder-id');
      });
    }).toThrow();

    expect(listener).not.toHaveBeenCalled();
    expect(explorer.getSnapshot()).toBe(snapshotBefore);
    expect(explorer.canUndo()).toBe(canUndoBefore);

    explorer.undo();
    expect(explorer.getTree().children.some((c) => c.id === prep.id)).toBe(false);
  });

  it('notifies subscribers exactly once after data is committed', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();

    let treeDuringNotification;
    const listener = vi.fn(() => {
      treeDuringNotification = explorer.getTree();
    });
    explorer.subscribe(listener);

    explorer.transaction((tx) => {
      const f = tx.createFolder(root.id, 'Batch');
      tx.createFile(f.id, '1.txt');
      tx.createFile(f.id, '2.txt');
    });

    expect(listener).toHaveBeenCalledTimes(1);
    const batchFolder = treeDuringNotification.children.find((c) => c.name === 'Batch');
    expect(batchFolder).toBeDefined();
    expect(batchFolder.children).toHaveLength(2);
  });

  it('creates a single undo entry that reverses all operations and restores the exact tree', () => {
    const explorer = new FileExplorer();
    const treeBefore = explorer.getTree();
    const root = treeBefore;
    const docs = root.children.find((c) => c.name === 'Documents');
    const notes = root.children.find((c) => c.name === 'Notes.txt');

    explorer.transaction((tx) => {
      const f = tx.createFolder(root.id, 'Work');
      tx.moveItem(notes.id, f.id);
      tx.renameItem(docs.id, 'Docs');
      tx.createFile(f.id, 'Task.txt');
    });

    expect(explorer.getTree()).not.toEqual(treeBefore);
    expect(explorer.canUndo()).toBe(true);

    explorer.undo();
    expect(explorer.getTree()).toEqual(treeBefore);
  });

  it('redo reapplies the entire transaction in one step with the same ids', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const notes = root.children.find((c) => c.name === 'Notes.txt');

    let createdFolderId;
    let createdFileId;
    explorer.transaction((tx) => {
      const folder = tx.createFolder(root.id, 'Portfolio');
      createdFolderId = folder.id;
      const file = tx.createFile(folder.id, 'Bio.txt');
      createdFileId = file.id;
      tx.moveItem(notes.id, folder.id);
    });

    const treeCommitted = explorer.getTree();

    explorer.undo();
    expect(explorer.getTree().children.some((c) => c.name === 'Portfolio')).toBe(false);

    explorer.redo();
    expect(explorer.getTree()).toEqual(treeCommitted);
    expect(explorer.getItem(createdFolderId).name).toBe('Portfolio');
    expect(explorer.getItem(createdFileId).name).toBe('Bio.txt');
  });

  it('handles a transaction that deletes a folder with descendants and creates items through undo and redo', () => {
    const explorer = new FileExplorer();
    const initialTree = explorer.getTree();
    const root = initialTree;
    const docs = root.children.find((c) => c.name === 'Documents');

    explorer.transaction((tx) => {
      tx.deleteItem(docs.id);
      const archive = tx.createFolder(root.id, 'Archive');
      tx.createFile(archive.id, 'Old.txt');
    });

    const modifiedTree = explorer.getTree();
    expect(modifiedTree.children.some((c) => c.name === 'Documents')).toBe(false);
    expect(modifiedTree.children.some((c) => c.name === 'Archive')).toBe(true);

    explorer.undo();
    expect(explorer.getTree()).toEqual(initialTree);

    explorer.redo();
    expect(explorer.getTree()).toEqual(modifiedTree);
  });

  it('does not notify, change snapshot, or add undo entry when callback makes no changes', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const notes = root.children.find((c) => c.name === 'Notes.txt');

    const canUndoBefore = explorer.canUndo();
    const snapshotBefore = explorer.getSnapshot();
    const listener = vi.fn();
    explorer.subscribe(listener);

    const result = explorer.transaction((tx) => {
      tx.renameItem(notes.id, 'Notes.txt');
      tx.moveItem(notes.id, root.id);
      return 'noop';
    });

    expect(result).toBe('noop');
    expect(listener).not.toHaveBeenCalled();
    expect(explorer.getSnapshot()).toBe(snapshotBefore);
    expect(explorer.canUndo()).toBe(canUndoBefore);
  });

  it('does not change the real data while the callback is running', () => {
    const explorer = new FileExplorer();
    const initialTree = explorer.getTree();
    const root = initialTree;

    explorer.transaction((tx) => {
      tx.createFolder(root.id, 'UncommittedFolder');
      const treeInside = explorer.getTree();
      expect(treeInside).toEqual(initialTree);
      expect(treeInside.children.some((c) => c.name === 'UncommittedFolder')).toBe(false);
    });
  });

  it('rejects callbacks that are not functions with transaction-failed code', () => {
    const explorer = new FileExplorer();

    expect(() => explorer.transaction(null)).toThrow(TransactionFailedError);
    expect(() => explorer.transaction(undefined)).toThrow(TransactionFailedError);
    expect(() => explorer.transaction('string')).toThrow(TransactionFailedError);
    expect(() => explorer.transaction({})).toThrow(TransactionFailedError);

    try {
      explorer.transaction(42);
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.TRANSACTION_FAILED);
    }
  });

  it('rejects nested transactions with transaction-failed code', () => {
    const explorer = new FileExplorer();

    expect(() => {
      explorer.transaction(() => {
        explorer.transaction(() => {});
      });
    }).toThrow(TransactionFailedError);

    try {
      explorer.transaction(() => {
        explorer.transaction(() => {});
      });
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.TRANSACTION_FAILED);
      expect(err.message).toContain('nested');
    }
  });

  it('rejects callbacks that return a promise and applies nothing', () => {
    const explorer = new FileExplorer();
    const before = explorer.getTree();
    const root = before;

    expect(() => {
      explorer.transaction(async (tx) => {
        tx.createFolder(root.id, 'AsyncFolder');
      });
    }).toThrow(TransactionFailedError);

    try {
      explorer.transaction(() => Promise.resolve());
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.TRANSACTION_FAILED);
      expect(err.message).toContain('async');
    }

    expect(explorer.getTree()).toEqual(before);
  });

  it('ensures single operations still notify once and add one undo entry each', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();

    const listener = vi.fn();
    explorer.subscribe(listener);

    const f = explorer.createFolder(root.id, 'Folder1');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(explorer.canUndo()).toBe(true);

    const file = explorer.createFile(f.id, 'file.txt');
    expect(listener).toHaveBeenCalledTimes(2);

    explorer.renameItem(file.id, 'renamed.txt');
    expect(listener).toHaveBeenCalledTimes(3);

    explorer.moveItem(file.id, root.id);
    expect(listener).toHaveBeenCalledTimes(4);

    explorer.deleteItem(f.id);
    expect(listener).toHaveBeenCalledTimes(5);

    explorer.undo();
    expect(explorer.getTree().children.some((c) => c.id === f.id)).toBe(true);
    explorer.undo();
    expect(explorer.getItem(file.id).parentId).toBe(f.id);
    explorer.undo();
    expect(explorer.getItem(file.id).name).toBe('file.txt');
    explorer.undo();
    expect(() => explorer.getItem(file.id)).toThrow();
    explorer.undo();
    expect(() => explorer.getItem(f.id)).toThrow();
  });

  it('deletes several items in bulk with one commit, one notification, and one undo', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const docs = root.children.find((c) => c.name === 'Documents');
    const images = root.children.find((c) => c.name === 'Images');
    const notes = root.children.find((c) => c.name === 'Notes.txt');
    const treeBefore = explorer.getTree();

    const listener = vi.fn();
    explorer.subscribe(listener);

    const deleted = explorer.transaction((tx) => {
      const d1 = tx.deleteItem(docs.id);
      const d2 = tx.deleteItem(images.id);
      const d3 = tx.deleteItem(notes.id);
      return [d1, d2, d3];
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(deleted).toHaveLength(3);
    expect(explorer.getTree().children).toHaveLength(0);

    explorer.undo();
    expect(explorer.getTree()).toEqual(treeBefore);
  });

  it('aborts bulk delete if one item does not exist, leaving all items intact', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const docs = root.children.find((c) => c.name === 'Documents');
    const notes = root.children.find((c) => c.name === 'Notes.txt');
    const treeBefore = explorer.getTree();

    expect(() => {
      explorer.transaction((tx) => {
        tx.deleteItem(docs.id);
        tx.deleteItem(notes.id);
        tx.deleteItem('non-existent-id');
      });
    }).toThrow(TransactionFailedError);

    expect(explorer.getTree()).toEqual(treeBefore);
  });

  it('prevents mutating returned items from corrupting internal data', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();

    let returnedFile;
    explorer.transaction((tx) => {
      returnedFile = tx.createFile(root.id, 'Immutable.txt');
      returnedFile.name = 'Corrupted.txt';
      returnedFile.id = 'fake-id';
    });

    const fileInTree = explorer.getTree().children.find((c) => c.name === 'Immutable.txt');
    expect(fileInTree).toBeDefined();
    expect(fileInTree.id).not.toBe('fake-id');
    expect(explorer.getItem(fileInTree.id).name).toBe('Immutable.txt');
  });
});
