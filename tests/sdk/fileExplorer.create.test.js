import { FileExplorer } from '../../src/sdk/FileExplorer.js';
import {
  ERROR_CODES,
  ItemNotFoundError,
  ParentNotAFolderError,
  InvalidNameError,
  DuplicateNameError,
} from '../../src/sdk/errors.js';

describe('FileExplorer - Create operations', () => {
  it('createFile adds a file inside the given folder and returns an item with id, name, type "file" and the correct parentId', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const file = explorer.createFile(root.id, 'test.txt');

    expect(file).toEqual({
      id: expect.any(String),
      name: 'test.txt',
      type: 'file',
      parentId: root.id,
    });
    expect(explorer.getItem(file.id)).toEqual(file);
  });

  it('createFolder adds a folder inside the given parent, and the new folder starts empty', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const folder = explorer.createFolder(root.id, 'Projects');

    expect(folder).toEqual({
      id: expect.any(String),
      name: 'Projects',
      type: 'folder',
      parentId: root.id,
    });

    const tree = explorer.getTree();
    const createdInTree = tree.children.find((c) => c.id === folder.id);
    expect(createdInTree.children).toEqual([]);
  });

  it('a nested folder can be created inside a folder that was just created', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const parentFolder = explorer.createFolder(root.id, 'Parent');
    const nestedFolder = explorer.createFolder(parentFolder.id, 'Child');

    expect(nestedFolder.parentId).toBe(parentFolder.id);

    const tree = explorer.getTree();
    const parentInTree = tree.children.find((c) => c.id === parentFolder.id);
    expect(parentInTree.children).toHaveLength(1);
    expect(parentInTree.children[0].name).toBe('Child');
  });

  it('new items appear in getTree in the correct place', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const docs = root.children.find((c) => c.name === 'Documents');

    const newFile = explorer.createFile(docs.id, 'Budget.xlsx');
    const tree = explorer.getTree();
    const docsInTree = tree.children.find((c) => c.name === 'Documents');

    expect(docsInTree.children.map((c) => c.name)).toContain('Budget.xlsx');
    expect(docsInTree.children[docsInTree.children.length - 1].id).toBe(newFile.id);
  });

  it('every new item gets a unique id', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const ids = new Set();

    for (let i = 0; i < 20; i++) {
      const file = explorer.createFile(root.id, `file_${i}.txt`);
      expect(ids.has(file.id)).toBe(false);
      ids.add(file.id);
    }
  });

  it('surrounding whitespace in the name is trimmed', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const file = explorer.createFile(root.id, '   trimmed.txt   ');
    const folder = explorer.createFolder(root.id, '   trimmed-folder   ');

    expect(file.name).toBe('trimmed.txt');
    expect(folder.name).toBe('trimmed-folder');
    expect(explorer.getItem(file.id).name).toBe('trimmed.txt');
  });

  it('duplicate name in the same folder is rejected, including with different letter casing (for example "notes.txt" vs "Notes.txt"), and the error code is the duplicate-name code', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();

    expect(() => explorer.createFile(root.id, 'Notes.txt')).toThrow(DuplicateNameError);
    try {
      explorer.createFile(root.id, 'Notes.txt');
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.DUPLICATE_NAME);
    }

    expect(() => explorer.createFile(root.id, 'notes.txt')).toThrow(DuplicateNameError);
    expect(() => explorer.createFile(root.id, '  NOTES.TXT  ')).toThrow(DuplicateNameError);
  });

  it('the same name is allowed in a different folder', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const docs = root.children.find((c) => c.name === 'Documents');
    const images = root.children.find((c) => c.name === 'Images');

    const fileInDocs = explorer.createFile(docs.id, 'readme.md');
    const fileInImages = explorer.createFile(images.id, 'readme.md');

    expect(fileInDocs.name).toBe('readme.md');
    expect(fileInImages.name).toBe('readme.md');
    expect(fileInDocs.id).not.toBe(fileInImages.id);
  });

  it('a file and a folder with the same name in the same folder are rejected as duplicates', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();

    explorer.createFolder(root.id, 'Archive');

    expect(() => explorer.createFile(root.id, 'Archive')).toThrow(DuplicateNameError);
    expect(() => explorer.createFile(root.id, 'archive')).toThrow(DuplicateNameError);

    expect(() => explorer.createFolder(root.id, 'Notes.txt')).toThrow(DuplicateNameError);
  });

  it('empty name, whitespace-only name, non-string name, and names containing "/" or "\\" are rejected with the invalid-name code', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();

    const invalidNames = ['', '   ', null, undefined, 123, {}, 'sub/file.txt', 'sub\\file.txt'];
    for (const name of invalidNames) {
      expect(() => explorer.createFile(root.id, name)).toThrow(InvalidNameError);
      expect(() => explorer.createFolder(root.id, name)).toThrow(InvalidNameError);

      try {
        explorer.createFile(root.id, name);
      } catch (err) {
        expect(err.code).toBe(ERROR_CODES.INVALID_NAME);
      }
    }
  });

  it('creating inside a file is rejected with the parent-not-a-folder code', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const noteFile = root.children.find((c) => c.name === 'Notes.txt');

    expect(() => explorer.createFile(noteFile.id, 'child.txt')).toThrow(ParentNotAFolderError);
    expect(() => explorer.createFolder(noteFile.id, 'child-folder')).toThrow(ParentNotAFolderError);

    try {
      explorer.createFile(noteFile.id, 'child.txt');
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.PARENT_NOT_A_FOLDER);
    }
  });

  it('creating inside an unknown parent id is rejected with the item-not-found code', () => {
    const explorer = new FileExplorer();

    expect(() => explorer.createFile('non-existent-id', 'test.txt')).toThrow(ItemNotFoundError);
    expect(() => explorer.createFolder('non-existent-id', 'test-folder')).toThrow(ItemNotFoundError);

    try {
      explorer.createFile('non-existent-id', 'test.txt');
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.ITEM_NOT_FOUND);
    }
  });

  it('after any failed create, getTree is exactly the same as before and subscribers are not called', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const initialTree = JSON.stringify(explorer.getTree());

    let subscriberCalled = false;
    explorer.subscribe(() => {
      subscriberCalled = true;
    });

    expect(() => explorer.createFile(root.id, '')).toThrow();
    expect(() => explorer.createFile(root.id, 'Notes.txt')).toThrow();
    expect(() => explorer.createFile('missing-id', 'ok.txt')).toThrow();

    expect(JSON.stringify(explorer.getTree())).toBe(initialTree);
    expect(subscriberCalled).toBe(false);
  });

  it('after a successful create, subscribers are called exactly once', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();

    let subscriberCallCount = 0;
    explorer.subscribe(() => {
      subscriberCallCount++;
    });

    explorer.createFile(root.id, 'First.txt');
    expect(subscriberCallCount).toBe(1);

    explorer.createFolder(root.id, 'SecondFolder');
    expect(subscriberCallCount).toBe(2);
  });

  it('getSnapshot returns a new reference after a successful create and the same reference after a failed one', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const initialSnapshot = explorer.getSnapshot();

    expect(() => explorer.createFile(root.id, '')).toThrow();
    expect(explorer.getSnapshot()).toBe(initialSnapshot);

    explorer.createFile(root.id, 'valid.txt');
    const newSnapshot = explorer.getSnapshot();
    expect(newSnapshot).not.toBe(initialSnapshot);
    expect(explorer.getSnapshot()).toBe(newSnapshot);
  });

  it('the item returned from createFile or createFolder cannot be used to change internal data (mutating it does not affect getItem)', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();

    const file = explorer.createFile(root.id, 'Original.txt');
    file.name = 'Mutated.txt';
    file.type = 'folder';
    file.parentId = 'fake-parent';

    const freshItem = explorer.getItem(file.id);
    expect(freshItem.name).toBe('Original.txt');
    expect(freshItem.type).toBe('file');
    expect(freshItem.parentId).toBe(root.id);

    const folder = explorer.createFolder(root.id, 'OriginalFolder');
    folder.name = 'MutatedFolder';
    expect(explorer.getItem(folder.id).name).toBe('OriginalFolder');
  });
});
