import { FileExplorer } from '../../src/sdk/FileExplorer.js';
import {
  ERROR_CODES,
  ItemNotFoundError,
  CannotModifyRootError,
} from '../../src/sdk/errors.js';

describe('FileExplorer - Delete operations', () => {
  it('deleting a file removes it from getTree and getItem throws the item-not-found code for its id', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const notes = tree.children.find((c) => c.name === 'Notes.txt');

    explorer.deleteItem(notes.id);

    const updatedTree = explorer.getTree();
    expect(updatedTree.children.some((c) => c.id === notes.id)).toBe(false);

    expect(() => explorer.getItem(notes.id)).toThrow(ItemNotFoundError);
    try {
      explorer.getItem(notes.id);
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.ITEM_NOT_FOUND);
    }
  });

  it('deleting a file removes its id from the parent\'s children and leaves the siblings untouched', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const docs = tree.children.find((c) => c.name === 'Documents');
    const resume = docs.children.find((c) => c.name === 'Resume.pdf');
    const plan = docs.children.find((c) => c.name === 'Project Plan.docx');

    explorer.deleteItem(resume.id);

    const updatedTree = explorer.getTree();
    const docsAfter = updatedTree.children.find((c) => c.id === docs.id);
    expect(docsAfter.children).toHaveLength(1);
    expect(docsAfter.children[0].id).toBe(plan.id);
    expect(docsAfter.children[0].name).toBe('Project Plan.docx');
  });

  it('deleting an empty folder removes it', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const emptyFolder = explorer.createFolder(tree.id, 'EmptyFolder');

    explorer.deleteItem(emptyFolder.id);

    const updatedTree = explorer.getTree();
    expect(updatedTree.children.some((c) => c.id === emptyFolder.id)).toBe(false);
    expect(() => explorer.getItem(emptyFolder.id)).toThrow(ItemNotFoundError);
  });

  it('deleting a folder with nested folders and files removes every descendant, and getItem throws the item-not-found code for each of their ids', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const docs = tree.children.find((c) => c.name === 'Documents');
    const sub = explorer.createFolder(docs.id, 'Sub');
    const deepFile = explorer.createFile(sub.id, 'Deep.txt');

    const descendantIds = [
      docs.id,
      ...docs.children.map((c) => c.id),
      sub.id,
      deepFile.id,
    ];

    explorer.deleteItem(docs.id);

    for (const id of descendantIds) {
      expect(() => explorer.getItem(id)).toThrow(ItemNotFoundError);
      try {
        explorer.getItem(id);
      } catch (err) {
        expect(err.code).toBe(ERROR_CODES.ITEM_NOT_FOUND);
      }
    }
  });

  it('after deleting a folder, no orphaned items remain: every id in the tree can be found with getItem, and the deleted ids cannot', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const docs = tree.children.find((c) => c.name === 'Documents');
    const sub = explorer.createFolder(docs.id, 'Sub');
    const deepFile = explorer.createFile(sub.id, 'Deep.txt');

    const deletedIds = new Set([
      docs.id,
      ...docs.children.map((c) => c.id),
      sub.id,
      deepFile.id,
    ]);

    explorer.deleteItem(docs.id);

    const remainingIds = new Set();
    function collect(node) {
      remainingIds.add(node.id);
      if (node.children) {
        for (const child of node.children) collect(child);
      }
    }
    collect(explorer.getTree());

    for (const id of remainingIds) {
      expect(explorer.getItem(id).id).toBe(id);
      expect(deletedIds.has(id)).toBe(false);
    }

    for (const id of deletedIds) {
      expect(() => explorer.getItem(id)).toThrow(ItemNotFoundError);
    }
  });

  it('deleteItem returns a nested copy of what was removed (the item and all of its descendants, with their original ids)', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const docs = tree.children.find((c) => c.name === 'Documents');
    const sub = explorer.createFolder(docs.id, 'Archive');
    const archivedDoc = explorer.createFile(sub.id, 'Old.txt');

    const removed = explorer.deleteItem(docs.id);

    expect(removed.id).toBe(docs.id);
    expect(removed.name).toBe('Documents');
    expect(removed.type).toBe('folder');
    expect(removed.children).toHaveLength(3);

    const archiveNode = removed.children.find((c) => c.name === 'Archive');
    expect(archiveNode.id).toBe(sub.id);
    expect(archiveNode.children).toHaveLength(1);
    expect(archiveNode.children[0].id).toBe(archivedDoc.id);
    expect(archiveNode.children[0].name).toBe('Old.txt');
  });

  it('mutating the returned deleted tree does not change the SDK\'s data', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const docs = tree.children.find((c) => c.name === 'Documents');

    const removed = explorer.deleteItem(docs.id);
    removed.name = 'Hacked';
    removed.children.push({ id: 'bad', name: 'virus.exe', type: 'file' });

    const remainingTree = explorer.getTree();
    expect(remainingTree.name).toBe('My Files');
    expect(remainingTree.children.some((c) => c.name === 'Hacked')).toBe(false);
  });

  it('deleting an unknown id is rejected with the item-not-found code', () => {
    const explorer = new FileExplorer();

    expect(() => explorer.deleteItem('non-existent-id')).toThrow(ItemNotFoundError);
    try {
      explorer.deleteItem('non-existent-id');
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.ITEM_NOT_FOUND);
    }
  });

  it('deleting the root folder is rejected with the cannot-modify-root code', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();

    expect(() => explorer.deleteItem(tree.id)).toThrow(CannotModifyRootError);
    try {
      explorer.deleteItem(tree.id);
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.CANNOT_MODIFY_ROOT);
    }
  });

  it('deleting the same id twice: the second call is rejected with the item-not-found code', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const notes = tree.children.find((c) => c.name === 'Notes.txt');

    explorer.deleteItem(notes.id);

    expect(() => explorer.deleteItem(notes.id)).toThrow(ItemNotFoundError);
    try {
      explorer.deleteItem(notes.id);
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.ITEM_NOT_FOUND);
    }
  });

  it('after any failed delete, getTree is exactly the same as before and subscribers are not called', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const initialTree = JSON.stringify(explorer.getTree());

    let subscriberCalled = false;
    explorer.subscribe(() => {
      subscriberCalled = true;
    });

    expect(() => explorer.deleteItem(tree.id)).toThrow();
    expect(() => explorer.deleteItem('missing-id')).toThrow();

    expect(JSON.stringify(explorer.getTree())).toBe(initialTree);
    expect(subscriberCalled).toBe(false);
  });

  it('after a successful delete, subscribers are called exactly once, even when the folder had many descendants', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const docs = tree.children.find((c) => c.name === 'Documents');

    for (let i = 0; i < 5; i++) {
      const f = explorer.createFolder(docs.id, `Folder_${i}`);
      explorer.createFile(f.id, `File_${i}.txt`);
    }

    let callCount = 0;
    explorer.subscribe(() => {
      callCount++;
    });

    explorer.deleteItem(docs.id);
    expect(callCount).toBe(1);
  });

  it('getSnapshot returns a new reference after a successful delete and the same reference after a failed one', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const notes = tree.children.find((c) => c.name === 'Notes.txt');
    const initialSnapshot = explorer.getSnapshot();

    expect(() => explorer.deleteItem(tree.id)).toThrow();
    expect(explorer.getSnapshot()).toBe(initialSnapshot);

    explorer.deleteItem(notes.id);
    const newSnapshot = explorer.getSnapshot();
    expect(newSnapshot).not.toBe(initialSnapshot);
    expect(explorer.getSnapshot()).toBe(newSnapshot);
  });

  it('after deleting an item, a new item with the same name can be created in the same folder', () => {
    const explorer = new FileExplorer();
    const tree = explorer.getTree();
    const notes = tree.children.find((c) => c.name === 'Notes.txt');

    explorer.deleteItem(notes.id);

    const newNotes = explorer.createFile(tree.id, 'Notes.txt');
    expect(newNotes.name).toBe('Notes.txt');
    expect(newNotes.id).not.toBe(notes.id);
  });
});
